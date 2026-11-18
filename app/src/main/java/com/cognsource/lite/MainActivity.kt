package com.cognsource.lite

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.View
import android.view.WindowInsets
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.File

/**
 * 整个界面是一页本地网页（assets/www），装在 WebView 里；
 * 网页够不着的事（联网调模型、闹钟、录音、存文件、权限）通过 Native 桥交给这里。
 * 数据都存在手机里：网页的 IndexedDB + App 私有目录，不上传到任何服务器（只有发给模型的那一次请求）。
 */
class MainActivity : Activity() {
    lateinit var web: WebView
    lateinit var bridge: Bridge
    private var fileCb: ValueCallback<Array<Uri>>? = null
    private var pendingShare: JSONObject? = null

    companion object {
        const val ORIGIN = "https://appassets.androidplatform.net"
        const val REQ_FILE = 11
        const val REQ_PERM = 12
        var live: MainActivity? = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        live = this
        Notify.ensureChannels(this)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/files/", WebViewAssetLoader.InternalStoragePathHandler(this, Store.dataDir(this)))
            .build()

        web = WebView(this)
        web.setBackgroundColor(Color.TRANSPARENT)
        web.overScrollMode = View.OVER_SCROLL_NEVER
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_NO_CACHE
            textZoom = 100
        }
        bridge = Bridge(this)
        web.addJavascriptInterface(bridge, "Native")
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                if (u.host == "appassets.androidplatform.net") return false
                // 外部链接交给系统浏览器
                try { startActivity(Intent(Intent.ACTION_VIEW, u)) } catch (_: Exception) {}
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                pendingShare?.let { deliverShare(it) }
                pendingShare = null
                intent?.getStringExtra("open")?.let { js("window.App&&App.openFromNotice(${JSONObject.quote(it)})") }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(v: WebView, cb: ValueCallback<Array<Uri>>, params: WebChromeClient.FileChooserParams): Boolean {
                fileCb?.onReceiveValue(null)
                fileCb = cb
                val i = params.createIntent()
                if (params.isCaptureEnabled) {
                    // 「拍照」按钮：直接开相机
                    val cam = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
                    val out = File(cacheDir, "cam_${System.currentTimeMillis()}.jpg")
                    camFile = out
                    val uri = androidx.core.content.FileProvider.getUriForFile(this@MainActivity, "$packageName.files", out)
                    camUri = uri
                    cam.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri)
                    cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                    return try { startActivityForResult(cam, REQ_FILE); true } catch (e: Exception) { fileCb = null; false }
                }
                camFile = null
                return try { startActivityForResult(i, REQ_FILE); true } catch (e: Exception) { fileCb = null; false }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                request.deny()  // 录音走原生，不让网页直接拿麦克风
            }
        }

        setContentView(web)
        applyInsets()
        handleShare(intent)
        web.loadUrl("$ORIGIN/assets/www/index.html")
    }

    private var camFile: File? = null
    private var camUri: Uri? = null

    /** 把状态栏、导航栏和键盘的高度告诉网页，网页自己留边距（全面屏不被遮挡） */
    private fun applyInsets() {
        window.setDecorFitsSystemWindows(false)
        web.setOnApplyWindowInsetsListener { v, ins ->
            val d = resources.displayMetrics.density
            val bars = ins.getInsets(WindowInsets.Type.systemBars())
            val ime = ins.getInsets(WindowInsets.Type.ime())
            val top = (bars.top / d).toInt()
            val bottom = (maxOf(bars.bottom, ime.bottom) / d).toInt()
            val kb = ime.bottom > 0
            js("document.documentElement.style.setProperty('--sat','${top}px');document.documentElement.style.setProperty('--sab','${bottom}px');document.documentElement.classList.toggle('kb',$kb)")
            v.onApplyWindowInsets(ins)
        }
    }

    fun js(code: String) {
        runOnUiThread { try { web.evaluateJavascript(code, null) } catch (_: Exception) {} }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleShare(intent)
        intent.getStringExtra("open")?.let { js("window.App&&App.openFromNotice(${JSONObject.quote(it)})") }
    }

    private fun handleShare(i: Intent?) {
        if (i?.action != Intent.ACTION_SEND) return
        val o = JSONObject()
        i.getStringExtra(Intent.EXTRA_TEXT)?.let { o.put("text", it) }
        @Suppress("DEPRECATION")
        (i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let { uri ->
            try {
                contentResolver.openInputStream(uri)?.use { s ->
                    val b = s.readBytes()
                    val mime = contentResolver.getType(uri) ?: "image/jpeg"
                    o.put("image", "data:$mime;base64," + Base64.encodeToString(b, Base64.NO_WRAP))
                }
            } catch (_: Exception) {}
        }
        if (o.length() == 0) return
        i.action = null
        if (this::web.isInitialized && web.url != null) deliverShare(o) else pendingShare = o
    }

    private fun deliverShare(o: JSONObject) = js("window.App&&App.onShare($o)")

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_FILE) {
            val cb = fileCb ?: return
            fileCb = null
            if (resultCode != RESULT_OK) { cb.onReceiveValue(null); return }
            val cam = camFile
            if (cam != null && cam.exists() && cam.length() > 0 && camUri != null) { cb.onReceiveValue(arrayOf(camUri!!)); return }
            val uris = mutableListOf<Uri>()
            data?.clipData?.let { c -> for (k in 0 until c.itemCount) uris.add(c.getItemAt(k).uri) }
            data?.data?.let { if (uris.isEmpty()) uris.add(it) }
            cb.onReceiveValue(if (uris.isEmpty()) null else uris.toTypedArray())
        }
    }

    fun askPermission(name: String) {
        val p = when (name) {
            "mic" -> Manifest.permission.RECORD_AUDIO
            "notify" -> Manifest.permission.POST_NOTIFICATIONS
            else -> return
        }
        if (checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED) { js("window.App&&App.onPerm()"); return }
        requestPermissions(arrayOf(p), REQ_PERM)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        js("window.App&&App.onPerm()")
    }

    override fun onResume() {
        super.onResume()
        live = this
        js("window.App&&App.onResume()")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // 先问网页：有打开的面板就关面板；没有再退到后台（不结束，录音和提醒照常）
        web.evaluateJavascript("window.App?App.back():false") { r ->
            if (r != "true") moveTaskToBack(true)
        }
    }

    override fun onDestroy() {
        if (live === this) live = null
        super.onDestroy()
    }
}

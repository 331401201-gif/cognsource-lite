package com.cognsource.lite

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/** 网页可以调用的原生能力。方法名在网页里是 Native.xxx(...) */
class Bridge(private val a: MainActivity) {
    private val pool = Executors.newFixedThreadPool(4)
    private val ctx: Context get() = a.applicationContext

    private fun reply(id: String, o: JSONObject) = a.js("window.__nb&&__nb(${JSONObject.quote(id)},$o)")

    @JavascriptInterface fun version(): String = try {
        a.packageManager.getPackageInfo(a.packageName, 0).versionName ?: ""
    } catch (_: Exception) { "" }

    // ---------- 小设置（模型密钥等）----------
    @JavascriptInterface fun getPref(k: String): String = Store.prefs(ctx).getString(k, "") ?: ""
    @JavascriptInterface fun setPref(k: String, v: String) { Store.prefs(ctx).edit().putString(k, v).apply() }

    // ---------- 联网（调模型）----------
    /**
     * req = {url, method, headers:{}, body, timeout, audio:"/files/rec/x.m4a", audioMime}
     * body 里的 "__AUDIO__" 会被换成录音文件的 data URL（录音不经过网页，省内存）
     */
    @JavascriptInterface fun http(id: String, reqJson: String) {
        pool.execute {
            val out = JSONObject()
            try {
                val r = JSONObject(reqJson)
                var body = r.optString("body", "")
                val audio = r.optString("audio", "")
                if (audio.isNotEmpty() && body.contains("__AUDIO__")) {
                    val f = Store.resolve(ctx, audio) ?: throw Exception("找不到录音文件")
                    val mime = r.optString("audioMime", "audio/mp4")
                    body = body.replace("__AUDIO__", "data:$mime;base64," + Base64.encodeToString(f.readBytes(), Base64.NO_WRAP))
                }
                val c = URL(r.getString("url")).openConnection() as HttpURLConnection
                c.requestMethod = r.optString("method", "POST")
                c.connectTimeout = 15000
                c.readTimeout = r.optInt("timeout", 120000)
                r.optJSONObject("headers")?.let { h -> h.keys().forEach { k -> c.setRequestProperty(k, h.getString(k)) } }
                if (body.isNotEmpty() && c.requestMethod != "GET") {
                    c.doOutput = true
                    c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                }
                val code = c.responseCode
                val text = (if (code in 200..299) c.inputStream else c.errorStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                out.put("ok", code in 200..299).put("status", code).put("body", text)
            } catch (e: Exception) {
                out.put("ok", false).put("status", 0).put("error", e.message ?: e.toString())
            }
            reply(id, out)
        }
    }

    // ---------- 提醒 ----------
    /** 全量同步：网页每次改了待办/计划就把「所有未来的提醒」发过来，这里取消旧的、排上新的 */
    @JavascriptInterface fun setAlarms(json: String) { Alarms.replaceAll(ctx, JSONArray(json)) }

    /** 通知上点了「完成」「稍后」等，网页回到前台时取走处理 */
    @JavascriptInterface fun takeActions(): String = Alarms.takeActions(ctx).toString()

    @JavascriptInterface fun testNotice(title: String, body: String) { Notify.show(ctx, "test", title, body, false) }

    // ---------- 录音 ----------
    @JavascriptInterface fun recStart(mode: String): String {
        if (a.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return "need_mic"
        return try {
            Recorder.start(ctx, mode)
            val i = Intent(ctx, RecordService::class.java).putExtra("mode", mode)
            ctx.startForegroundService(i)
            "ok"
        } catch (e: Exception) { "error:" + (e.message ?: "") }
    }

    @JavascriptInterface fun recState(): String = Recorder.state(ctx).toString()

    @JavascriptInterface fun recStop(): String {
        val r = Recorder.stop(ctx)
        ctx.stopService(Intent(ctx, RecordService::class.java))
        return r.toString()
    }

    @JavascriptInterface fun recCancel() {
        Recorder.cancel(ctx)
        ctx.stopService(Intent(ctx, RecordService::class.java))
    }

    @JavascriptInterface fun deleteFile(webPath: String): Boolean = Store.resolve(ctx, webPath)?.delete() ?: false

    @JavascriptInterface fun storageInfo(): String {
        val bytes = Store.dataDir(ctx).walkTopDown().filter { it.isFile }.sumOf { it.length() }
        return JSONObject().put("files", bytes).put("free", ctx.filesDir.usableSpace).toString()
    }

    // ---------- 备份导出到「下载」文件夹 ----------
    @JavascriptInterface fun saveDownload(name: String, mime: String, text: String): String = try {
        val v = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, name)
            put(MediaStore.Downloads.MIME_TYPE, mime)
            put(MediaStore.Downloads.RELATIVE_PATH, "Download/思维源体")
        }
        val uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v) ?: throw Exception("没法写入")
        ctx.contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
        "ok"
    } catch (e: Exception) { "error:" + (e.message ?: "") }

    /** 录音文件一起备份：把录音打包进备份需要 base64，这里按需读 */
    @JavascriptInterface fun readFileB64(webPath: String): String =
        Store.resolve(ctx, webPath)?.takeIf { it.exists() }?.let { Base64.encodeToString(it.readBytes(), Base64.NO_WRAP) } ?: ""

    @JavascriptInterface fun writeFileB64(name: String, b64: String): String {
        val f = File(Store.recDir(ctx), name.replace("/", "_"))
        f.writeBytes(Base64.decode(b64, Base64.DEFAULT))
        return Store.webPath(ctx, f)
    }

    // ---------- 权限和系统设置 ----------
    @JavascriptInterface fun perms(): String {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        val am = ctx.getSystemService(AlarmManager::class.java)
        val pm = ctx.getSystemService(PowerManager::class.java)
        return JSONObject()
            .put("notify", nm.areNotificationsEnabled())
            .put("exact", Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms())
            .put("battery", pm.isIgnoringBatteryOptimizations(ctx.packageName))
            .put("mic", a.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
            .put("brand", Build.MANUFACTURER).put("model", Build.MODEL).put("sdk", Build.VERSION.SDK_INT)
            .toString()
    }

    @JavascriptInterface fun askPerm(name: String) { a.runOnUiThread { a.askPermission(name) } }

    @JavascriptInterface fun openSettings(kind: String) {
        a.runOnUiThread {
            val pkg = a.packageName
            val tries = when (kind) {
                "notify" -> listOf(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg))
                "battery" -> listOf(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$pkg")))
                "exact" -> listOf(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$pkg")))
                // vivo / iQOO：后台高耗电、自启动的设置页（不同系统版本位置不同，挨个试）
                "autostart" -> listOf(
                    Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")),
                    Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")),
                    Intent().setComponent(ComponentName("com.vivo.abe", "com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity")),
                )
                else -> emptyList()
            } + Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))
            for (i in tries) {
                try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); a.startActivity(i); return@runOnUiThread } catch (_: Exception) {}
            }
        }
    }

    @JavascriptInterface fun openUrl(url: String) {
        if (!url.startsWith("https://")) return
        a.runOnUiThread { try { a.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {} }
    }

    @JavascriptInterface fun shareText(text: String) {
        a.runOnUiThread {
            val i = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
            try { a.startActivity(Intent.createChooser(i, "分享到")) } catch (_: Exception) {}
        }
    }
}

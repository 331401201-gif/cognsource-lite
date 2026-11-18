package com.cognsource.lite

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * 录音：口述（一段，最长 4 分钟）和开会（不限时，每 4 分钟自动切一段）。
 * 切段是因为在线转写一次最多 5 分钟；切段在后台无缝进行，你感觉不到。
 * 录音期间有常驻通知（前台服务），锁屏、切到别的 App 都不会断。
 */
object Recorder {
    private const val SEG_MS = 4 * 60_000L
    private var mr: MediaRecorder? = null
    private var cur: File? = null
    private val segs = mutableListOf<String>()
    private var mode = "dict"
    private var t0 = 0L
    private var segT0 = 0L
    private val h = Handler(Looper.getMainLooper())
    private var appCtx: Context? = null

    private val roll = object : Runnable {
        override fun run() {
            val c = appCtx ?: return
            if (mr == null) return
            if (mode == "dict") { autoStop(c); return }
            try { finishSeg(c); beginSeg(c) } catch (_: Exception) {}
            h.postDelayed(this, SEG_MS)
        }
    }

    @Synchronized fun start(c: Context, m: String) {
        if (mr != null) cancel(c)
        appCtx = c.applicationContext
        mode = m
        segs.clear()
        t0 = SystemClock.elapsedRealtime()
        beginSeg(c)
        h.postDelayed(roll, SEG_MS)
    }

    private fun newRecorder(c: Context): MediaRecorder =
        if (Build.VERSION.SDK_INT >= 31) MediaRecorder(c) else @Suppress("DEPRECATION") MediaRecorder()

    private fun beginSeg(c: Context) {
        val f = File(Store.recDir(c), "r_${System.currentTimeMillis()}.m4a")
        val r = newRecorder(c)
        r.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
        r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        r.setAudioChannels(1)
        r.setAudioSamplingRate(16000)
        r.setAudioEncodingBitRate(48000)
        r.setOutputFile(f.path)
        r.prepare()
        r.start()
        mr = r; cur = f
        segT0 = SystemClock.elapsedRealtime()
    }

    private fun finishSeg(c: Context) {
        val r = mr ?: return
        try { r.stop() } catch (_: Exception) { cur?.delete(); cur = null }
        r.release()
        mr = null
        cur?.let { if (it.exists() && it.length() > 1000) segs.add(Store.webPath(c, it)) else it.delete() }
        cur = null
    }

    private fun autoStop(c: Context) {
        stop(c)
        c.stopService(Intent(c, RecordService::class.java))
        Alarms.addAction(c, "rec", "autostop")
    }

    @Synchronized fun stop(c: Context): JSONObject {
        h.removeCallbacks(roll)
        val ms = if (t0 > 0) SystemClock.elapsedRealtime() - t0 else 0
        finishSeg(c)
        val o = JSONObject().put("segs", JSONArray(segs)).put("ms", ms).put("mode", mode)
        Store.prefs(c).edit().putString("last_rec", o.toString()).apply()
        t0 = 0
        return o
    }

    @Synchronized fun cancel(c: Context) {
        h.removeCallbacks(roll)
        finishSeg(c)
        segs.forEach { Store.resolve(c, it)?.delete() }
        segs.clear(); t0 = 0
    }

    @Synchronized fun state(c: Context): JSONObject {
        val on = mr != null
        val lvl = try { (mr?.maxAmplitude ?: 0) / 32767.0 } catch (_: Exception) { 0.0 }
        return JSONObject().put("on", on).put("mode", mode)
            .put("ms", if (on) SystemClock.elapsedRealtime() - t0 else 0)
            .put("level", lvl).put("segs", segs.size)
            .put("last", Store.prefs(c).getString("last_rec", ""))
    }

    fun elapsed(): Long = if (t0 > 0) SystemClock.elapsedRealtime() - t0 else 0
}

class RecordService : Service() {
    private val h = Handler(Looper.getMainLooper())
    private var mode = "dict"

    private val tick = object : Runnable {
        override fun run() {
            if (Recorder.elapsed() == 0L) return
            post()
            h.postDelayed(this, 1000)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        mode = intent?.getStringExtra("mode") ?: "dict"
        Notify.ensureChannels(this)
        val n = build()
        if (Build.VERSION.SDK_INT >= 30) startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        else startForeground(7, n)
        h.removeCallbacks(tick); h.post(tick)
        return START_NOT_STICKY
    }

    private fun build(): Notification {
        val s = Recorder.elapsed() / 1000
        val t = String.format("%02d:%02d", s / 60, s % 60)
        return Notification.Builder(this, Notify.CH_REC)
            .setSmallIcon(R.drawable.ic_notify)
            .setContentTitle(if (mode == "meet") "正在录会议 $t" else "正在听你说 $t")
            .setContentText("点开回到思维源体，结束后自动转成文字")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(Notify.openApp(this, "rec"))
            .build()
    }

    private fun post() {
        getSystemService(android.app.NotificationManager::class.java).notify(7, build())
    }

    override fun onDestroy() {
        h.removeCallbacks(tick)
        super.onDestroy()
    }
}

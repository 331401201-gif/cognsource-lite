package com.cognsource.lite

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * 提醒：由网页算好「什么时候、提醒什么」，这里用系统闹钟排上。
 * 列表存一份在本地，开机、换时区、App 升级后重新排一遍，所以关掉 App 也会响。
 */
object Alarms {
    private const val KEY = "alarms"
    private const val ACTS = "acts"
    const val SNOOZE_MIN = 10

    private fun pi(c: Context, a: JSONObject): PendingIntent {
        val i = Intent(c, AlarmReceiver::class.java).setAction("lite.alarm")
            .putExtra("id", a.getString("id")).putExtra("title", a.optString("title"))
            .putExtra("body", a.optString("body")).putExtra("kind", a.optString("kind"))
        return PendingIntent.getBroadcast(c, a.getString("id").hashCode(), i,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun schedule(c: Context, a: JSONObject) {
        val at = a.getLong("at")
        if (at < System.currentTimeMillis() - 60_000) return
        val am = c.getSystemService(AlarmManager::class.java)
        val p = pi(c, a)
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        }
    }

    private fun cancel(c: Context, a: JSONObject) {
        c.getSystemService(AlarmManager::class.java).cancel(pi(c, a))
    }

    @Synchronized fun replaceAll(c: Context, list: JSONArray) {
        val old = load(c)
        for (k in 0 until old.length()) cancel(c, old.getJSONObject(k))
        val keep = JSONArray()
        val now = System.currentTimeMillis()
        for (k in 0 until list.length()) {
            val a = list.getJSONObject(k)
            if (a.optLong("at") > now - 60_000) { keep.put(a); schedule(c, a) }
        }
        Store.prefs(c).edit().putString(KEY, keep.toString()).apply()
    }

    fun rescheduleAll(c: Context) {
        val l = load(c)
        for (k in 0 until l.length()) schedule(c, l.getJSONObject(k))
    }

    private fun load(c: Context): JSONArray = try { JSONArray(Store.prefs(c).getString(KEY, "[]")) } catch (_: Exception) { JSONArray() }

    /** 「稍后提醒」：原生直接改期，同时记一笔让网页知道 */
    @Synchronized fun snooze(c: Context, id: String, title: String, body: String, kind: String) {
        val at = System.currentTimeMillis() + SNOOZE_MIN * 60_000L
        val a = JSONObject().put("id", id).put("at", at).put("title", title).put("body", body).put("kind", kind)
        val l = load(c); val n = JSONArray()
        for (k in 0 until l.length()) l.getJSONObject(k).let { if (it.getString("id") != id) n.put(it) }
        n.put(a)
        Store.prefs(c).edit().putString(KEY, n.toString()).apply()
        schedule(c, a)
        addAction(c, id, "snooze", at)
    }

    @Synchronized fun addAction(c: Context, id: String, act: String, at: Long = System.currentTimeMillis()) {
        val l = try { JSONArray(Store.prefs(c).getString(ACTS, "[]")) } catch (_: Exception) { JSONArray() }
        l.put(JSONObject().put("id", id).put("act", act).put("at", at))
        Store.prefs(c).edit().putString(ACTS, l.toString()).apply()
        MainActivity.live?.js("window.App&&App.onResume()")
    }

    @Synchronized fun takeActions(c: Context): JSONArray {
        val l = try { JSONArray(Store.prefs(c).getString(ACTS, "[]")) } catch (_: Exception) { JSONArray() }
        Store.prefs(c).edit().putString(ACTS, "[]").apply()
        return l
    }
}

object Notify {
    const val CH_REMIND = "remind"
    const val CH_BRIEF = "brief"
    const val CH_REC = "rec"

    fun ensureChannels(c: Context) {
        val nm = c.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH_REMIND, "待办提醒", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "到点的待办和日程"; enableVibration(true)
        })
        nm.createNotificationChannel(NotificationChannel(CH_BRIEF, "每日简报", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "早上的今日安排、晚上的回顾"
        })
        nm.createNotificationChannel(NotificationChannel(CH_REC, "录音中", NotificationManager.IMPORTANCE_LOW).apply {
            description = "开会录音时常驻，防止被系统停掉"; setSound(null, null)
        })
    }

    fun openApp(c: Context, open: String): PendingIntent {
        val i = Intent(c, MainActivity::class.java).putExtra("open", open)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(c, open.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun show(c: Context, id: String, title: String, body: String, withActions: Boolean, kind: String = "todo") {
        ensureChannels(c)
        val ch = if (kind == "brief") CH_BRIEF else CH_REMIND
        val b = Notification.Builder(c, ch)
            .setSmallIcon(R.drawable.ic_notify)
            .setColor(0xFFC9973F.toInt())
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setCategory(if (kind == "brief") Notification.CATEGORY_RECOMMENDATION else Notification.CATEGORY_REMINDER)
            .setContentIntent(openApp(c, id))
        if (withActions) {
            fun act(name: String, label: String): Notification.Action {
                val i = Intent(c, AlarmReceiver::class.java).setAction("lite.$name")
                    .putExtra("id", id).putExtra("title", title).putExtra("body", body).putExtra("kind", kind)
                val p = PendingIntent.getBroadcast(c, (id + name).hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                return Notification.Action.Builder(null, label, p).build()
            }
            b.addAction(act("done", "完成"))
            b.addAction(act("snooze", "${Alarms.SNOOZE_MIN} 分钟后"))
        }
        c.getSystemService(NotificationManager::class.java).notify(id.hashCode(), b.build())
    }
}

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val id = i.getStringExtra("id") ?: return
        val title = i.getStringExtra("title") ?: "提醒"
        val body = i.getStringExtra("body") ?: ""
        val kind = i.getStringExtra("kind") ?: "todo"
        val nm = c.getSystemService(NotificationManager::class.java)
        when (i.action) {
            "lite.alarm" -> Notify.show(c, id, title, body, kind != "brief", kind)
            "lite.done" -> { nm.cancel(id.hashCode()); Alarms.addAction(c, id, "done") }
            "lite.snooze" -> { nm.cancel(id.hashCode()); Alarms.snooze(c, id, title, body, kind) }
        }
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) { Alarms.rescheduleAll(c) }
}

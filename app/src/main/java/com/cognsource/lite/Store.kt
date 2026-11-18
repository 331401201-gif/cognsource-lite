package com.cognsource.lite

import android.content.Context
import android.content.SharedPreferences
import java.io.File

/** App 私有存储：小设置放 SharedPreferences，录音文件放 files/data/rec（卸载 App 才会清掉） */
object Store {
    fun prefs(c: Context): SharedPreferences = c.getSharedPreferences("lite", Context.MODE_PRIVATE)

    fun dataDir(c: Context): File = File(c.filesDir, "data").also { it.mkdirs() }

    fun recDir(c: Context): File = File(dataDir(c), "rec").also { it.mkdirs() }

    /** 网页里用的路径（/files/rec/x.m4a）→ 手机上的真实文件；只允许 data 目录里面 */
    fun resolve(c: Context, webPath: String): File? {
        val rel = webPath.removePrefix("/files/").removePrefix("files/")
        val f = File(dataDir(c), rel).canonicalFile
        return if (f.path.startsWith(dataDir(c).canonicalPath)) f else null
    }

    fun webPath(c: Context, f: File): String = "/files/" + f.canonicalPath.removePrefix(dataDir(c).canonicalPath + "/")
}

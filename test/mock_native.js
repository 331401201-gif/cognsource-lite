// 测试用：假的原生桥 + 假的通义千问
(() => {
  const prefs = {}, alarms = { list: [] }, acts = []
  let rec = null
  const D = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
  function fake(req) {
    const b = JSON.parse(req.body || '{}')
    const msgs = b.messages || []
    const sys = (msgs[0] && typeof msgs[0].content === 'string') ? msgs[0].content : ''
    const user = msgs[msgs.length - 1] && msgs[msgs.length - 1].content
    const u = typeof user === 'string' ? user : JSON.stringify(user)
    const say = (c) => ({ ok: true, status: 200, body: JSON.stringify({ choices: [{ message: { content: typeof c === 'string' ? c : JSON.stringify(c) } }] }) })
    if (!(req.headers.Authorization || '').includes('sk-good')) return { ok: false, status: 401, body: '{"error":{"message":"Invalid API-key"}}' }
    if (b.model === 'qwen3-asr-flash') return say(req.audio.includes('meet') ? '今天定了，外壳改成铝合金。张工下周三前出新的结构图。我明天上午把评审意见整理发给大家。' : '明天下午三点提醒我把结构评审的资料发给王工，电话13812345678')
    if (u.includes('image_url')) return say({ text: '会议室 A3\n11月20日 14:00 产品评审', desc: '一张会议室门口的预约单' })
    if (sys.includes('只回复两个字')) return say('好的')
    if (sys.includes('计划助手')) return say({ goal: '两周内准备好结构评审', steps: [{ title: '整理现有结构问题清单', date: D(1) }, { title: '和张工对齐外壳方案', date: D(3) }, { title: '出评审用的 PPT', date: D(8) }], advice: '外壳方案最容易拖，先定' })
    if (sys.includes('会议纪要')) return say({ title: '外壳材料评审', summary: '确定外壳改为铝合金，张工出新图。', decisions: ['外壳改成铝合金'], points: ['重量会增加约 8g'], todos: [{ title: '出新的结构图', owner: '张工', date: D(6), explicit: false }, { title: '整理评审意见发给大家', owner: '我', date: D(1), time: '10:00', explicit: false }], tags: ['评审'] })
    if (sys.includes('根据用户自己记下的内容回答')) return say('今天要做：把结构评审的资料发给王工 [1]。')
    // 整理
    if (u.includes('13812345678')) throw new Error('没有打码！')
    const todos = []
    if (u.includes('提醒我')) todos.push({ title: '把结构评审的资料发给王工', date: D(1), time: '15:00', remind: '', explicit: true, why: '原文：明天下午三点提醒我' })
    if (u.includes('想法')) todos.push({ title: '研究一下磁吸方案', date: '', time: '', explicit: false, why: '随口一提的想法' })
    if (u.includes('预约单')) todos.push({ title: '参加产品评审', date: D(2), time: '14:00', explicit: false, why: '照片里的预约' })
    return say({ title: u.includes('提醒我') ? '给王工发评审资料' : '一条随手记', summary: '', type: todos.length ? '待办' : '记录', todos, tags: ['结构'], people: [] })
  }
  window.__alarms = alarms
  window.Native = {
    version: () => '1.0.test',
    getPref: (k) => prefs[k] || '', setPref: (k, v) => { prefs[k] = v },
    http: (id, s) => { const req = JSON.parse(s); setTimeout(() => { let r; try { r = fake(req) } catch (e) { r = { ok: false, status: 500, body: e.message } } window.__nb(id, r) }, 120) },
    setAlarms: (j) => { alarms.list = JSON.parse(j) }, takeActions: () => { const a = JSON.stringify(acts); acts.length = 0; return a },
    testNotice: () => {},
    recStart: (m) => { rec = { mode: m, t0: Date.now() }; return 'ok' },
    recState: () => JSON.stringify(rec ? { on: true, mode: rec.mode, ms: Date.now() - rec.t0, level: Math.random() * .3 } : { on: false }),
    recStop: () => { const r = { segs: [rec.mode === 'meet' ? '/files/rec/meet1.m4a' : '/files/rec/d1.m4a'], ms: Date.now() - rec.t0, mode: rec.mode }; rec = null; return JSON.stringify(r) },
    recCancel: () => { rec = null },
    deleteFile: () => true, storageInfo: () => '{"files":1048576,"free":100000000000}',
    saveDownload: (n, m, t) => { window.__export = t; return 'ok' }, readFileB64: () => 'AAAA', writeFileB64: (n) => '/files/rec/' + n,
    perms: () => JSON.stringify({ notify: true, exact: true, battery: false, mic: true }), askPerm: () => {}, openSettings: () => {}, openUrl: () => {}, shareText: () => {},
  }
  window.__act = (a) => acts.push(a)
})()

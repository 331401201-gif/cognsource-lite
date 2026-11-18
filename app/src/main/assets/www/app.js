/* 思维源体·随身版
 * 手机上的简化中台：记一下（文字、口述、拍照、开会录音）→ 在线模型整理 → 待办、计划、提醒 → 问问自己的记录。
 * 数据全部存在手机里（IndexedDB + App 私有目录）；只有整理、转写、问答那一刻，把需要的内容发给通义千问。
 */
'use strict'
;(function () {

// ---------------------------------------------------------------- 小工具
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const pad = (n) => String(n).padStart(2, '0')
const WEEK = '日一二三四五六'
const dstr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const tstr = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return dstr(d) }
const today = () => dstr()
function dayLabel(s) {
  if (!s) return ''
  const t = today()
  if (s === t) return '今天'
  if (s === addDays(t, 1)) return '明天'
  if (s === addDays(t, 2)) return '后天'
  if (s === addDays(t, -1)) return '昨天'
  const d = new Date(s + 'T00:00:00')
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return (sameYear ? '' : d.getFullYear() + '年') + `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`
}
function when(ms) {
  const d = new Date(ms); const s = dstr(d)
  return (s === today() ? '今天' : s === addDays(today(), -1) ? '昨天' : `${d.getMonth() + 1}月${d.getDate()}日`) + ' ' + tstr(d)
}
const dur = (ms) => { const s = Math.round(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }
let toastT
function toast(msg, ms = 2400) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('in')
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('in'), ms)
}

// ---------------------------------------------------------------- 图标
const P = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  meet: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.2c3 .2 5.5 2.4 5.5 5.8"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
}
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`
const KIND = { note: ['随手记', 'note'], voice: ['口述', 'mic'], photo: ['照片', 'img'], meeting: ['会议', 'meet'], share: ['分享', 'share'] }
const kico = (k) => `<span class="kico k-${k}">${ic((KIND[k] || KIND.note)[1])}</span>`

// ---------------------------------------------------------------- 原生桥（没有时是浏览器预览）
const HAS_NATIVE = typeof window.Native !== 'undefined'
const N = window.Native || {
  version: () => 'preview', getPref: (k) => localStorage.getItem('pref.' + k) || '', setPref: (k, v) => localStorage.setItem('pref.' + k, v),
  http: (id) => setTimeout(() => window.__nb(id, { ok: false, status: 0, error: '浏览器预览里不能联网调模型' })),
  setAlarms: () => {}, takeActions: () => '[]', testNotice: () => {}, recStart: () => 'error:预览里不能录音', recState: () => '{}', recStop: () => '{"segs":[]}', recCancel: () => {},
  deleteFile: () => true, storageInfo: () => '{"files":0,"free":0}', saveDownload: () => 'error:预览', readFileB64: () => '', writeFileB64: () => '',
  perms: () => '{"notify":true,"exact":true,"battery":false,"mic":true}', askPerm: () => {}, openSettings: () => {}, openUrl: (u) => window.open(u), shareText: () => {},
}
const waits = {}
window.__nb = (id, r) => { const w = waits[id]; if (w) { delete waits[id]; w(r) } }
function http(req) {
  return new Promise((ok) => { const id = uid(); waits[id] = ok; N.http(id, JSON.stringify(req)) })
}
const J = (s, d) => { try { return JSON.parse(s) } catch (e) { return d } }

// ---------------------------------------------------------------- 存储
const S = { items: [], todos: [], plans: [], chats: [] }
let idb
function openDB() {
  return new Promise((ok, bad) => {
    const r = indexedDB.open('lite', 1)
    r.onupgradeneeded = () => { for (const s of Object.keys(S)) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }) }
    r.onsuccess = () => { idb = r.result; ok() }
    r.onerror = () => bad(r.error)
  })
}
const tx = (store, mode = 'readonly') => idb.transaction(store, mode).objectStore(store)
function loadAll() {
  return Promise.all(Object.keys(S).map((s) => new Promise((ok) => { const r = tx(s).getAll(); r.onsuccess = () => { S[s] = r.result || []; ok() }; r.onerror = () => ok() })))
}
function save(store, o) {
  o.updated = Date.now()
  const i = S[store].findIndex((x) => x.id === o.id)
  if (i >= 0) S[store][i] = o; else S[store].push(o)
  return new Promise((ok) => { const r = tx(store, 'readwrite').put(o); r.onsuccess = ok; r.onerror = ok })
}
function remove(store, id) {
  S[store] = S[store].filter((x) => x.id !== id)
  return new Promise((ok) => { const r = tx(store, 'readwrite').delete(id); r.onsuccess = ok; r.onerror = ok })
}
const get = (store, id) => S[store].find((x) => x.id === id)

const DEF = { onboarded: false, tier: 'mid', brief: '08:30', briefOn: true, lead: 10, mask: true, dateRemind: '09:00' }
let SET = { ...DEF, ...J(localStorage.getItem('lite.set'), {}) }
const saveSet = () => localStorage.setItem('lite.set', JSON.stringify(SET))
// 防止系统清理网页存储（IndexedDB）：申请持久存储
try { navigator.storage && navigator.storage.persist && navigator.storage.persist() } catch (e) {}

// ---------------------------------------------------------------- 在线模型（阿里云百炼 · 通义千问）
const BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const TIERS = {
  low: { name: '省钱', chat: 'qwen-flash', vl: 'qwen-vl-plus', d: '日常记录足够用，最便宜' },
  mid: { name: '均衡', chat: 'qwen-plus', vl: 'qwen-vl-plus', d: '推荐：理解准、速度快、价格低' },
  high: { name: '最强', chat: 'qwen-max', vl: 'qwen-vl-max', d: '复杂的计划和会议更好，贵一些' },
}
const ASR_MODEL = 'qwen3-asr-flash'
const key = () => (N.getPref('dashscope_key') || '').trim()
const model = (k) => (N.getPref('model_' + k) || '').trim() || TIERS[SET.tier || 'mid'][k]

// 发给在线模型之前，把手机号、身份证号、银行卡号打码
function mask(t) {
  if (!SET.mask || !t) return t
  return String(t)
    .replace(/(?<!\d)([1-9]\d{5})(\d{8})(\d{3}[\dXx])(?!\d)/g, '$1********$3')
    .replace(/(?<!\d)(1[3-9]\d)\d{4}(\d{4})(?!\d)/g, '$1****$2')
    .replace(/(?<!\d)(\d{4})\d{8,11}(\d{4})(?!\d)/g, '$1 **** **** $2')
}

class AIError extends Error { constructor(m, offline) { super(m); this.offline = offline } }
async function callAPI(body, timeout = 120000) {
  const k = key()
  if (!k) throw new AIError('还没填模型密钥：设置 → 模型')
  const r = await http({ url: BASE + '/chat/completions', method: 'POST', timeout, audio: body.__audio || '', audioMime: 'audio/mp4',
    headers: { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, __audio: undefined }) })
  if (!r.ok) {
    if (r.status === 0) throw new AIError('网络不通，稍后会自动重试', true)
    const e = J(r.body, {})
    const m = (e.error && e.error.message) || e.message || r.body || ''
    if (r.status === 401) throw new AIError('模型密钥不对或已失效：设置 → 模型')
    if (r.status === 429) throw new AIError('请求太频繁或额度用完了，稍后再试', true)
    throw new AIError(`模型出错（${r.status}）：${String(m).slice(0, 80)}`)
  }
  const d = J(r.body, {})
  return ((d.choices || [])[0] || {}).message?.content || ''
}
function parseJSON(t) {
  t = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(t) } catch (e) {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) } catch (e) {} }
  return null
}
async function chatJSON(system, user, tries = 2) {
  for (let i = 0; i < tries; i++) {
    const c = await callAPI({ model: model('chat'), temperature: 0.2, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
    const j = parseJSON(c)
    if (j) return j
  }
  throw new AIError('模型返回的格式不对，点「重新整理」再试一次')
}
async function chatText(system, user) {
  return (await callAPI({ model: model('chat'), temperature: 0.3, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })).trim()
}
async function vision(dataUrl) {
  const c = await callAPI({ model: model('vl'), temperature: 0.1, messages: [{ role: 'user', content: [
    { type: 'image_url', image_url: { url: dataUrl } },
    { type: 'text', text: '先完整识别图片里的文字（保持原来的换行，没有文字就留空），再用一句话描述图片内容。只返回 JSON：{"text":"识别出的文字","desc":"一句话描述"}' }] }] })
  return parseJSON(c) || { text: c, desc: '' }
}
async function asr(path) {
  const c = await callAPI({ model: ASR_MODEL, stream: false, asr_options: { enable_itn: true }, __audio: path,
    messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: '__AUDIO__' } }] }] }, 180000)
  return String(c || '').trim()
}
const nowLine = () => { const d = new Date(); return `${dstr(d)} ${tstr(d)}（星期${WEEK[d.getDay()]}）` }

// ---------------------------------------------------------------- 整理：一条记录 → 标题、概括、待办
const ORG_SYS = () => `你是用户的随身助理「思维源体」，帮他把随手记下的内容整理好。现在是 ${nowLine()}。
只返回 JSON：
{"title":"不超过 16 个字的标题","summary":"一两句概括；原文很短就留空字符串","type":"待办|日程|想法|记录",
 "todos":[{"title":"要做的事，动词开头，简洁","date":"YYYY-MM-DD 或空","time":"HH:MM 或空","remind":"YYYY-MM-DD HH:MM 或空","explicit":true,"why":"原文依据，一句话"}],
 "tags":["最多 3 个关键词"],"people":["提到的人名"]}
规则：
1. explicit=true 只给用户自己明确要做、答应了别人、或让你帮他记着的事（「我要」「我得」「答应」「记得」「提醒我」「明天要去」）。随口的想法、愿望、别人要做的事 explicit=false；纯粹的感想不要放进 todos。
2. 日期按现在换算成具体日期：「明天」「周五」「下周三」「月底」。没提日期就留空，不要猜。
3. 时间：「下午三点」→15:00，「晚上八点半」→20:30；只说「晚上」「下午」不填具体时间。
4. 只有用户说了「提醒我」「叫我」「到时候提醒」才填 remind；说了「提前半小时提醒」就按日期时间往前推。
5. 不编造原文没有的内容；原文是什么语气就保留什么意思。`

const MEET_SYS = () => `你是会议纪要助手。现在是 ${nowLine()}。下面是一段会议录音转写（可能有错字，按上下文理解）。只返回 JSON：
{"title":"不超过 16 字的会议标题","summary":"三到五句话概括会议","decisions":["定下来的事"],"points":["重要信息，最多 8 条"],
 "todos":[{"title":"要做的事","owner":"负责人，听不出来就空","date":"YYYY-MM-DD 或空","time":"HH:MM 或空","explicit":false,"why":"依据"}],"tags":["最多 3 个"]}
规则：只写录音里真的说到的内容；日期按现在换算；负责人是「我」或者录音者自己时 owner 写「我」。`

async function organize(it) {
  const parts = []
  if (it.text) parts.push(it.text)
  if (it.kind === 'photo') {
    it.ocr = it.ocr || []
    for (let i = it.ocr.length; i < (it.images || []).length; i++) {
      const v = await vision(it.images[i]); it.ocr.push(v); await save('items', it)
    }
    it.ocr.forEach((v, i) => parts.push(`【图${i + 1}】${v.desc || ''}\n${v.text || ''}`))
  }
  if (it.kind === 'meeting') {
    it.trans = it.trans || []
    for (let i = it.trans.length; i < (it.audio || []).length; i++) {
      it.stage = `转写第 ${i + 1}/${it.audio.length} 段`; await save('items', it); paintSoon()
      it.trans.push(await asr(it.audio[i])); await save('items', it)
    }
    it.stage = '整理纪要'; await save('items', it); paintSoon()
    const all = it.trans.join('\n')
    if (!all.trim()) throw new AIError('没听到内容：录音太短或太安静')
    const j = await chatJSON(MEET_SYS(), mask(all).slice(0, 24000))
    return apply(it, j, true)
  }
  // 没网时录的口述：先补转写
  if (it.kind === 'voice' && !it.text && (it.audio || []).length) {
    it.stage = '转文字'; await save('items', it); paintSoon()
    it.text = await asr(it.audio[0]); parts.push(it.text); await save('items', it)
  }
  const txt = parts.join('\n\n').trim()
  if (!txt) throw new AIError('没有内容可以整理')
  const j = await chatJSON(ORG_SYS(), mask(txt).slice(0, 12000))
  return apply(it, j, false)
}

function toRemind(date, time, explicitRemind) {
  if (explicitRemind && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(explicitRemind)) return new Date(explicitRemind.replace(' ', 'T') + ':00').getTime()
  if (date && time) return new Date(`${date}T${time}:00`).getTime() - (SET.lead || 0) * 60000
  return null
}

async function apply(it, j, meeting) {
  it.title = String(j.title || '').slice(0, 40) || it.title
  it.summary = j.summary || ''
  it.type = j.type || (meeting ? '会议' : '')
  it.tags = (j.tags || []).slice(0, 3)
  it.people = j.people || []
  if (meeting) { it.decisions = j.decisions || []; it.points = j.points || [] }
  let added = 0, asked = 0
  for (const t of (j.todos || []).slice(0, 12)) {
    if (!t || !t.title) continue
    if (S.todos.some((x) => x.from === it.id && x.title === t.title)) continue
    const date = /^\d{4}-\d{2}-\d{2}$/.test(t.date || '') ? t.date : ''
    const time = /^\d{2}:\d{2}$/.test(t.time || '') ? t.time : ''
    const mine = !meeting || !t.owner || /^(我|自己)$/.test(t.owner)
    const explicit = !!t.explicit && !meeting
    const todo = { id: uid(), title: String(t.title).slice(0, 80), date, time, remind: toRemind(date, time, t.remind),
      done: false, from: it.id, why: t.why || '', owner: meeting && t.owner && !mine ? t.owner : '',
      status: explicit ? 'ok' : 'ask', created: Date.now() }
    await save('todos', todo)
    explicit ? added++ : asked++
  }
  it.status = 'done'; it.err = ''; it.stage = ''
  await save('items', it)
  syncAlarms()
  return { added, asked }
}

// 处理队列：一条一条来；没网的留着，回到前台或联网时再试
let working = false
async function pump() {
  if (working) return
  working = true
  try {
    for (;;) {
      const it = S.items.filter((x) => x.status === 'new' || x.status === 'busy').sort((a, b) => a.created - b.created)[0]
      if (!it || !key()) break
      it.status = 'busy'; await save('items', it); paintSoon()
      try {
        const r = await organize(it)
        if (r.added) toast(`已加入待办 ${r.added} 件` + (r.asked ? `，另有 ${r.asked} 件等你确认` : ''))
        else if (r.asked) toast(`整理好了，有 ${r.asked} 件等你确认`)
      } catch (e) {
        it.status = e.offline ? 'new' : 'error'; it.err = e.message; it.stage = ''
        await save('items', it)
        if (e.offline) { paintSoon(); break }
      }
      paintSoon()
    }
  } finally { working = false; paintSoon() }
}
addEventListener('online', () => pump())

// ---------------------------------------------------------------- 提醒：所有未来的提醒交给手机闹钟
function syncAlarms() {
  const now = Date.now(), list = []
  for (const t of S.todos) {
    if (t.done || t.status !== 'ok' || !t.remind || t.remind < now - 60000) continue
    const p = t.plan && get('plans', t.plan)
    list.push({ id: 'todo:' + t.id, at: t.remind, kind: 'todo', title: t.title,
      body: [t.date ? dayLabel(t.date) + (t.time ? ' ' + t.time : '') : '', p ? '计划：' + p.goal : ''].filter(Boolean).join(' · ') || '到点了' })
  }
  if (SET.briefOn) {
    for (let d = 0; d < 7; d++) {
      const day = addDays(today(), d)
      const at = new Date(`${day}T${SET.brief || '08:30'}:00`).getTime()
      if (at < now) continue
      const due = S.todos.filter((t) => !t.done && t.status === 'ok' && t.date && t.date <= day)
      const ask = S.todos.filter((t) => t.status === 'ask').length
      const names = due.slice(0, 3).map((t) => t.title).join('、')
      list.push({ id: 'brief:' + day, at, kind: 'brief',
        title: due.length ? `早上好，今天有 ${due.length} 件事` : '早上好，今天还没有安排',
        body: (due.length ? names + (due.length > 3 ? ' 等' : '') : '想到什么，随手记一下') + (ask ? `；${ask} 件等你确认` : '') })
    }
    // 没定时间、只有日期的待办：当天早上简报里会提到；另外在「日期提醒」那个点再响一次
    for (const t of S.todos) {
      if (t.done || t.status !== 'ok' || !t.date || t.time || t.remind) continue
      const at = new Date(`${t.date}T${SET.dateRemind || '09:00'}:00`).getTime()
      if (at > now) list.push({ id: 'todo:' + t.id, at, kind: 'todo', title: t.title, body: '今天要做' })
    }
  }
  try { N.setAlarms(JSON.stringify(list)) } catch (e) {}
}

// ---------------------------------------------------------------- 页面框架
let view = 'today'
const views = {}
let paintT
function paintSoon() { clearTimeout(paintT); paintT = setTimeout(paint, 30) }
function paint() {
  const keep = $('#view').scrollTop
  $('#ttl').textContent = { today: '今天', records: '记录', plans: '计划', ask: '问问' }[view]
  $$('#tabs [data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === view))
  $('#view').innerHTML = views[view]()
  $('#view').scrollTop = keep
  if (view === 'ask') afterAsk()
  // 打开的详情面板跟着刷新
  $$('#layer .sheet[data-refresh]').forEach((sh) => { const f = SHEETS[sh.dataset.refresh]; if (f) { const b = $('.sb', sh); const top = b.scrollTop; b.innerHTML = f.body(sh.dataset.arg); b.scrollTop = top } })
}
function go(v) { view = v; selMode = false; sel.clear(); $('#view').scrollTop = 0; closeAll(); paint() }

// 通用：底部抽屉
const stack = []
function sheet({ title, body, foot = '', tall = false, refresh = '', arg = '', onClose }) {
  const mask = document.createElement('div'); mask.className = 'mask'
  const sh = document.createElement('div'); sh.className = 'sheet' + (tall ? ' tall' : '')
  if (refresh) { sh.dataset.refresh = refresh; sh.dataset.arg = arg }
  sh.innerHTML = `<div class="grab"></div><div class="sh"><h3>${title}</h3><button class="ib" data-act="close" aria-label="关闭">${ic('x')}</button></div>
    <div class="sb">${body}</div>${foot ? `<div class="sf">${foot}</div>` : ''}`
  $('#layer').append(mask, sh)
  requestAnimationFrame(() => { mask.classList.add('in'); sh.classList.add('in') })
  const o = { mask, sh, onClose }
  mask.onclick = () => close(o)
  stack.push(o)
  return sh
}
function close(o = stack[stack.length - 1]) {
  if (!o) return false
  stack.splice(stack.indexOf(o), 1)
  o.sh.classList.remove('in'); o.mask.classList.remove('in')
  setTimeout(() => { o.mask.remove(); o.sh.remove() }, 260)
  o.onClose && o.onClose()
  return true
}
function closeAll() { while (stack.length) close() }
// 整页（设置）
function page(title, body) {
  const pg = document.createElement('div'); pg.className = 'page'
  pg.innerHTML = `<header class="top"><button class="ib" data-act="close" aria-label="返回">${ic('back')}</button><h1>${title}</h1></header><div class="pb">${body}</div>`
  $('#layer').append(pg)
  requestAnimationFrame(() => pg.classList.add('in'))
  const o = { mask: document.createElement('div'), sh: pg }
  stack.push(o)
  return pg
}

// 动作分发：data-act="名字" data-id="..."
const ACT = {}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]')
  if (!el) return
  const f = ACT[el.dataset.act]
  if (f) { e.preventDefault(); f(el, e) }
})
ACT.close = () => close()
$$('#tabs [data-v]').forEach((b) => b.onclick = () => go(b.dataset.v))
$('#addBtn').onclick = () => capture()
$('#gear').innerHTML = ic('gear')
$('#gear').onclick = () => settings()
$$('[data-ic]').forEach((i) => { i.innerHTML = ic(i.dataset.ic) })

// ---------------------------------------------------------------- 今天
const pend = () => S.todos.filter((t) => t.status === 'ask' && !t.later).sort((a, b) => b.created - a.created)
const active = () => S.todos.filter((t) => t.status === 'ok')
function todoRow(t, opts = {}) {
  const late = t.date && t.date < today() && !t.done
  const p = t.plan && get('plans', t.plan)
  const meta = [
    t.date ? `<span class="tag ${late ? 'red' : t.date === today() ? 'gold' : ''}">${late ? '过期 · ' : ''}${dayLabel(t.date)}${t.time ? ' ' + t.time : ''}</span>` : '',
    t.remind && !t.done && t.remind > Date.now() ? `<span class="tag lav">${ic('bell')}${when(t.remind).replace('今天 ', '')}</span>` : '',
    p && !opts.noPlan ? `<span class="tag">${esc(p.goal.slice(0, 12))}</span>` : '',
    t.owner ? `<span class="tag">${esc(t.owner)}</span>` : '',
  ].join('')
  return `<div class="row${t.done ? ' done' : ''}" data-act="todo" data-id="${t.id}">
    <button class="chk${t.done ? ' on' : ''}" data-act="tick" data-id="${t.id}" aria-label="${t.done ? '标为没做完' : '完成'}">${t.done ? ic('check') : ''}</button>
    <div class="grow"><div class="t">${esc(t.title)}</div>${meta ? `<div class="m">${meta}</div>` : ''}</div></div>`
}
views.today = () => {
  const d = new Date(), h = d.getHours()
  const hi = h < 5 ? '夜深了' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  const t = today()
  const due = active().filter((x) => !x.done && x.date && x.date <= t).sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')))
  const nodate = active().filter((x) => !x.done && !x.date).sort((a, b) => b.created - a.created)
  const later = active().filter((x) => !x.done && x.date && x.date > t)
  const doneToday = active().filter((x) => x.done && x.doneAt && dstr(new Date(x.doneAt)) === t)
  const asks = pend()
  const recent = [...S.items].sort((a, b) => b.created - a.created).slice(0, 3)
  let html = `<div class="hello"><div class="d">${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]}</div>
    <div class="g">${hi}${due.length ? `，今天有 ${due.length} 件事` : '，今天还没有安排'}</div></div>`
  if (!key()) html += `<div class="card ask-card"><div class="q">还没接上在线模型</div><div class="w">填好百炼的密钥后，记下的内容会自动整理成待办和提醒。</div><button class="btn sm gold" data-act="setkey">去填密钥</button></div>`
  if (asks.length) {
    html += `<div class="sec"><h2>等你确认</h2><span class="m">AI 拿不准的，点一下就行</span></div>`
    html += asks.slice(0, 5).map((x) => `<div class="card ask-card"><div class="q">${esc(x.title)}${x.date ? ` <span class="tag">${dayLabel(x.date)}${x.time ? ' ' + x.time : ''}</span>` : ''}</div>
      <div class="w">${esc(x.why || '从你的记录里看到的')}${x.owner ? ' · 负责人：' + esc(x.owner) : ''}</div>
      <div class="btns"><button class="btn sm pri" data-act="yes" data-id="${x.id}">对，加入待办</button><button class="btn sm" data-act="edit" data-id="${x.id}">改一下</button><button class="btn sm ghost" data-act="no" data-id="${x.id}">不用</button></div></div>`).join('')
    if (asks.length > 5) html += `<div class="m" style="text-align:center;color:var(--faint);font-size:12px">还有 ${asks.length - 5} 件，处理完上面的再显示</div>`
  }
  html += `<div class="sec"><h2>今天要做</h2><span class="m">${doneToday.length ? `已完成 ${doneToday.length}` : ''}</span></div>`
  html += due.length ? `<div class="list">${due.map((x) => todoRow(x)).join('')}</div>` : `<div class="list"><div class="empty">今天没有到期的事${later.length ? `，之后还有 ${later.length} 件` : ''}</div></div>`
  if (nodate.length) html += `<div class="sec"><h2>没定日子的</h2><button class="lnk" data-act="alltodos">全部待办</button></div><div class="list">${nodate.slice(0, 5).map((x) => todoRow(x)).join('')}</div>`
  if (doneToday.length) html += `<details class="more"><summary>今天完成的 ${doneToday.length} 件</summary><div class="list">${doneToday.map((x) => todoRow(x)).join('')}</div></details>`
  html += `<div class="sec"><h2>最近记下</h2><button class="lnk" data-act="tab" data-v="records">全部</button></div>`
  html += recent.length ? `<div class="list">${recent.map(itemRow).join('')}</div>` : `<div class="list"><div class="empty">点下面的 ＋ 记下第一条：一句话、一段语音、一张照片都行</div></div>`
  return html
}
ACT.tab = (el) => go(el.dataset.v)
ACT.alltodos = () => { planSeg = 'todos'; go('plans') }
ACT.setkey = () => settings('model')
ACT.yes = async (el) => { const t = get('todos', el.dataset.id); t.status = 'ok'; await save('todos', t); syncAlarms(); paint(); toast('已加入待办') }
ACT.no = async (el) => { await remove('todos', el.dataset.id); paint() }
ACT.edit = (el) => todoSheet(el.dataset.id)
ACT.todo = (el, e) => { if (e.target.closest('.chk')) return; todoSheet(el.dataset.id) }
ACT.tick = async (el) => {
  const t = get('todos', el.dataset.id); t.done = !t.done; t.doneAt = t.done ? Date.now() : null
  await save('todos', t); syncAlarms(); paint()
  if (t.done) toast('完成一件 ✓')
}

// ---------------------------------------------------------------- 待办：编辑
function todoSheet(id) {
  const t = id ? get('todos', id) : { id: uid(), title: '', date: '', time: '', remind: null, done: false, status: 'ok', created: Date.now(), isNew: true }
  if (!t) return
  const from = t.from && get('items', t.from)
  const rem = t.remind ? new Date(t.remind) : null
  const sh = sheet({ title: t.isNew ? '加一件待办' : t.status === 'ask' ? '确认这件事' : '待办',
    body: `<label class="fld"><span>要做什么</span><textarea class="inp" id="tt" rows="2" style="min-height:64px">${esc(t.title)}</textarea></label>
      <div class="inline"><label class="fld"><span>哪天</span><input class="inp" type="date" id="td" value="${t.date || ''}"></label>
      <label class="fld"><span>几点（可不填）</span><input class="inp" type="time" id="tm" value="${t.time || ''}"></label></div>
      <div class="set-group"><div class="set-row"><div class="grow"><div class="t">到点提醒</div><div class="m" id="rh">${rem ? '在 ' + when(+rem) + ' 提醒' : '填了时间会提前 ' + (SET.lead || 0) + ' 分钟提醒'}</div></div>
      <button class="sw${t.remind || (!t.date && t.isNew) ? '' : ''}${t.remind ? ' on' : ''}" id="rs" aria-label="到点提醒"></button></div></div>
      ${from ? `<div class="hint">来自：<button class="lnk" data-act="item" data-id="${from.id}">${esc(from.title || (from.text || '').slice(0, 20))}</button>${t.why ? '<br>依据：' + esc(t.why) : ''}</div>` : ''}`,
    foot: `${t.isNew ? '' : `<button class="btn danger" data-act="tdel" data-id="${t.id}">${ic('trash')}删除</button>`}<button class="btn pri" id="tsave">${t.status === 'ask' ? '确认加入' : '保存'}</button>` })
  const rs = $('#rs', sh)
  rs.onclick = () => rs.classList.toggle('on')
  $('#tm', sh).onchange = () => { if ($('#tm', sh).value) rs.classList.add('on') }
  $('#tsave', sh).onclick = async () => {
    const title = $('#tt', sh).value.trim()
    if (!title) return toast('写一下要做什么')
    t.title = title; t.date = $('#td', sh).value; t.time = $('#tm', sh).value
    if (t.time && !t.date) t.date = today()
    if (rs.classList.contains('on')) {
      t.remind = t.date && t.time ? toRemind(t.date, t.time) : t.date ? new Date(`${t.date}T${SET.dateRemind}:00`).getTime() : (t.remind || null)
      if (!t.remind) toast('要提醒的话，先选个日子')
    } else t.remind = null
    if (t.remind && t.remind < Date.now()) t.remind = null
    t.status = 'ok'; delete t.isNew
    await save('todos', t); syncAlarms(); close(); paint()
    toast('已保存')
  }
  setTimeout(() => { if (!t.title) $('#tt', sh).focus() }, 300)
}
ACT.tdel = async (el) => { await remove('todos', el.dataset.id); syncAlarms(); close(); paint(); toast('已删除') }

// ---------------------------------------------------------------- 记录
let rFilter = 'all', rQuery = '', selMode = false
const sel = new Set()
function itemTitle(it) { return it.title || (it.text || '').split('\n')[0].slice(0, 40) || KIND[it.kind]?.[0] || '记录' }
function itemRow(it) {
  const n = S.todos.filter((t) => t.from === it.id && t.status === 'ok').length
  const st = it.status === 'busy' ? `<span class="tag lav"><span class="spin" style="width:10px;height:10px;border-width:1.5px"></span>${esc(it.stage || '整理中')}</span>`
    : it.status === 'new' ? `<span class="tag">${key() ? '等网络' : '待整理'}</span>`
    : it.status === 'error' ? '<span class="tag red">没整理成</span>' : ''
  const box = selMode ? `<span class="selbox${sel.has(it.id) ? ' on' : ''}">${sel.has(it.id) ? ic('check') : ''}</span>` : ''
  return `<div class="row" data-act="item" data-id="${it.id}">${box}${kico(it.kind)}<div class="grow"><div class="t">${esc(itemTitle(it))}</div>
    <div class="m">${when(it.created)}${it.ms ? ' · ' + dur(it.ms) : ''}${st}${n ? `<span class="tag green">待办 ${n}</span>` : ''}</div></div></div>`
}
views.records = () => {
  const q = rQuery.trim().toLowerCase()
  let list = [...S.items].sort((a, b) => b.created - a.created)
  if (rFilter !== 'all') list = list.filter((x) => x.kind === rFilter || (rFilter === 'note' && x.kind === 'share'))
  if (q) list = list.filter((x) => [x.title, x.text, x.summary, (x.trans || []).join(' '), (x.ocr || []).map((o) => o.text).join(' '), (x.tags || []).join(' ')].join(' ').toLowerCase().includes(q))
  const chips = [['all', '全部'], ['note', '随手记'], ['voice', '口述'], ['photo', '照片'], ['meeting', '会议']]
  let html = `<div class="search">${ic('search')}<input id="rq" type="search" placeholder="搜一搜记过的内容" value="${esc(rQuery)}" enterkeyhint="search"></div>
    <div class="chips">${chips.map(([k, l]) => `<button class="chip${rFilter === k ? ' on' : ''}" data-act="rf" data-k="${k}">${l}</button>`).join('')}</div>`
  html += `<div class="sec" style="margin-top:4px"><h2>${list.length} 条</h2>${list.length ? `<button class="lnk" data-act="selmode">${selMode ? '完成' : '选择'}</button>` : ''}</div>`
  html += list.length ? `<div class="list">${list.slice(0, 300).map(itemRow).join('')}</div>` : `<div class="list"><div class="empty">${q ? '没搜到' : '还没有记录'}</div></div>`
  if (selMode) html += `<div class="sel-bar"><span class="grow">已选 ${sel.size} 条</span><button class="btn sm ghost" data-act="selall">全选</button><button class="btn sm danger" data-act="seldel" ${sel.size ? '' : 'disabled'}>${ic('trash')}删除</button></div><div style="height:60px"></div>`
  return html
}
document.addEventListener('input', (e) => {
  if (e.target.id === 'rq') { rQuery = e.target.value; clearTimeout(paintT); paintT = setTimeout(() => { const pos = e.target.selectionStart; paint(); const i = $('#rq'); if (i) { i.focus(); i.setSelectionRange(pos, pos) } }, 250) }
})
ACT.rf = (el) => { rFilter = el.dataset.k; paint() }
ACT.selmode = () => { selMode = !selMode; sel.clear(); paint() }
ACT.selall = () => { $$('#view [data-act=item]').forEach((r) => sel.add(r.dataset.id)); paint() }
ACT.seldel = () => confirmBox(`删除选中的 ${sel.size} 条记录？`, '录音和照片会一起删掉，没法恢复。已经加入的待办会保留。', '删除', async () => {
  for (const id of [...sel]) await delItem(id)
  const n = sel.size; sel.clear(); selMode = false; paint(); toast(`已删除 ${n} 条`)
})
async function delItem(id) {
  const it = get('items', id); if (!it) return
  for (const p of it.audio || []) { try { N.deleteFile(p) } catch (e) {} }
  for (const t of S.todos.filter((x) => x.from === id && x.status === 'ask')) await remove('todos', t.id)
  await remove('items', id)
}
ACT.item = (el, e) => {
  if (selMode && el.closest('#view')) { const id = el.dataset.id; sel.has(id) ? sel.delete(id) : sel.add(id); paint(); return }
  itemSheet(el.dataset.id)
}

const SHEETS = {}
SHEETS.item = { body: (id) => {
  const it = get('items', id)
  if (!it) return '<div class="empty">这条记录已经删除</div>'
  const todos = S.todos.filter((t) => t.from === id)
  let b = `<div class="m" style="color:var(--faint);font-size:13px;margin-bottom:10px">${KIND[it.kind]?.[0] || ''} · ${when(it.created)}${it.ms ? ' · ' + dur(it.ms) : ''}${(it.tags || []).map((t) => ` <span class="tag">${esc(t)}</span>`).join('')}</div>`
  if (it.status === 'busy') b += `<div class="card flat"><span class="spin"></span> ${esc(it.stage || '正在整理…')}</div>`
  if (it.status === 'error') b += `<div class="card flat" style="border-color:var(--red)"><b style="color:var(--red)">没整理成</b><div class="prose small">${esc(it.err || '')}</div><div class="btns" style="margin-top:8px"><button class="btn sm" data-act="redo" data-id="${id}">再试一次</button></div></div>`
  if (it.status === 'new') b += `<div class="card flat">${key() ? '等网络恢复后自动整理' : '填好模型密钥后自动整理'}</div>`
  if (it.summary) b += `<div class="summary"><div class="k">概括</div>${esc(it.summary)}</div>`
  if ((it.decisions || []).length) b += `<div class="sec"><h2>定下来的事</h2></div><ul class="pts">${it.decisions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
  if ((it.points || []).length) b += `<div class="sec"><h2>要点</h2></div><ul class="pts">${it.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
  if (todos.length) b += `<div class="sec"><h2>里面的待办</h2></div><div class="list">${todos.map((t) => t.status === 'ask'
    ? `<div class="row"><div class="grow"><div class="t">${esc(t.title)}</div><div class="m"><span class="tag gold">等你确认</span>${t.owner ? `<span class="tag">${esc(t.owner)}</span>` : ''}</div></div><button class="btn sm pri" data-act="yes" data-id="${t.id}">加入</button><button class="btn sm ghost" data-act="no" data-id="${t.id}">不用</button></div>`
    : todoRow(t)).join('')}</div>`
  for (const [i, src] of (it.images || []).entries()) {
    b += `<img class="photo" src="${src}" alt="照片 ${i + 1}">`
    const o = (it.ocr || [])[i]
    if (o && o.text) b += `<details class="more"><summary>图里的文字</summary><div class="prose small">${esc(o.text)}</div></details>`
  }
  if ((it.audio || []).length) b += `<div class="sec"><h2>录音</h2><span class="m">${it.audio.length > 1 ? it.audio.length + ' 段' : ''}</span></div>${it.audio.map((p) => `<audio controls preload="none" src="${esc(p)}"></audio>`).join('')}`
  if (it.text) b += `<div class="sec"><h2>${it.kind === 'voice' ? '你说的' : '原文'}</h2></div><div class="prose">${esc(it.text)}</div>`
  if ((it.trans || []).length) b += `<details class="more"${it.summary ? '' : ' open'}><summary>完整转写（${it.trans.join('').length} 字）</summary><div class="prose small">${esc(it.trans.join('\n\n'))}</div></details>`
  return b
} }
function itemSheet(id) {
  const it = get('items', id); if (!it) return
  sheet({ title: esc(itemTitle(it)), body: SHEETS.item.body(id), refresh: 'item', arg: id, tall: true,
    foot: `<button class="btn" data-act="icopy" data-id="${id}">${ic('copy')}复制</button><button class="btn" data-act="redo" data-id="${id}">${ic('spark')}重新整理</button><button class="btn danger" data-act="idel" data-id="${id}">${ic('trash')}</button>` })
}
ACT.redo = async (el) => {
  const it = get('items', el.dataset.id); if (!it) return
  if (!key()) return settings('model')
  it.status = 'new'; it.err = ''
  if (it.kind === 'photo' && it.statusRedoOcr) it.ocr = []
  await save('items', it); paint(); pump()
}
ACT.icopy = (el) => {
  const it = get('items', el.dataset.id)
  const t = [itemTitle(it), it.summary, it.text, (it.trans || []).join('\n')].filter(Boolean).join('\n\n')
  copy(t)
}
ACT.idel = (el) => confirmBox('删除这条记录？', '录音和照片会一起删掉，没法恢复。已经加入的待办会保留。', '删除', async () => { await delItem(el.dataset.id); close(); paint(); toast('已删除') })
function copy(t) {
  const done = () => toast('已复制')
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => fallback())
  else fallback()
  function fallback() { const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); document.execCommand('copy'); a.remove(); done() }
}
function confirmBox(title, text, okLabel, fn) {
  const sh = sheet({ title, body: `<div class="prose small">${esc(text)}</div>`, foot: `<button class="btn" data-act="close">取消</button><button class="btn danger" id="cok">${okLabel}</button>` })
  $('#cok', sh).onclick = async () => { close(); await fn() }
}

// ---------------------------------------------------------------- 记一下
let capDraft = { text: '', images: [], audio: [], ms: 0, voice: false }
function capture(pre) {
  if (pre) capDraft = { ...capDraft, ...pre }
  const sh = sheet({ title: '记一下', tall: true,
    body: `<div class="cap"><textarea class="inp" id="ct" placeholder="想法、待办、答应别人的事……\n说「明天下午三点提醒我交报告」，到点就会提醒">${esc(capDraft.text)}</textarea>
      <div class="thumbs" id="cth"></div>
      <div class="cap-tools">
        <button class="tool mic" data-act="dictate">${ic('mic')}口述</button>
        <label class="tool cam">${ic('cam')}拍照<input type="file" accept="image/*" capture="environment" id="ccam" hidden></label>
        <label class="tool">${ic('img')}相册<input type="file" accept="image/*" multiple id="cimg" hidden></label>
        <button class="tool meet" data-act="meeting">${ic('meet')}开会录音</button>
      </div>
      <div class="hint">口述：说完自动转成文字，可以改了再记下。开会录音：不限时长，锁屏也在录，结束后自动出纪要和待办。</div></div>`,
    foot: `<button class="btn gold" id="csend">记下</button>`, onClose: () => { const t = $('#ct'); if (t) capDraft.text = t.value } })
  const ta = $('#ct', sh)
  ta.oninput = () => { capDraft.text = ta.value }
  const thumbs = () => { $('#cth', sh).innerHTML = capDraft.images.map((s, i) => `<div class="thumb"><img src="${s}" alt=""><button data-act="rmimg" data-i="${i}" aria-label="去掉">×</button></div>`).join('') }
  thumbs()
  ACT.rmimg = (el) => { capDraft.images.splice(+el.dataset.i, 1); thumbs() }
  const onFiles = async (fs) => { for (const f of fs) capDraft.images.push(await shrink(f)); thumbs() }
  $('#ccam', sh).onchange = (e) => onFiles([...e.target.files])
  $('#cimg', sh).onchange = (e) => onFiles([...e.target.files].slice(0, 6))
  $('#csend', sh).onclick = async () => {
    const text = ta.value.trim()
    if (!text && !capDraft.images.length && !capDraft.audio.length) return toast('写点什么，或者加张照片')
    const kind = capDraft.images.length ? 'photo' : capDraft.voice ? 'voice' : 'note'
    const it = { id: uid(), kind, text, images: capDraft.images, audio: capDraft.audio, ms: capDraft.ms, status: 'new', created: Date.now() }
    await save('items', it)
    capDraft = { text: '', images: [], audio: [], ms: 0, voice: false }
    close(); paint(); pump()
    toast(key() ? '记下了，正在整理' : '记下了；填好模型密钥后自动整理')
  }
  setTimeout(() => ta.focus(), 320)
}
// 照片压缩到长边 1600，省空间也省流量
function shrink(file) {
  return new Promise((ok) => {
    const r = new FileReader()
    r.onload = () => {
      const img = new Image()
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height))
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        ok(c.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => ok(r.result)
      img.src = r.result
    }
    r.readAsDataURL(file)
  })
}

// ---------------------------------------------------------------- 录音（口述 / 开会）
let recTimer = null
function recStart(mode) {
  const r = N.recStart(mode)
  if (r === 'need_mic') { N.askPerm('mic'); pendingRec = mode; return }
  if (r !== 'ok') return toast('录不了：' + String(r).replace('error:', ''))
  showRec(mode)
}
let pendingRec = null
function showRec(mode) {
  closeRec()
  const el = document.createElement('div'); el.className = 'rec' + (mode === 'meet' ? ' meet' : ''); el.id = 'rec'
  el.innerHTML = `<div class="lbl">${mode === 'meet' ? '正在录会议' : '正在听你说'}</div><div class="tm" id="rtm">00:00</div><div class="orb" id="rorb"></div>
    <div class="tip">${mode === 'meet' ? '可以锁屏，录音不会停。结束后自动转写，出纪要和待办。' : '说完点「好了」，自动转成文字。最长 4 分钟。'}</div>
    <div class="btns"><button class="btn" data-act="reccancel">取消</button><button class="btn ${mode === 'meet' ? 'pri' : 'gold'}" data-act="recdone">${mode === 'meet' ? '结束会议' : '好了'}</button></div>`
  document.body.append(el)
  recTimer = setInterval(() => {
    const s = J(N.recState(), {})
    if (!s.on) return
    $('#rtm').textContent = dur(s.ms || 0)
    $('#rorb').style.transform = `scale(${1 + Math.min(0.35, (s.level || 0) * 1.2)})`
  }, 200)
}
function closeRec() { clearInterval(recTimer); const el = $('#rec'); if (el) el.remove() }
ACT.dictate = () => { const t = $('#ct'); if (t) capDraft.text = t.value; recStart('dict') }
ACT.meeting = () => { const t = $('#ct'); if (t) capDraft.text = t.value; close(); recStart('meet') }
ACT.reccancel = () => { N.recCancel(); closeRec(); toast('已取消') }
ACT.recdone = () => finishRec(J(N.recStop(), { segs: [] }))
async function finishRec(r) {
  closeRec()
  const segs = r.segs || []
  if (!segs.length) return toast('没录到声音')
  if (r.mode === 'meet') {
    const it = { id: uid(), kind: 'meeting', text: '', audio: segs, ms: r.ms, status: 'new', created: Date.now() - (r.ms || 0), title: `会议 ${tstr()}` }
    await save('items', it); paint(); pump()
    toast(key() ? '录好了，正在转写和整理纪要' : '录好了；填好模型密钥后自动转写')
    return
  }
  // 口述：转成文字放回输入框，可以改了再记下
  capDraft.audio = segs; capDraft.ms = r.ms; capDraft.voice = true
  if (!$('.sheet .cap')) capture()
  const ta = $('#ct'); const was = ta.value
  ta.value = (was ? was + '\n' : '') + '（正在转文字…）'; ta.disabled = true
  try {
    const t = await asr(segs[0])
    ta.value = (was ? was + '\n' : '') + t
  } catch (e) {
    ta.value = was
    toast(e.offline ? '没网，录音先存着：点「记下」，有网后自动转写' : e.message, 3500)
    if (e.offline) capDraft.pendingAsr = true
  }
  ta.disabled = false; capDraft.text = ta.value; ta.focus()
}

// ---------------------------------------------------------------- 计划
let planSeg = 'plans'
views.plans = () => {
  let html = `<div class="seg"><button class="${planSeg === 'plans' ? 'on' : ''}" data-act="pseg" data-k="plans">计划</button><button class="${planSeg === 'todos' ? 'on' : ''}" data-act="pseg" data-k="todos">全部待办</button></div>`
  if (planSeg === 'todos') return html + todosView()
  const ps = [...S.plans].sort((a, b) => (a.done - b.done) || (a.deadline || '9').localeCompare(b.deadline || '9'))
  html += `<button class="btn gold full" data-act="newplan">${ic('spark')}定一个新计划</button><div class="hint" style="text-align:center">说一个目标和截止日期，AI 帮你拆成按天的步骤，到点提醒你</div>`
  html += ps.length ? ps.map((p) => {
    const steps = S.todos.filter((t) => t.plan === p.id && t.status === 'ok')
    const n = steps.filter((t) => t.done).length
    const next = steps.filter((t) => !t.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))[0]
    const pct = steps.length ? Math.round(n / steps.length * 100) : 0
    return `<div class="card plan" data-act="plan" data-id="${p.id}" style="margin-top:12px"><div style="display:flex;gap:8px;align-items:baseline"><b style="flex:1">${esc(p.goal)}</b><span class="tag ${p.deadline && p.deadline < today() && pct < 100 ? 'red' : ''}">${p.deadline ? dayLabel(p.deadline) + '前' : '不限时'}</span></div>
      <div class="m" style="font-size:12px;color:var(--faint);margin-top:4px">${n}/${steps.length} 步${next ? ' · 下一步：' + esc(next.title) + (next.date ? '（' + dayLabel(next.date) + '）' : '') : pct === 100 && steps.length ? ' · 全部完成 🎉' : ''}</div>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`
  }).join('') : `<div class="empty" style="margin-top:12px">还没有计划。比如「两周内把新产品的结构评审准备好」「这个月读完一本书」</div>`
  return html
}
function todosView() {
  const t = today(), a = active()
  const groups = [
    ['过期', a.filter((x) => !x.done && x.date && x.date < t)],
    ['今天', a.filter((x) => !x.done && x.date === t)],
    ['明天', a.filter((x) => !x.done && x.date === addDays(t, 1))],
    ['以后', a.filter((x) => !x.done && x.date > addDays(t, 1))],
    ['没定日子', a.filter((x) => !x.done && !x.date)],
  ]
  let html = `<button class="btn full" data-act="newtodo">${ic('plus')}加一件待办</button>`
  for (const [name, l] of groups) {
    if (!l.length) continue
    l.sort((x, y) => (x.date + (x.time || '99')).localeCompare(y.date + (y.time || '99')) || y.created - x.created)
    html += `<div class="sec"><h2>${name}</h2><span class="m">${l.length}</span></div><div class="list">${l.map((x) => todoRow(x)).join('')}</div>`
  }
  const done = a.filter((x) => x.done).sort((x, y) => (y.doneAt || 0) - (x.doneAt || 0))
  if (done.length) html += `<details class="more"><summary>已完成 ${done.length} 件</summary><div class="list">${done.slice(0, 50).map((x) => todoRow(x)).join('')}</div></details>`
  if (!a.length) html += '<div class="empty">还没有待办</div>'
  return html
}
ACT.pseg = (el) => { planSeg = el.dataset.k; paint() }
ACT.newtodo = () => todoSheet()

const PLAN_SYS = () => `你是用户的计划助手。现在是 ${nowLine()}。把用户的目标拆成可以一步步执行的步骤。只返回 JSON：
{"goal":"把目标改写成一句清楚的话","steps":[{"title":"具体可执行的一步，动词开头","date":"YYYY-MM-DD","note":"可选，一句提示"}],"advice":"一句提醒，比如最容易卡住的地方"}
规则：3 到 8 步；日期从今天到截止日之间合理分布，不早于今天，不晚于截止日；没有截止日就按两周安排；每一步一个人一天内能推进；不要空话。`
function newPlan() {
  const sh = sheet({ title: '新计划', tall: true,
    body: `<label class="fld"><span>想达成什么</span><textarea class="inp" id="pg" placeholder="比如：两周内准备好新产品的结构评审；这个月读完《原则》"></textarea></label>
      <label class="fld"><span>截止日期 <span class="h">（可不填）</span></span><input class="inp" type="date" id="pd" min="${today()}"></label>
      <label class="fld"><span>补充 <span class="h">（可不填：已经做了什么、每天能花多少时间）</span></span><textarea class="inp" id="pn" style="min-height:70px"></textarea></label>
      <div id="psteps"></div>`,
    foot: `<button class="btn gold" id="pgo">${ic('spark')}帮我拆成步骤</button>` })
  let draft = null
  $('#pgo', sh).onclick = async () => {
    const btn = $('#pgo', sh)
    if (draft) return savePlan()
    const goal = $('#pg', sh).value.trim()
    if (!goal) return toast('写一下目标')
    if (!key()) return settings('model')
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span> 正在拆…'
    try {
      const dl = $('#pd', sh).value
      const j = await chatJSON(PLAN_SYS(), mask(`目标：${goal}\n截止日期：${dl || '没定'}\n补充：${$('#pn', sh).value.trim() || '无'}`))
      draft = { goal: j.goal || goal, deadline: dl, advice: j.advice || '', steps: (j.steps || []).filter((s) => s && s.title).slice(0, 10) }
      if (!draft.steps.length) throw new AIError('没拆出步骤，换个说法试试')
      renderSteps()
      btn.innerHTML = `${ic('check')}确认，开始执行`
    } catch (e) { toast(e.message, 3500); btn.innerHTML = `${ic('spark')}帮我拆成步骤` }
    btn.disabled = false
  }
  function renderSteps() {
    $('#psteps', sh).innerHTML = `<div class="sec"><h2>步骤</h2><span class="m">可以直接改</span></div>${draft.advice ? `<div class="summary" style="margin-bottom:10px"><div class="k">提醒</div>${esc(draft.advice)}</div>` : ''}
      ${draft.steps.map((s, i) => `<div class="step-ed"><span class="n">${i + 1}</span><div class="grow"><input class="inp" data-si="${i}" data-f="title" value="${esc(s.title)}"><input class="inp" type="date" data-si="${i}" data-f="date" value="${/^\d{4}-\d{2}-\d{2}$/.test(s.date || '') ? s.date : ''}"></div><button class="ib" data-act="rmstep" data-i="${i}" aria-label="去掉这步">${ic('x')}</button></div>`).join('')}
      <button class="lnk" data-act="addstep">＋ 加一步</button>`
    $$('[data-si]', sh).forEach((inp) => inp.oninput = () => { draft.steps[+inp.dataset.si][inp.dataset.f] = inp.value })
    $('#psteps', sh).scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  ACT.rmstep = (el) => { draft.steps.splice(+el.dataset.i, 1); renderSteps() }
  ACT.addstep = () => { draft.steps.push({ title: '', date: '' }); renderSteps() }
  async function savePlan() {
    const p = { id: uid(), goal: draft.goal, deadline: draft.deadline, advice: draft.advice, created: Date.now(), done: 0 }
    await save('plans', p)
    for (const s of draft.steps) {
      if (!String(s.title).trim()) continue
      await save('todos', { id: uid(), title: s.title.trim(), date: s.date || '', time: '', remind: null, done: false, status: 'ok', plan: p.id, note: s.note || '', created: Date.now() })
    }
    syncAlarms(); close(); paint(); toast('计划已开始，步骤都在待办里了')
  }
}
ACT.newplan = () => newPlan()
SHEETS.plan = { body: (id) => {
  const p = get('plans', id); if (!p) return '<div class="empty">计划已删除</div>'
  const steps = S.todos.filter((t) => t.plan === id && t.status === 'ok').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))
  return `<div class="m" style="color:var(--faint);font-size:13px;margin-bottom:10px">${p.deadline ? dayLabel(p.deadline) + '前完成' : '不限时'} · ${steps.filter((t) => t.done).length}/${steps.length} 步</div>
    ${p.advice ? `<div class="summary"><div class="k">提醒</div>${esc(p.advice)}</div>` : ''}
    <div class="sec"><h2>步骤</h2><button class="lnk" data-act="planstep" data-id="${id}">＋ 加一步</button></div>
    <div class="list">${steps.map((t) => todoRow(t, { noPlan: true })).join('') || '<div class="empty">没有步骤</div>'}</div>`
} }
ACT.plan = (el) => {
  const p = get('plans', el.dataset.id)
  sheet({ title: esc(p.goal), body: SHEETS.plan.body(p.id), refresh: 'plan', arg: p.id, tall: true,
    foot: `<button class="btn danger" data-act="pdel" data-id="${p.id}">${ic('trash')}删除计划</button>` })
}
ACT.planstep = async (el) => {
  const id = uid()
  await save('todos', { id, title: '新的一步', date: '', time: '', remind: null, done: false, status: 'ok', plan: el.dataset.id, created: Date.now() })
  paint(); todoSheet(id)
}
ACT.pdel = (el) => confirmBox('删除这个计划？', '计划里没完成的步骤会一起删掉，已完成的留在待办里。', '删除', async () => {
  const id = el.dataset.id
  for (const t of S.todos.filter((x) => x.plan === id)) { if (t.done) { t.plan = ''; await save('todos', t) } else await remove('todos', t.id) }
  await remove('plans', id); syncAlarms(); closeAll(); paint(); toast('已删除')
})

// ---------------------------------------------------------------- 问问
const ASK_SYS = () => `你是用户的随身助理「思维源体」，根据用户自己记下的内容回答问题。现在是 ${nowLine()}。
规则：只根据下面给出的资料回答，引用时在句末标 [编号]；资料里没有的就直接说「记录里没找到」，可以给一句建议但要说明是建议；回答简短、口语化，用中文；列待办时按时间顺序。`
function searchContext(q) {
  const words = q.replace(/[，。？！、,.?!\s]+/g, ' ').split(' ').filter((w) => w.length >= 2)
  const grams = new Set(words)
  for (const w of words) for (let i = 0; i < w.length - 1; i++) grams.add(w.slice(i, i + 2))
  const score = (s) => { s = s.toLowerCase(); let n = 0; for (const g of grams) if (s.includes(g.toLowerCase())) n += g.length; return n }
  const docs = S.items.map((it) => ({ it, s: [it.title, it.summary, it.text, (it.trans || []).join(' ').slice(0, 3000), (it.ocr || []).map((o) => o.text).join(' '), (it.tags || []).join(' ')].join(' ') }))
  const now = Date.now()
  docs.forEach((d) => { d.score = score(d.s) + Math.max(0, 3 - (now - d.it.created) / 86400000 / 3) })
  return docs.sort((a, b) => b.score - a.score).slice(0, 12).map((d) => d.it)
}
async function ask(q) {
  const hits = searchContext(q)
  const ctx = hits.map((it, i) => `[${i + 1}] ${when(it.created)} ${KIND[it.kind]?.[0] || ''}《${itemTitle(it)}》${it.summary ? '概括：' + it.summary + '；' : ''}${(it.text || (it.trans || []).join(' ') || (it.ocr || []).map((o) => o.text).join(' ')).slice(0, 600)}`).join('\n')
  const td = active().filter((t) => !t.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9')).slice(0, 40)
    .map((t) => `- ${t.title}${t.date ? '（' + t.date + (t.time ? ' ' + t.time : '') + '）' : '（没定日子）'}${t.plan ? ' 属于计划：' + (get('plans', t.plan)?.goal || '') : ''}`).join('\n')
  const pl = S.plans.map((p) => `- ${p.goal}${p.deadline ? '，截止 ' + p.deadline : ''}`).join('\n')
  const hist = S.chats.slice(-4).map((c) => `问：${c.q}\n答：${c.a}`).join('\n')
  const user = `【没做完的待办】\n${td || '无'}\n\n【计划】\n${pl || '无'}\n\n【相关记录】\n${ctx || '无'}\n\n${hist ? '【刚才聊过】\n' + hist + '\n\n' : ''}【问题】${q}`
  const a = await chatText(ASK_SYS(), mask(user).slice(0, 20000))
  return { a, refs: hits.map((x) => x.id) }
}
views.ask = () => {
  const cs = S.chats.slice(-30)
  let html = '<div class="chat" id="chat">'
  if (!cs.length) html += `<div class="hello"><div class="g">问问你自己的记录</div><div class="d">它只看你记下的内容回答，会标出出处</div></div>
    <div class="sugg">${['今天要做什么？', '这周我答应了别人什么事？', '帮我总结一下最近的想法', '有哪些事拖了很久没做？'].map((s) => `<button data-act="sugg">${s}</button>`).join('')}</div>`
  for (const c of cs) {
    html += `<div class="bub me">${esc(c.q)}</div>`
    if (c.pending) html += `<div class="bub ai"><span class="spin"></span> 正在翻你的记录…</div>`
    else {
      const refs = (c.refs || []).map((id, i) => ({ id, i: i + 1 })).filter((r) => new RegExp('\\[' + r.i + '\\]').test(c.a) && get('items', r.id))
      html += `<div class="bub ai">${esc(c.a)}${refs.length ? `<div class="refs">${refs.map((r) => `<button class="tag lav" data-act="item" data-id="${r.id}">[${r.i}] ${esc(itemTitle(get('items', r.id)).slice(0, 12))}</button>`).join('')}</div>` : ''}</div>`
    }
  }
  html += '</div><div style="height:90px"></div>'
  html += `<div class="askbar"><textarea id="aq" rows="1" placeholder="问点什么…" enterkeyhint="send"></textarea><button class="btn pri" data-act="asksend" aria-label="发送">${ic('send')}</button></div>`
  return html
}
function afterAsk() {
  const v = $('#view'); v.scrollTop = v.scrollHeight
  const q = $('#aq')
  if (q) {
    q.oninput = () => { q.style.height = 'auto'; q.style.height = Math.min(120, q.scrollHeight) + 'px' }
    q.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ACT.asksend() } }
  }
}
ACT.sugg = (el) => doAsk(el.textContent)
ACT.asksend = () => { const q = $('#aq'); if (q && q.value.trim()) doAsk(q.value.trim()) }
async function doAsk(q) {
  if (!key()) return settings('model')
  const c = { id: uid(), q, a: '', pending: true, at: Date.now() }
  S.chats.push(c); paint()
  try { const r = await ask(q); c.a = r.a; c.refs = r.refs } catch (e) { c.a = '没问成：' + e.message }
  delete c.pending; await save('chats', c); paint()
}

// ---------------------------------------------------------------- 设置
function permRows() {
  const p = J(N.perms(), {})
  const row = (ok, t, m, act, btn) => `<div class="set-row"><div class="grow"><div class="t">${t}</div><div class="m">${m}</div></div>${ok ? '<span class="ok">已开</span>' : `<button class="btn sm gold" data-act="${act}">${btn}</button>`}</div>`
  return row(p.notify, '通知', '提醒和每天早上的简报靠它', 'pnotify', '打开') +
    row(p.mic, '麦克风', '口述和开会录音', 'pmic', '允许') +
    row(p.exact, '准时提醒', '到点准时响，不被系统推迟', 'pexact', '允许') +
    row(p.battery, '后台不被清理', '关掉 App 后提醒照样响（vivo 必开）', 'pbattery', '去设置') +
    `<div class="set-row"><div class="grow"><div class="t">vivo 后台高耗电 / 自启动</div><div class="m">打开「允许后台高耗电」和「自启动」，锁屏后提醒才稳定</div></div><button class="btn sm" data-act="pauto">去设置</button></div>`
}
ACT.pnotify = () => { const p = J(N.perms(), {}); p.notify ? 0 : (N.askPerm('notify'), setTimeout(() => { if (!J(N.perms(), {}).notify) N.openSettings('notify') }, 1500)) }
ACT.pmic = () => N.askPerm('mic')
ACT.pexact = () => N.openSettings('exact')
ACT.pbattery = () => N.openSettings('battery')
ACT.pauto = () => N.openSettings('autostart')

function settings(focus) {
  const st = J(N.storageInfo(), {})
  const mb = (b) => (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB'
  const k = key()
  const pg = page('设置', `
    <div class="set-h">模型（阿里云百炼 · 通义千问）</div>
    <div class="set-group" id="smodel">
      <div class="set-row" style="flex-direction:column;align-items:stretch;gap:10px">
        <div><div class="t">API 密钥</div><div class="m">${k ? '已填好：' + esc(k.slice(0, 5)) + '••••' + esc(k.slice(-4)) : '在百炼控制台的「API-KEY」页面创建，复制过来粘贴'}</div></div>
        <input class="inp" id="skey" type="password" autocomplete="off" placeholder="${k ? '要换密钥就粘贴新的' : 'sk-…'}">
        <div class="btns"><button class="btn sm pri" data-act="savekey">测试并保存</button><button class="btn sm" data-act="getkey">去百炼拿密钥</button></div>
      </div>
      <div class="set-row" style="flex-direction:column;align-items:stretch;gap:8px"><div class="t">档位</div>
        <div class="seg" style="margin:0">${Object.entries(TIERS).map(([id, t]) => `<button class="${SET.tier === id ? 'on' : ''}" data-act="tier" data-k="${id}">${t.name}</button>`).join('')}</div>
        <div class="m">${TIERS[SET.tier].d}（对话 ${model('chat')}，看图 ${model('vl')}，转写 ${ASR_MODEL}）</div></div>
    </div>
    <div class="set-h">提醒</div>
    <div class="set-group">
      <div class="set-row"><div class="grow"><div class="t">每天早上的简报</div><div class="m">告诉你今天有几件事</div></div><input class="inp" type="time" id="sbrief" value="${SET.brief}" style="width:110px"><button class="sw${SET.briefOn ? ' on' : ''}" data-act="swbrief" aria-label="早上简报"></button></div>
      <div class="set-row"><div class="grow"><div class="t">有具体时间的事，提前</div><div class="m">比如 15:00 的会，提前 10 分钟提醒</div></div><select class="inp" id="slead" style="width:110px">${[0, 5, 10, 15, 30, 60].map((n) => `<option value="${n}" ${+SET.lead === n ? 'selected' : ''}>${n ? n + ' 分钟' : '准点'}</option>`).join('')}</select></div>
      <div class="set-row"><div class="grow"><div class="t">只有日期的事，几点提醒</div></div><input class="inp" type="time" id="sdate" value="${SET.dateRemind}" style="width:110px"></div>
      <div class="set-row"><div class="grow"><div class="t">试一下提醒</div><div class="m">马上发一条通知，看看能不能收到</div></div><button class="btn sm" data-act="testn">试一下</button></div>
    </div>
    <div class="set-h">手机权限</div>
    <div class="set-group" id="sperm">${permRows()}</div>
    <div class="set-h">隐私</div>
    <div class="set-group">
      <div class="set-row"><div class="grow"><div class="t">发给模型前打码</div><div class="m">手机号、身份证号、银行卡号换成星号再发。照片和录音原样发送，用来识别和转写</div></div><button class="sw${SET.mask ? ' on' : ''}" data-act="swmask" aria-label="打码"></button></div>
      <div class="set-row"><div class="grow"><div class="t">数据存在哪</div><div class="m">全部在这部手机里，不上传到任何服务器。卸载 App 会清掉，记得定期导出备份</div></div></div>
    </div>
    <div class="set-h">数据</div>
    <div class="set-group">
      <div class="set-row"><div class="grow"><div class="t">${S.items.length} 条记录 · ${S.todos.filter((t) => t.status === 'ok').length} 件待办 · ${S.plans.length} 个计划</div><div class="m">录音占用 ${mb(st.files || 0)}，手机剩余 ${mb(st.free || 0)}</div></div></div>
      <div class="set-row"><div class="grow"><div class="t">导出备份</div><div class="m">存到「下载/思维源体」文件夹，换手机时用</div></div><button class="btn sm" data-act="export">导出</button></div>
      <div class="set-row"><div class="grow"><div class="t">从备份恢复</div><div class="m">选之前导出的备份文件，和现在的数据合并</div></div><label class="btn sm">选文件<input type="file" accept=".json,application/json" id="simport" hidden></label></div>
    </div>
    <div class="set-h">关于</div>
    <div class="set-group"><div class="set-row"><div class="grow"><div class="t">思维源体 · 随身版</div><div class="m">版本 ${esc(N.version())} · 中台的简化版，独立使用</div></div></div>
      <div class="set-row"><div class="grow"><div class="t">重新看一遍引导</div></div><button class="btn sm" data-act="rewiz">打开</button></div></div>`)
  $('#sbrief', pg).onchange = (e) => { SET.brief = e.target.value || '08:30'; saveSet(); syncAlarms(); toast('已保存') }
  $('#slead', pg).onchange = (e) => { SET.lead = +e.target.value; saveSet(); recomputeRemind(); toast('已保存') }
  $('#sdate', pg).onchange = (e) => { SET.dateRemind = e.target.value || '09:00'; saveSet(); syncAlarms(); toast('已保存') }
  $('#simport', pg).onchange = (e) => importBackup(e.target.files[0])
  if (focus === 'model') setTimeout(() => $('#skey', pg).focus(), 350)
  pg.dataset.settings = '1'
}
async function recomputeRemind() {
  for (const t of S.todos) if (t.date && t.time && t.remind && !t.custom) { t.remind = toRemind(t.date, t.time); await save('todos', t) }
  syncAlarms()
}
ACT.getkey = () => N.openUrl('https://bailian.console.aliyun.com/?tab=model#/api-key')
ACT.savekey = async (el) => {
  const inp = $('#skey') || $('#wkey'); const v = (inp && inp.value || '').trim()
  if (!v && !key()) return toast('先粘贴密钥')
  const old = key()
  if (v) N.setPref('dashscope_key', v)
  el.disabled = true; const label = el.innerHTML; el.innerHTML = '<span class="spin"></span> 测试中…'
  try {
    const a = await chatText('只回复两个字：好的', '测试')
    toast('连上了 ✓ ' + a.slice(0, 10)); if (inp) inp.value = ''
    if ($('.page[data-settings]')) { close(); settings() }
    if ($('#wiz')) wizNext()
    pump()
  } catch (e) {
    if (v) N.setPref('dashscope_key', old)
    toast(e.message, 4000)
  }
  el.disabled = false; el.innerHTML = label
}
ACT.tier = (el) => { SET.tier = el.dataset.k; saveSet(); close(); settings() }
ACT.swbrief = (el) => { SET.briefOn = !SET.briefOn; el.classList.toggle('on', SET.briefOn); saveSet(); syncAlarms() }
ACT.swmask = (el) => { SET.mask = !SET.mask; el.classList.toggle('on', SET.mask); saveSet() }
ACT.testn = () => { N.testNotice('思维源体 · 试一下', '能看到这条，说明提醒没问题。'); toast('已发送，看看通知栏') }
ACT.rewiz = () => { closeAll(); wizard() }

// 备份：所有记录、待办、计划、对话 + 录音文件（base64）
ACT.export = async () => {
  toast('正在打包…')
  const files = {}
  for (const it of S.items) for (const p of it.audio || []) { const b = N.readFileB64(p); if (b) files[p] = b }
  const data = { app: 'cognsource-lite', v: 1, at: new Date().toISOString(), set: SET, items: S.items, todos: S.todos, plans: S.plans, chats: S.chats, files }
  const r = N.saveDownload(`思维源体备份-${dstr()}-${tstr().replace(':', '')}.json`, 'application/json', JSON.stringify(data))
  toast(r === 'ok' ? '已存到「下载/思维源体」' : '导出失败：' + r, 3500)
}
async function importBackup(f) {
  if (!f) return
  const d = J(await f.text(), null)
  if (!d || d.app !== 'cognsource-lite') return toast('这不是随身版的备份文件')
  const map = {}
  for (const [p, b] of Object.entries(d.files || {})) map[p] = N.writeFileB64(p.split('/').pop(), b)
  let n = 0
  for (const s of ['items', 'todos', 'plans', 'chats']) for (const o of d[s] || []) {
    if (get(s, o.id)) continue
    if (s === 'items' && o.audio) o.audio = o.audio.map((p) => map[p] || p)
    await save(s, o); n++
  }
  syncAlarms(); closeAll(); paint(); toast(`恢复了 ${n} 条`)
}

// ---------------------------------------------------------------- 第一次打开：引导
let wizStep = 0
function wizard() {
  wizStep = 0
  const el = document.createElement('div'); el.className = 'wiz'; el.id = 'wiz'
  document.body.append(el)
  wizPaint()
}
const LOGO = `<svg class="logo" viewBox="0 0 108 108"><rect width="108" height="108" rx="26" fill="#14121F"/><circle cx="54" cy="54" r="22" fill="none" stroke="#A99CFF" stroke-opacity=".4" stroke-width="1.6"/><circle cx="54" cy="54" r="9" fill="#F2C46D"/><circle cx="54" cy="32" r="4.5" fill="#A99CFF"/><circle cx="73" cy="65" r="4.5" fill="#FFE7B8"/><circle cx="35" cy="65" r="4.5" fill="#7FD8C3"/></svg>`
function wizPaint() {
  const el = $('#wiz'); if (!el) return
  const dots = `<div class="steps">${[0, 1, 2].map((i) => `<i class="${i <= wizStep ? 'on' : ''}"></i>`).join('')}</div>`
  if (wizStep === 0) el.innerHTML = `${dots}${LOGO}<h2>思维源体 · 随身版</h2><p>一个装在手机里的小中台：随手记下，AI 帮你整理成待办、计划和提醒。</p>
    <div class="feat">${kico('voice')}<div><b>说一句就记下</b><span>文字、口述、拍照、开会录音都行</span></div></div>
    <div class="feat">${kico('photo')}<div><b>自动整理</b><span>提取待办和时间，拿不准的才问你</span></div></div>
    <div class="feat">${kico('meeting')}<div><b>到点提醒</b><span>关掉 App 也会响，每天早上一条简报</span></div></div>
    <div class="feat">${kico('note')}<div><b>数据在你手里</b><span>全部存在这部手机，不上传服务器</span></div></div>
    <div class="grow"></div><button class="btn gold full" data-act="wiznext">开始设置（1 分钟）</button>`
  if (wizStep === 1) el.innerHTML = `${dots}<h2 style="margin-top:20px">接上在线模型</h2><p>整理、转写、看图都用阿里云百炼的通义千问。去百炼控制台创建一个 API 密钥，复制回来粘贴到下面。</p>
    <label class="fld"><span>API 密钥</span><input class="inp" id="wkey" type="password" autocomplete="off" placeholder="sk-…"></label>
    <div class="btns"><button class="btn pri" data-act="savekey">测试并保存</button><button class="btn" data-act="getkey">去百炼拿密钥</button></div>
    <p class="hint" style="margin-top:14px">密钥只存在这部手机里。新开通的百炼账号有免费额度，日常记录一个月花费通常不到几块钱。</p>
    <div class="grow"></div><button class="btn ghost full" data-act="wiznext">先跳过，记下的内容等填好后再整理</button>`
  if (wizStep === 2) el.innerHTML = `${dots}<h2 style="margin-top:20px">打开提醒需要的权限</h2><p>vivo 手机默认会清理后台，下面几项都打开，关掉 App 后提醒才会准时响。</p>
    <div class="set-group" id="wperm">${permRows()}</div>
    <div class="grow"></div><button class="btn gold full" data-act="wizdone">好了，开始用</button>`
}
function wizNext() { wizStep = Math.min(2, wizStep + 1); wizPaint() }
ACT.wiznext = () => wizNext()
ACT.wizdone = () => { SET.onboarded = true; saveSet(); $('#wiz').remove(); syncAlarms(); paint(); setTimeout(() => capture(), 300) }

// ---------------------------------------------------------------- 原生回调
const App = window.App = {
  back() {
    if ($('#rec')) return true
    if (stack.length) { close(); return true }
    if (selMode) { selMode = false; sel.clear(); paint(); return true }
    if (view !== 'today') { go('today'); return true }
    return false
  },
  async onResume() {
    const acts = J(N.takeActions(), [])
    for (const a of acts) {
      if (a.id === 'rec' && a.act === 'autostop') { if ($('#rec')) finishRec(J(J(N.recState(), {}).last, { segs: [] })); continue }
      const [k, id] = String(a.id).split(':')
      if (k !== 'todo') continue
      const t = get('todos', id); if (!t) continue
      if (a.act === 'done') { t.done = true; t.doneAt = a.at }
      if (a.act === 'snooze') { t.remind = a.at; t.custom = true }
      await save('todos', t)
    }
    const s = J(N.recState(), {})
    if (s.on && !$('#rec')) showRec(s.mode)
    if (pendingRec && J(N.perms(), {}).mic) { const m = pendingRec; pendingRec = null; recStart(m) }
    $$('#sperm,#wperm').forEach((el) => el.innerHTML = permRows())
    syncAlarms(); paint(); pump()
  },
  onPerm() {
    $$('#sperm,#wperm').forEach((el) => el.innerHTML = permRows())
    if (pendingRec && J(N.perms(), {}).mic) { const m = pendingRec; pendingRec = null; recStart(m) }
  },
  openFromNotice(id) {
    const [k, x] = String(id).split(':')
    if (k === 'todo' && get('todos', x)) { closeAll(); todoSheet(x) }
    else if (k === 'brief') go('today')
    else if (k === 'rec') { const s = J(N.recState(), {}); if (s.on) showRec(s.mode) }
  },
  onShare(o) {
    const pre = { text: (capDraft.text ? capDraft.text + '\n' : '') + (o.text || '') }
    if (o.image) pre.images = [...capDraft.images, o.image]
    closeAll(); capture(pre)
  },
}

// ---------------------------------------------------------------- 启动
async function boot() {
  await openDB(); await loadAll()
  // 超过 7 天还没确认的建议：自动放进「以后再说」（不再出现在今天页）
  const old = Date.now() - 7 * 86400000
  for (const t of S.todos) if (t.status === 'ask' && t.created < old && !t.later) { t.later = true; await save('todos', t) }
  // 上次没整理完的（App 被关掉）重新排队
  for (const it of S.items) if (it.status === 'busy') { it.status = 'new'; await save('items', it) }
  paint()
  if (!SET.onboarded) wizard()
  else App.onResume()
  if (!HAS_NATIVE) console.info('浏览器预览模式：没有原生能力')
}
boot()
})()

// Tek Kalbim — site uygulaması
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';

// ---------- Sabitler (veritabanıyla aynı olmalı) ----------
const CONSENT_VERSION = 'v1';
const RANGES = ['18-29', '30-39', '40+'];
const DAILY = 10, VOICE_MSGS = 20, VOICE_MAX = 60, COOLDOWN_H = 12;
// Sıra önemli: veritabanı soruları numarasıyla tutar. Yeni soru sona eklenir, schema.sql'deki _nq() güncellenir.
const QS = [
  'Bugün günün nasıl geçti?', 'Şu an ne dinliyorsun?', 'En son izlediğin dizi ya da film?', 'Çay mı kahve mi?',
  'Hayalindeki tatil yeri neresi?', 'Sabah insanı mısın, gece kuşu mu?', 'Seni en çok ne güldürür?',
  'Bir süper gücün olsa ne olurdu?', 'Hafta sonunu nasıl geçirmeyi seversin?', 'Okuduğun son kitap hangisi?',
  'Deniz mi dağ mı?', 'Burada ne arıyorsun: sohbet mi arkadaşlık mı?', 'En sevdiğin yemek ne?',
  'Çocukken ne olmak isterdin?', 'Seni mutlu eden küçük bir şey?', 'Bir günlüğüne başka bir şehirde yaşasan neresi olurdu?',
  'İlk görüşte aşka inanır mısın?', 'Senin için mükemmel bir ilk buluşma nasıl olurdu?', 'Hiç birine mektup yazdın mı?',
  'Bir ilişkide senin için en önemli şey ne?', 'Romantik bir sürpriz yapsan ne yapardın?', 'Seni bir insana bağlayan ilk şey ne olur?'
];
const ROMANTIC_FROM = 16;
// İlgi alanları (veritabanındaki _tags() listesiyle aynı olmalı)
const TAGS = ['Müzik', 'Film & dizi', 'Kitap', 'Spor', 'Futbol', 'Fitness', 'Doğa & kamp', 'Seyahat', 'Yemek', 'Kahve', 'Oyun', 'Teknoloji', 'Sanat', 'Fotoğraf', 'Dans', 'Hayvanlar', 'Tarih', 'Psikoloji', 'Bilim', 'Moda', 'Yoga', 'Satranç', 'Gönüllülük', 'Tiyatro'];
const MAX_TAGS = 5;
const REASONS = [['taciz', 'Taciz veya rahatsız edici davranış'], ['mustehcen', 'Müstehcen içerik'],
  ['18_alti', '18 yaşından küçük olduğunu düşünüyorum'], ['kisisel_bilgi', 'Kişisel bilgi isteme veya paylaşma'],
  ['dolandiricilik', 'Para, reklam veya dolandırıcılık'], ['nefret', 'Nefret söylemi veya hakaret'], ['diger', 'Diğer']];
const ERR = {
  UNDER_18: '18 yaşından küçükler bu siteyi kullanamaz.', BAD_DATE: 'Doğum tarihini kontrol et.',
  NO_REROLLS: 'Rumuz değiştirme hakkın bitti.', IN_CHAT: 'Önce mevcut sohbetini bitirmelisin.',
  DAILY_LIMIT: `Bugünkü ${DAILY} eşleşme hakkın bitti. Hakların gece yarısı yenilenir.`,
  SUSPENDED: 'Hesabın geçici olarak askıya alındı.', CHAT_ENDED: 'Bu sohbet sona erdi.',
  OPENING_NOT_DONE: 'Karşı tarafın da sorularını seçmesi bekleniyor.', SLOW_DOWN: 'Biraz yavaş, çok hızlı yazıyorsun.',
  BAD_LENGTH: 'Mesaj en fazla 500 karakter olabilir.', ALREADY_ANSWERED: 'Bu soruyu zaten cevapladın.',
  VOICE_LOCKED: 'Sesli mesaj henüz kilitli.', VOICE_NOT_ALLOWED: 'Sesli mesaj için iki tarafın da izni gerekiyor.',
  FRIEND_SLOT_FULL: 'Tek arkadaş hakkın dolu.', FRIEND_COOLDOWN: `Arkadaşını çıkardıktan sonra ${COOLDOWN_H} saat beklemelisin.`,
  OTHER_HAS_FRIEND: 'Bu kişinin zaten bir arkadaşı var.', ALREADY_FRIENDS: 'Zaten arkadaşsınız.',
  FRIEND_BUSY: 'Arkadaşın şu an başka bir sohbette.', NO_FRIEND: 'Arkadaşın yok.'
};

// ---------- Kısayollar ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const gName = g => g === 'K' ? 'Kadın' : g === 'E' ? 'Erkek' : '';
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
function av(n, size) {
  const h = hue(n), st = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<svg class="av"${st} viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="hsl(${h} 55% 58%)"/><path d="M14 22 L20 6 L28 18Z M50 22 L44 6 L36 18Z" fill="hsl(${h} 45% 40%)"/><ellipse cx="32" cy="36" rx="20" ry="17" fill="hsl(${h} 70% 90%)"/><path d="M12 30 Q32 18 52 30 Q50 40 40 38 Q32 34 24 38 Q14 40 12 30Z" fill="#0d3b47" opacity=".88"/><circle cx="23" cy="31" r="3" fill="#fff"/><circle cx="41" cy="31" r="3" fill="#fff"/><ellipse cx="32" cy="45" rx="4" ry="3" fill="hsl(${h} 45% 35%)"/></svg>`;
}
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); window.scrollTo({ top: 0 }); }
const errMsg = e => { const m = (e && (e.message || e.error_description)) || ''; const code = Object.keys(ERR).find(k => m.includes(k)); return code ? ERR[code] : 'Bir sorun oluştu, tekrar dene.'; };
const errCode = e => Object.keys(ERR).find(k => ((e && e.message) || '').includes(k));

// ---------- Alt pencere ----------
function sheet(html, acts, after) {
  $('sheet').innerHTML = html + `<div class="acts">${acts.map((a, i) => `<button class="${a[2] || 'ghost'}" data-a="${i}">${esc(a[0])}</button>`).join('')}</div>`;
  $('sheet').querySelectorAll('[data-a]').forEach(b => b.onclick = () => acts[+b.dataset.a][1]());
  $('veil').classList.add('on'); after && after();
  $('sheet').querySelector('[data-a]')?.focus();
}
const closeSheet = () => $('veil').classList.remove('on');
const info = (title, text) => sheet(`<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}`, [['Tamam', closeSheet, 'btn']]);
$('veil').addEventListener('click', e => { if (e.target === $('veil')) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

const LOGO = '<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true"><defs><linearGradient id="tkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2a3a"/><stop offset="1" stop-color="#b8001c"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="#0d3b47"/><path d="M32 56C32 56 6 41 6 22.5 6 13.5 12.8 7 21 7c5 0 9 2.6 11 6.8C34 9.6 38 7 43 7c8.2 0 15 6.5 15 15.5C58 41 32 56 32 56Z" fill="url(#tkg)"/><path d="M13.5 18.5c1.6-4.2 5-6.3 9-6.3" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="26" r="5.2" fill="#0d3b47"/><path d="M29.3 29.5h5.4l1.7 11.5h-8.8z" fill="#0d3b47"/></svg>';
$('brand').innerHTML = LOGO + 'Tek Kalbim';
$('brand').onclick = goHome;
$('brand').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); } };
function goHome() {
  const on = id => $(id).classList.contains('on');
  if (on('s-chat') || on('s-qs')) return sheet('<h3>Sohbetin devam ediyor</h3><p>Ana sayfaya dönmek için önce bu sohbeti bitirmen gerekiyor.</p>', [['Sohbete dön', closeSheet, 'btn'], ['Sohbeti bitir', () => { closeSheet(); askEnd(); }]]);
  if (on('s-wait')) return sheet('<h3>Arama durdurulsun mu?</h3>', [['Aramaya devam et', closeSheet, 'btn'], ['Aramayı durdur', () => { closeSheet(); $('cancelWait').click(); }]]);
  closeSheet();
  if (ST && ST.profile && ST.profile.gender && !ST.profile.banned_until && on('s-search') === false && !on('s-profile')) { renderSearch(); show('s-search'); return; }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Bildirim sesi, titreşim, sekme başlığı ----------
let actx = null, unread = 0;
document.addEventListener('pointerdown', () => { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } }, { once: true });
function ding(kind) {
  try {
    if (!actx) return; const t = actx.currentTime;
    (kind === 'match' ? [660, 880] : [740]).forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.14); g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.14 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.14 + 0.25);
      o.connect(g).connect(actx.destination); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.3);
    });
  } catch {}
  try { navigator.vibrate && navigator.vibrate(kind === 'match' ? [120, 80, 120] : 80); } catch {}
}
function bumpUnread() { if (!document.hidden) return; unread++; document.title = `(${unread}) Tek Kalbim`; }
document.addEventListener('visibilitychange', () => { if (!document.hidden) { unread = 0; document.title = 'Tek Kalbim'; } });
$('masks').innerHTML = ['Neşeli Tilki', 'Uykulu Penguen', 'Meraklı Baykuş'].map(n => `<span class="bob">${av(n)}</span>`).join('');

// ---------- Bağlantı ----------
const CFG = window.TK_CONFIG || {};
const configured = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('BURAYA') && CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes('BURAYA');
const sb = configured ? createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
let ME = null, ST = null;
async function rpc(name, args) { const { data, error } = await sb.rpc(name, args || {}); if (error) throw error; return data; }
async function refresh() { ST = await rpc('my_state'); return ST; }

// ---------- Yönlendirme ----------
async function route() {
  if (store.get('tk_u18') === '1') return show('s-minor');
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { $('deleteMe').hidden = true; return show('s-gate'); }
  ME = session.user.id; $('deleteMe').hidden = false;
  if (!window.__ping) { window.__ping = setInterval(() => sb.rpc('ping'), 30000); sb.rpc('ping'); }
  if (!window.__homePoll) window.__homePoll = setInterval(homePoll, 12000);
  try { await refresh(); } catch (e) { return info('Bağlantı sorunu', errMsg(e)); }
  const p = ST.profile;
  if (!p) return show('s-gate');
  if (p.banned_until) { $('bannedTxt').textContent = `Askı bitişi: ${new Date(p.banned_until).toLocaleString('tr-TR')}`; return show('s-banned'); }
  if (!p.gender) { renderProfile(); return show('s-profile'); }
  if (ST.chat) return enterChat(ST.chat.id);
  if (ST.in_queue) return startWaiting();
  renderSearch(); show('s-search');
}

// ---------- Giriş kapısı ----------
$('birth').max = new Date().toISOString().slice(0, 10);
function ageOf(v) { const b = new Date(v + 'T00:00:00'), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a; }
function gateCheck() {
  const v = $('birth').value, age = v ? ageOf(v) : null;
  const minor = age !== null && age < 18;
  $('gateErr').hidden = !minor; $('gateErr').textContent = minor ? ERR.UNDER_18 : '';
  const all = ['c18', 'cTerms', 'cKvkk', 'cCookie'].every(i => $(i).checked);
  $('gateGo').disabled = !(v && age >= 18 && age < 110 && all);
}
['birth', 'c18', 'cTerms', 'cKvkk', 'cCookie'].forEach(i => $(i).addEventListener('input', gateCheck));
$('gateGo').onclick = async () => {
  if (ageOf($('birth').value) < 18) { store.set('tk_u18', '1'); return show('s-minor'); }
  $('gateGo').disabled = true;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { const { error } = await sb.auth.signInAnonymously(); if (error) throw error; }
    await rpc('start_profile', { p_birth: $('birth').value, p_consent: CONSENT_VERSION });
    await route();
  } catch (e) {
    if (errCode(e) === 'UNDER_18') { store.set('tk_u18', '1'); try { await rpc('delete_me'); } catch {} await sb.auth.signOut(); return show('s-minor'); }
    $('gateErr').hidden = false; $('gateErr').textContent = errMsg(e); $('gateGo').disabled = false;
  }
};

// ---------- Profil ----------
let pickedGender = null;
function renderProfile() {
  const p = ST.profile;
  $('myRange').textContent = p.age_range + ' (doğum tarihinden otomatik belirlendi)';
  $('nickAv').innerHTML = av(p.nick); $('nickTxt').textContent = p.nick;
  $('reroll').textContent = p.rerolls_left ? `Başka rumuz ver (${p.rerolls_left} hak)` : 'Rumuz değiştirme hakkın bitti';
  $('reroll').disabled = !p.rerolls_left;
  if (!profTags) profTags = new Set(p.interests || []);
  renderTagPicker($('profTags'), profTags);
}
let profTags = null;
function renderTagPicker(box, set) {
  box.innerHTML = TAGS.map(t => `<button type="button" class="chip" aria-pressed="${set.has(t)}" data-t="${esc(t)}" ${!set.has(t) && set.size >= MAX_TAGS ? 'disabled' : ''}>${esc(t)}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t; set.has(t) ? set.delete(t) : set.size < MAX_TAGS && set.add(t); renderTagPicker(box, set); };
}
const tagLine = arr => arr && arr.length ? arr.join(' · ') : '';
$('reroll').onclick = async () => { try { ST = await rpc('reroll_nick'); renderProfile(); } catch (e) { info('Olmadı', errMsg(e)); } };
function seg(el, cb) { el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); cb(b.dataset.v); }); }
seg($('myGender'), v => { pickedGender = v; $('profGo').disabled = false; });
$('profGo').onclick = () => sheet(`<h3>${gName(pickedGender)} olarak devam edilsin mi?</h3><p>Cinsiyet seçimin sonradan değiştirilemez.</p>`,
  [['Evet, devam et', async () => { closeSheet(); try { await rpc('set_interests', { p_tags: [...(profTags || [])] }); ST = await rpc('set_gender', { p_gender: pickedGender }); route(); } catch (e) { info('Olmadı', errMsg(e)); } }, 'btn'], ['Vazgeç', closeSheet]]);

// ---------- Arama ----------
let savedR = null; try { savedR = JSON.parse(store.get('tk_wr') || 'null'); } catch {}
const want = { g: ['K', 'E', '*'].includes(store.get('tk_wg')) ? store.get('tk_wg') : '*', r: new Set((Array.isArray(savedR) && savedR.length ? savedR : RANGES).filter(r => RANGES.includes(r))) };
$('wantGender').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === want.g));
seg($('wantGender'), v => { want.g = v; store.set('tk_wg', v); });
function renderSearch() {
  const p = ST.profile;
  $('meAv').innerHTML = av(p.nick); $('meNick').textContent = p.nick; $('meMeta').textContent = `${gName(p.gender)} · ${p.age_range}`;
  $('wantRange').innerHTML = RANGES.map(r => `<button class="chip" aria-pressed="${want.r.has(r)}" data-r="${r}">${r}</button>`).join('');
  $('searchGo').disabled = !want.r.size;
  $('daily').textContent = `Bugün kalan eşleşme hakkın: ${p.matches_left} / ${DAILY}`;
  $('myTags').textContent = tagLine(p.interests) || 'Henüz seçmedin. Ortak ilgi alanı olanlarla öncelikli eşleşirsin.';
  renderFriend();
}
$('editTags').onclick = () => {
  const set = new Set(ST.profile.interests || []);
  sheet(`<h3>İlgi alanların</h3><p class="muted small">En fazla ${MAX_TAGS} tane seç. Ortak ilgi alanı olanlarla öncelikli eşleşirsin.</p><div class="chips" id="tagEdit"></div>`,
    [['Kaydet', async () => { try { ST = await rpc('set_interests', { p_tags: [...set] }); closeSheet(); renderSearch(); } catch (e) { info('Olmadı', errMsg(e)); } }, 'btn'], ['Vazgeç', closeSheet]],
    () => renderTagPicker($('tagEdit'), set));
};
$('wantRange').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; const r = b.dataset.r; want.r.has(r) ? want.r.delete(r) : want.r.add(r); store.set('tk_wr', JSON.stringify([...want.r])); renderSearch(); });
function renderFriend() {
  const box = $('friendBox'), p = ST.profile;
  if (ST.friend) {
    box.innerHTML = `<div style="display:flex;gap:10px;align-items:center">${av(ST.friend.nick, 40)}<div><b>${esc(ST.friend.nick)}</b><div class="small muted">${seenText(ST.friend.last_seen, false)}</div></div></div><div class="row"><button class="btn" id="fChat">Sohbet et</button><button class="ghost" id="rmFriend">Çıkar</button></div>`;
    $('fChat').onclick = async () => { try { const id = await rpc('open_friend_chat'); enterChat(id); } catch (e) { info('Olmadı', errMsg(e)); } };
    $('rmFriend').onclick = () => sheet(`<h3>Arkadaşlıktan çıkarılsın mı?</h3><p>${esc(ST.friend.nick)} arkadaş listenden çıkar. Yeni bir arkadaş ekleyebilmek için <b>${COOLDOWN_H} saat</b> beklemen gerekir.</p>`,
      [['Evet, çıkar', async () => { closeSheet(); try { ST = await rpc('remove_friend'); renderSearch(); } catch (e) { info('Olmadı', errMsg(e)); } }, 'btn'], ['Vazgeç', closeSheet]]);
  } else if (p.friend_cooldown_until) {
    box.innerHTML = `<div><b>Arkadaş hakkın beklemede</b><div class="small muted">Yeni arkadaş ekleyebilirsin: ${esc(new Date(p.friend_cooldown_until).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }))}</div></div>`;
  } else box.innerHTML = `<div><b>Arkadaş hakkın: 1</b><div class="small muted">Sohbet ettiğin biriyle karşılıklı onayla arkadaş olabilirsin.</div></div>`;
}
let waitTimer = null;
$('searchGo').onclick = () => {
  if (ST.profile.matches_left <= 0) return info('Bugünkü eşleşme hakların bitti', ERR.DAILY_LIMIT);
  startWaiting();
};
function startWaiting() {
  $('waitAv').innerHTML = av(ST.profile.nick);
  $('waitTxt').textContent = `${want.g === '*' ? 'Kadın veya erkek' : gName(want.g)}, ${[...want.r].join(', ')} yaş`;
  show('s-wait');
  const started = Date.now();
  clearInterval(window.__waitClock);
  window.__waitClock = setInterval(() => {
    if (!$('s-wait').classList.contains('on')) return clearInterval(window.__waitClock);
    const s = Math.floor((Date.now() - started) / 1000);
    $('waitClock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('waitHint').hidden = s < 45;
  }, 1000);
  $('waitClock').textContent = '0:00'; $('waitHint').hidden = true;
  const tick = async () => {
    try {
      const id = await rpc('find_match', { p_want_gender: want.g, p_want_ranges: [...want.r] });
      if (id) { waitTimer = null; clearInterval(window.__waitClock); ding('match'); bumpUnread(); return enterChat(id); }
    } catch (e) { waitTimer = null; await refresh().catch(() => {}); renderSearch(); show('s-search'); return info('Arama durdu', errMsg(e)); }
    if (waitTimer !== null) waitTimer = setTimeout(tick, 3000);
  };
  waitTimer = 0; tick();
}
$('cancelWait').onclick = async () => { clearTimeout(waitTimer); waitTimer = null; await rpc('leave_queue').catch(() => {}); await refresh(); renderSearch(); show('s-search'); };

// ---------- Sohbet ----------
let CH = null; // { id, channel, lastId, seen:Set, poll, voicePaths:[] }
let qPicked = [], answeringQ = null;
async function enterChat(id) {
  if (CH && CH.id !== id) leaveChatLocal();
  if (!CH) {
    CH = { id, lastId: 0, seen: new Set(), voicePaths: [], answered: new Set(), ended: false };
    $('msgs').innerHTML = '';
    CH.channel = sb.channel('chat-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}` }, p => addMsg(p.new))
      .on('broadcast', { event: 'typing' }, p => { if (p.payload && p.payload.u !== ME) showTyping(); })
      .on('broadcast', { event: 'read' }, p => { if (CH && p.payload && p.payload.u !== ME) { CH.theirRead = Math.max(CH.theirRead || 0, p.payload.upto || 0); updTicks(); } })
      .on('presence', { event: 'sync' }, () => { if (!CH) return; const st = CH.channel.presenceState(); CH.online = Object.values(st).flat().some(x => x.u && x.u !== ME); if (ST && ST.chat) renderChat(); })
      .subscribe(s => { if (s === 'SUBSCRIBED' && CH) { try { CH.channel.track({ u: ME }); } catch {} } });
    CH.poll = setInterval(pollChat, 4000);
  }
  await refresh();
  if (!ST.chat || ST.chat.id !== id) return chatEnded();
  await fetchMsgs();
  CH.loaded = true;
  renderChat();
  markRead();
}
let readTimer = null;
function markRead() {
  if (!CH || document.hidden || !CH.lastPartnerId || CH.lastPartnerId <= (CH.sentRead || 0)) return;
  clearTimeout(readTimer);
  readTimer = setTimeout(() => {
    if (!CH) return; const upto = CH.lastPartnerId; CH.sentRead = upto;
    sb.rpc('mark_read', { p_chat: CH.id, p_upto: upto });
    try { CH.channel.send({ type: 'broadcast', event: 'read', payload: { u: ME, upto } }); } catch {}
  }, 400);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) markRead(); });
function updTicks() {
  if (!CH) return;
  document.querySelectorAll('#msgs .m.me[data-id]').forEach(el => { const r = +el.dataset.id <= (CH.theirRead || 0); const tk = el.querySelector('.tick'); if (tk) { tk.textContent = r ? '✓✓' : '✓'; tk.classList.toggle('read', r); tk.title = r ? 'Okundu' : 'Gönderildi'; } });
}
const isRecent = iso => iso && Date.now() - new Date(iso).getTime() < 70000;
function seenText(iso, live) {
  if (live || isRecent(iso)) return 'Çevrimiçi';
  if (!iso) return 'Son görülme bilinmiyor';
  const d = new Date(iso), today = new Date().toDateString() === d.toDateString();
  return 'Son görülme ' + (today ? hhmm(iso) : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + hhmm(iso));
}
function leaveChatLocal() { if (!CH) return; clearInterval(CH.poll); sb.removeChannel(CH.channel); CH = null; answeringQ = null; }
async function fetchMsgs() {
  const { data } = await sb.from('messages').select('*').eq('chat_id', CH.id).gt('id', CH.lastId).order('id');
  (data || []).forEach(addMsg);
}
async function pollChat() {
  if (!CH) return;
  try { await refresh(); if (!ST.chat || ST.chat.id !== CH.id) return chatEnded(); await fetchMsgs(); renderChat(); } catch {}
}
function renderChat() {
  const c = ST.chat, p = c.partner;
  if (!c.is_friend_chat && !c.my_questions) {
    $('pAv').innerHTML = av(p.nick); $('pNick').textContent = p.nick; $('pMeta').textContent = `${gName(p.gender)} · ${p.age_range}`;
    $('pTags').textContent = c.common && c.common.length ? 'Ortak ilgi alanlarınız: ' + tagLine(c.common) : (p.interests && p.interests.length ? 'İlgi alanları: ' + tagLine(p.interests) : '');
    if (!$('qlist').children.length) {
      qPicked = [];
      qTab = 0;
      $('qlist').innerHTML = QS.map((q, i) => `<button class="q" aria-pressed="false" data-i="${i}">${esc(q)}</button>`).join('');
      updQ();
    }
    if (!$('s-qs').classList.contains('on')) show('s-qs');
    return;
  }
  $('qlist').innerHTML = '';
  if (CH) CH.meta = { id: CH.id, nick: p.nick, friendChat: c.is_friend_chat, isFriend: c.is_friend };
  $('cAv').innerHTML = av(p.nick); $('cNick').textContent = p.nick;
  $('cMeta').textContent = (c.is_friend_chat ? 'Arkadaşın' : `${gName(p.gender)} · ${p.age_range}`) + ' · ' + seenText(p.last_seen, CH && CH.online);
  $('cMeta').classList.toggle('online', !!(CH && CH.online) || isRecent(p.last_seen));
  $('cTags').textContent = c.common && c.common.length ? 'Ortak ilgi: ' + tagLine(c.common) : (p.interests && p.interests.length ? 'İlgi alanları: ' + tagLine(p.interests) : '');
  if (CH) { CH.theirRead = Math.max(CH.theirRead || 0, c.their_read || 0); updTicks(); }
  const open = c.is_friend_chat || c.their_submitted;
  $('msgIn').disabled = $('sendBtn').disabled = !open;
  $('msgIn').placeholder = open ? 'Mesaj yaz…' : 'Karşı tarafın sorularını seçmesi bekleniyor…';
  $('tFriend').textContent = c.is_friend ? 'Arkadaşsınız' : c.friend_out ? 'İstek gönderildi' : 'Arkadaş ekle';
  $('tFriend').disabled = c.is_friend || c.friend_out;
  $('banner').innerHTML = c.friend_in && !c.is_friend
    ? `<div class="banner"><span><b>${esc(p.nick)}</b> seni arkadaş olarak eklemek istiyor. Sadece 1 arkadaş hakkın var.</span><div class="row"><button class="btn" id="fAcc">Kabul et</button><button class="ghost" id="fDec">Reddet</button></div></div>` : '';
  if ($('fAcc')) {
    $('fAcc').onclick = () => act('respond_friend', { p_chat: CH.id, p_accept: true });
    $('fDec').onclick = () => act('respond_friend', { p_chat: CH.id, p_accept: false });
  }
  const vb = $('voiceBtn'), active = c.voice_me && c.voice_them && c.voice_unlocked, n = Math.min(c.msg_count, VOICE_MSGS);
  $('voiceRing').setAttribute('stroke-dasharray', `${c.voice_unlocked ? 100 : n / VOICE_MSGS * 100} 100`);
  vb.classList.toggle('on', active); vb.classList.toggle('locked', !c.voice_unlocked);
  vb.title = active ? 'Sesli mesaj gönder' : c.voice_unlocked ? 'Sesli mesaj: izin gerekli' : `Sesli mesaj kilidi: ${n} / ${VOICE_MSGS} mesaj`;
  vb.setAttribute('aria-label', vb.title);
  if (!$('s-chat').classList.contains('on')) show('s-chat');
}
async function act(fn, args) { try { await rpc(fn, args); await refresh(); if (ST.chat) renderChat(); } catch (e) { info('Olmadı', errMsg(e)); } }

function addMsg(m) {
  if (!CH || m.chat_id !== CH.id || CH.seen.has(m.id)) return;
  CH.seen.add(m.id); CH.lastId = Math.max(CH.lastId, m.id);
  const mine = m.sender === ME, nick = ST?.chat?.partner?.nick || 'Karşı taraf';
  if (m.kind === 'event') {
    const t = { matched: `${nick} ile eşleştin. Saygılı ol, kurallara uy.`, friend_chat: 'Arkadaş sohbeti açıldı.',
      friend_request: mine ? 'Arkadaşlık isteği gönderdin.' : `${nick} arkadaşlık isteği gönderdi.`,
      friend_accepted: 'Artık arkadaşsınız.', friend_declined: mine ? 'Arkadaşlık isteğini reddettin.' : 'Arkadaşlık isteğin kabul edilmedi.',
      voice_on: mine ? 'Sesli mesaja izin verdin.' : `${nick} sesli mesaja izin verdi.`, voice_off: mine ? 'Sesli mesaj iznini geri aldın.' : `${nick} sesli mesaj iznini geri aldı.` }[m.body];
    if (t) sys(t);
    if (m.body === 'ended') { if (!mine) chatEnded(); return; }
    pollChat();
    return;
  }
  const d = document.createElement('div'); d.className = 'm ' + (mine ? 'me' : 'them');
  if (m.kind === 'question') {
    const s = document.createElement('small'); s.textContent = mine ? 'Senin sorun' : 'Onun sorusu'; d.append(s, document.createTextNode(QS[m.q] || ''));
    if (!mine) { const b = document.createElement('button'); b.className = 'ans'; b.textContent = 'Cevapla'; b.dataset.q = m.q; b.onclick = () => startAnswer(m.q); d.append(document.createElement('br'), b); }
  } else if (m.kind === 'answer') {
    const s = document.createElement('small'); s.textContent = 'Cevap: ' + (QS[m.q] || ''); d.append(s, document.createTextNode(m.body));
    if (mine) { CH.answered.add(m.q); document.querySelectorAll(`.ans[data-q="${m.q}"]`).forEach(b => b.remove()); }
  } else if (m.kind === 'voice') {
    d.classList.add('voice'); d.textContent = 'Sesli mesaj yükleniyor…'; CH.voicePaths.push(m.voice_path);
    sb.storage.from('voice').createSignedUrl(m.voice_path, 3600).then(({ data }) => {
      d.textContent = '';
      if (!data) { d.textContent = 'Sesli mesaj açılamadı'; return; }
      const a = document.createElement('audio'); a.controls = true; a.preload = 'none'; a.src = data.signedUrl;
      a.setAttribute('controlsList', 'nodownload noplaybackrate'); a.oncontextmenu = e => e.preventDefault();
      d.append(a, document.createTextNode(` 0:${String(m.voice_sec).padStart(2, '0')}`));
    });
  } else d.textContent = m.body;
  const tm = document.createElement('span'); tm.className = 't'; tm.textContent = hhmm(m.created_at); d.append(tm);
  if (mine) { d.dataset.id = m.id; const tk = document.createElement('span'); tk.className = 'tick'; tm.append(' ', tk); }
  if (!mine) { CH.lastPartnerId = Math.max(CH.lastPartnerId || 0, m.id); $('typing').hidden = true; if (CH.loaded) { ding('msg'); bumpUnread(); markRead(); } }
  $('msgs').append(d); $('msgs').scrollTop = 1e9;
  if (mine) updTicks();
}
let typingTimer = null, lastTypingSent = 0;
function showTyping() {
  const el = $('typing'); el.textContent = `${ST?.chat?.partner?.nick || 'Karşı taraf'} yazıyor…`; el.hidden = false;
  clearTimeout(typingTimer); typingTimer = setTimeout(() => { el.hidden = true; }, 3500);
}
$('msgIn').addEventListener('input', () => {
  if (!CH || !CH.channel || Date.now() - lastTypingSent < 2000) return;
  lastTypingSent = Date.now();
  try { CH.channel.send({ type: 'broadcast', event: 'typing', payload: { u: ME } }); } catch {}
});
const hhmm = iso => { const d = iso ? new Date(iso) : new Date(); return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); };
const sys = t => { const d = document.createElement('div'); d.className = 'm sys'; d.textContent = t; $('msgs').append(d); $('msgs').scrollTop = 1e9; };

function startAnswer(q) {
  if (CH.answered.has(q)) return;
  answeringQ = q; $('answering').hidden = false; $('answeringTxt').textContent = 'Cevaplıyorsun: ' + QS[q]; $('msgIn').focus();
}
$('answerCancel').onclick = () => { answeringQ = null; $('answering').hidden = true; };
$('sendForm').onsubmit = async e => {
  e.preventDefault();
  const v = $('msgIn').value.trim(); if (!v || !CH) return;
  $('sendBtn').disabled = true;
  try {
    const r = await rpc('send_message', { p_chat: CH.id, p_body: v, p_answer_to: answeringQ });
    $('msgIn').value = ''; answeringQ = null; $('answering').hidden = true;
    await fetchMsgs();
    if (r && r.filtered) sys('Kişisel bilgi veya bağlantı içerdiği için mesajının bir kısmı gizlendi.');
    await refresh(); if (ST.chat) renderChat();
  } catch (err) { info('Gönderilemedi', errMsg(err)); }
  $('sendBtn').disabled = false;
};

// Açılış soruları
function updQ() {
  $('qCount').textContent = `${qPicked.length} / 3 seçildi`; $('qGo').disabled = !qPicked.length;
  $('qGo').textContent = qPicked.length ? `Soruları gönder (${qPicked.length})` : 'Soruları gönder';
  document.querySelectorAll('#qlist .q').forEach(b => { const i = +b.dataset.i, on = qPicked.includes(i); b.setAttribute('aria-pressed', on); b.disabled = !on && qPicked.length >= 3; b.hidden = !Q_CATS[qTab][1].includes(i); });
  $('qTabs').innerHTML = Q_CATS.map((c, k) => { const n = qPicked.filter(i => c[1].includes(i)).length; return `<button type="button" role="tab" aria-selected="${k === qTab}" data-k="${k}">${c[0]}${n ? ` <b>${n}</b>` : ''}</button>`; }).join('');
}
// Soru kategorileri: liste kısa kalsın diye sekmelere ayrıldı
const Q_CATS = [['Gündelik', [0, 1, 2, 3, 5, 8, 9, 12]], ['Eğlenceli', [4, 6, 7, 10, 11, 13, 14, 15]], ['Romantik', [16, 17, 18, 19, 20, 21]]];
let qTab = 0;
$('qTabs').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; qTab = +b.dataset.k; updQ(); });
$('qRandom').onclick = () => { const all = QS.map((_, i) => i); qPicked = []; while (qPicked.length < 3) { const i = all.splice(Math.floor(Math.random() * all.length), 1)[0]; qPicked.push(i); } updQ(); };
$('qlist').addEventListener('click', e => { const b = e.target.closest('.q'); if (!b) return; const i = +b.dataset.i; qPicked = qPicked.includes(i) ? qPicked.filter(x => x !== i) : [...qPicked, i]; updQ(); });
$('qGo').onclick = async () => { $('qGo').disabled = true; try { await rpc('submit_questions', { p_chat: CH.id, p_qs: qPicked }); await fetchMsgs(); await refresh(); renderChat(); } catch (e) { info('Olmadı', errMsg(e)); updQ(); } };

// Araçlar
$('tFriend').onclick = () => sheet(`<h3>${esc(ST.chat.partner.nick)} arkadaş olarak eklensin mi?</h3><p>Sadece <b>1 arkadaş</b> hakkın var. Karşı taraf da kabul ederse arkadaş olursunuz.</p>`,
  [['İstek gönder', () => { closeSheet(); act('request_friend', { p_chat: CH.id }); }, 'btn'], ['Vazgeç', closeSheet]]);
$('tReport').onclick = () => {
  let reason = null;
  sheet(`<h3>Şikayet et</h3><p class="muted small">Şikayetler incelenir. Bu sohbetin kaydı inceleme için saklanır ve kişi engellenir.</p><div class="qlist" id="rs">${REASONS.map(r => `<button class="q" aria-pressed="false" data-r="${r[0]}">${r[1]}</button>`).join('')}</div>`,
    [['Şikayeti gönder', async () => {
      if (!reason) return;
      try { await rpc('report_user', { p_chat: CH.id, p_reason: reason }); closeSheet(); finishChat('Şikayetin alındı ve kişi engellendi. Teşekkürler.'); } catch (e) { info('Olmadı', errMsg(e)); }
    }, 'btn'], ['Vazgeç', closeSheet]],
    () => { $('rs').onclick = e => { const b = e.target.closest('.q'); if (!b) return; reason = b.dataset.r; document.querySelectorAll('#rs .q').forEach(x => x.setAttribute('aria-pressed', x === b)); }; });
};
$('tBlock').onclick = () => sheet(`<h3>${esc(ST.chat.partner.nick)} engellensin mi?</h3><p>Bir daha karşına çıkmaz ve sohbet sona erer.</p>`,
  [['Engelle', async () => { closeSheet(); await removeVoices(); try { await rpc('block_user', { p_chat: CH.id }); finishChat('Kişi engellendi.'); } catch (e) { info('Olmadı', errMsg(e)); } }, 'btn'], ['Vazgeç', closeSheet]]);
const askEnd = () => sheet(`<h3>Sohbet bitirilsin mi?</h3><p>Mesajlar silinir.${ST.chat?.is_friend ? ' Arkadaşın olduğu için ona ana ekrandan tekrar ulaşabilirsin.' : ''}</p>`,
  [['Bitir', async () => { closeSheet(); await removeVoices(); try { await rpc('end_chat', { p_chat: CH.id }); finishChat('Sohbet sona erdi.', true); } catch (e) { info('Olmadı', errMsg(e)); } }, 'btn'], ['Vazgeç', closeSheet]]);
$('tEnd').onclick = askEnd; $('qEnd').onclick = askEnd;
async function removeVoices() { if (CH && CH.voicePaths.length) await sb.storage.from('voice').remove(CH.voicePaths).catch(() => {}); }
async function finishChat(note, ask) {
  const past = CH && CH.meta ? CH.meta : null;
  if (CH) CH.ended = true; leaveChatLocal(); await refresh(); renderSearch(); show('s-search');
  if (ask && past && !past.friendChat && !past.isFriend && !ST.friend && !ST.profile.friend_cooldown_until) return askLike(past, note);
  info(note, 'Yeni bir eşleşme arayabilirsin.');
}
const likedNicks = new Set();
function askLike(past, title) {
  sheet(`<h3>${esc(title)}</h3><p><b>${esc(past.nick)}</b> ile tekrar konuşmak ister misin?</p><p class="muted small">İkiniz de "Evet" derseniz arkadaş olursunuz ve tek arkadaş hakkınız kullanılır. Karşı taraf, sen "Hayır" dersen bunu görmez.</p>`,
    [['Evet, isterim', async () => {
      closeSheet();
      try {
        const r = await rpc('like_partner', { p_chat: past.id, p_like: true });
        if (r.friends) { ding('match'); await refresh(); renderSearch(); return info('Karşılıklı!', `${past.nick} de seninle konuşmak istiyordu. Artık arkadaşsınız.`); }
        if (r.mutual) return info('Karşılıklı ama…', 'İkiniz de istediniz, ancak birinizin arkadaş hakkı şu an dolu.');
        likedNicks.add(past.nick);
        info('Cevabın kaydedildi', `${past.nick} de isterse arkadaş olacaksınız; sana haber vereceğiz.`);
      } catch (e) { info('Olmadı', errMsg(e)); }
    }, 'btn'], ['Hayır', () => { closeSheet(); rpc('like_partner', { p_chat: past.id, p_like: false }).catch(() => {}); }]]);
}
async function homePoll() {
  if (!ST || !ST.profile || !$('s-search').classList.contains('on') || document.hidden) return;
  const hadFriend = ST.friend && ST.friend.nick;
  try { await refresh(); } catch { return; }
  if (ST.chat) { ding('match'); bumpUnread(); return enterChat(ST.chat.id); }
  renderSearch();
  if (!hadFriend && ST.friend && likedNicks.has(ST.friend.nick)) { likedNicks.delete(ST.friend.nick); ding('match'); bumpUnread(); info('Karşılıklı!', `${ST.friend.nick} de seninle tekrar konuşmak istedi. Artık arkadaşsınız.`); }
}
async function chatEnded() {
  if (!CH || CH.ended) return; CH.ended = true;
  const past = CH.meta || null;
  leaveChatLocal(); await refresh().catch(() => {}); renderSearch(); show('s-search');
  if (past && !past.friendChat && !past.isFriend && !ST.friend && !ST.profile.friend_cooldown_until) return askLike(past, `${past.nick} sohbetten ayrıldı`);
  info('Sohbet sona erdi', past ? `${past.nick} sohbetten ayrıldı.` : 'Karşı taraf sohbetten ayrıldı.');
}

// ---------- Sesli mesaj ----------
let rec = null;
$('voiceBtn').onclick = () => {
  const c = ST.chat;
  if (!c.voice_unlocked) return sheet(`<h3>Sesli mesaj henüz kilitli</h3><p>Sesli mesaj, birbirinizi biraz tanıdıktan sonra açılır: açılış sorularından sonra sohbette <b>${VOICE_MSGS} mesaj</b> geçmesi ya da <b>arkadaş olmanız</b> yeterli.</p><p class="muted">Şu an: ${Math.min(c.msg_count, VOICE_MSGS)} / ${VOICE_MSGS} mesaj</p>`, [['Tamam', closeSheet, 'btn']]);
  if (!c.voice_me) return sheet(`<h3>Sesli mesaja izin ver</h3><p>Sesin, seni tanıtan bir özelliktir. İkiniz de izin verirseniz en fazla <b>${VOICE_MAX} saniyelik</b> sesli mesaj gönderebilirsiniz.</p><ul><li>Sesli mesajlar sohbet bitince silinir; şikayet edilenler inceleme için saklanır.</li><li>İznini istediğin zaman geri alabilirsin.</li></ul>`,
    [['İzin veriyorum', () => { closeSheet(); act('set_voice_consent', { p_chat: CH.id, p_on: true }); }, 'btn'], ['Vazgeç', closeSheet]]);
  if (!c.voice_them) return sheet(`<h3>Onay bekleniyor</h3><p>${esc(c.partner.nick)} henüz sesli mesaja izin vermedi.</p>`,
    [['Tamam', closeSheet, 'btn'], ['İznimi geri al', () => { closeSheet(); act('set_voice_consent', { p_chat: CH.id, p_on: false }); }]]);
  openRecorder();
};
function pickMime() { for (const t of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']) if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t; return ''; }
function openRecorder() {
  sheet(`<h3>Sesli mesaj</h3><div class="rec"><b id="recT">0:00</b><span class="muted small" id="recS">Kayda başlamak için dokun (en fazla ${VOICE_MAX} sn)</span></div>`,
    [['Kayda başla', toggleRec, 'btn'], ['İznimi geri al', () => { stopRec(true); closeSheet(); act('set_voice_consent', { p_chat: CH.id, p_on: false }); }], ['Vazgeç', () => { stopRec(true); closeSheet(); }]]);
}
async function toggleRec() {
  const btn = $('sheet').querySelector('[data-a="0"]');
  if (rec) { stopRec(false); return; }
  const mime = pickMime();
  if (!mime) return info('Desteklenmiyor', 'Bu tarayıcı ses kaydını desteklemiyor.');
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); } catch { return info('Mikrofon izni gerekli', 'Tarayıcı ayarlarından bu siteye mikrofon izni ver.'); }
  const chunks = [], mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 96000 });
  rec = { mr, stream, start: Date.now(), cancel: false };
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); const r = rec; rec = null; clearInterval(r.timer); if (!r.cancel) uploadVoice(new Blob(chunks, { type: mime.split(';')[0] }), Math.max(1, Math.round((Date.now() - r.start) / 1000))); };
  mr.start();
  rec.timer = setInterval(() => { const s = Math.floor((Date.now() - rec.start) / 1000); const t = $('recT'); if (t) t.textContent = `0:${String(s).padStart(2, '0')}`; if (s >= VOICE_MAX) stopRec(false); }, 250);
  btn.textContent = 'Bitir ve gönder'; $('recS').innerHTML = '<span class="dot" style="display:inline-block"></span> Kaydediliyor';
}
function stopRec(cancel) { if (!rec) return; rec.cancel = cancel; rec.mr.stop(); }
async function uploadVoice(blob, sec) {
  closeSheet();
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${CH.id}/${ME}/${crypto.randomUUID()}.${ext}`;
  try {
    const { error } = await sb.storage.from('voice').upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
    await rpc('send_voice', { p_chat: CH.id, p_path: path, p_sec: Math.min(sec, VOICE_MAX) });
    await fetchMsgs();
  } catch (e) { info('Sesli mesaj gönderilemedi', errMsg(e)); }
}

// ---------- Verilerimi sil ----------
$('deleteMe').onclick = () => sheet(`<h3>Tüm verilerin silinsin mi?</h3><p>Rumuzun, arkadaşın, sohbetlerin ve tercihlerin kalıcı olarak silinir. Bu işlem geri alınamaz.</p>`,
  [['Evet, kalıcı olarak sil', async () => { closeSheet(); try { await removeVoices(); leaveChatLocal(); await rpc('delete_me'); await sb.auth.signOut(); show('s-gate'); info('Verilerin silindi', ''); $('deleteMe').hidden = true; } catch (e) { info('Olmadı', errMsg(e)); } }, 'btn'], ['Vazgeç', closeSheet]]);

// ---------- Hukuki metinler ----------
const DOCS = {
  kvkk: `<h3>KVKK Aydınlatma Metni</h3><p class="draft">Taslaktır. Yayından önce bir hukukçuya kontrol ettirilmelidir.</p>
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi uyarınca, kişisel verilerinizin işlenmesine ilişkin sizi bilgilendirmek isteriz.</p>
<h4>1. Veri sorumlusu</h4><p>Tek Kalbim platformu; veri sorumlusunun adı/unvanı, adresi ve iletişim bilgileri yayından önce buraya eklenecektir.</p>
<h4>2. İşlenen kişisel veriler</h4><ul><li>Beyan ettiğiniz cinsiyet ve yaş aralığı (doğum tarihi saklanmaz)</li><li>Size atanan rumuz ve oturum tanımlayıcısı</li><li>Yazılı mesajlar ve karşılıklı izinle gönderilen sesli mesajlar, şikayet ve engelleme kayıtları</li><li>IP adresi, bağlantı tarih-saat bilgileri, tarayıcı/cihaz bilgisi</li></ul>
<h4>3. İşleme amaçları</h4><ul><li>Eşleştirme ve sohbet hizmetinin sunulması</li><li>18 yaş sınırı ve kullanım kurallarının uygulanması</li><li>Şikayetlerin incelenmesi, kötüye kullanımın önlenmesi</li><li>5651 sayılı Kanun başta olmak üzere mevzuattan doğan yükümlülüklerin yerine getirilmesi</li></ul>
<h4>4. Hukuki sebepler</h4><p>KVKK m.5/2 kapsamında; sözleşmenin kurulması ve ifası (c), hukuki yükümlülüğün yerine getirilmesi (ç) ve temel hak ve özgürlüklerinize zarar vermemek kaydıyla meşru menfaat (f).</p>
<h4>5. Aktarım</h4><p>Verileriniz, talep halinde yetkili kamu kurum ve kuruluşlarına ve hizmetin barındırıldığı altyapı sağlayıcılarına mevzuata uygun şekilde aktarılabilir. Hizmet altyapısı yurt dışında bulunduğundan aktarım KVKK m.9 hükümlerine uygun olarak yapılır.</p>
<h4>6. Toplama yöntemi</h4><p>Veriler, site üzerinden elektronik ortamda, sizin beyanınız ve sistem kayıtları yoluyla otomatik olarak toplanır.</p>
<h4>7. Saklama süresi</h4><p>Yazılı ve sesli mesajlar sohbet bitiminde silinir; şikayete konu sohbetler inceleme süresince saklanır. Trafik bilgileri mevzuatta öngörülen süre boyunca saklanır. Kesin süreler yayından önce eklenecektir.</p>
<h4>8. Haklarınız (KVKK m.11)</h4><ul><li>Verilerinizin işlenip işlenmediğini öğrenme ve bilgi talep etme</li><li>İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</li><li>Aktarıldığı üçüncü kişileri bilme</li><li>Eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini isteme</li><li>Otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme</li><li>Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme</li></ul>
<p>Verilerinizi sitenin altındaki "Verilerimi sil" bağlantısıyla dilediğiniz an silebilirsiniz. Diğer başvurularınızı yayından önce belirtilecek e-posta adresine iletebilirsiniz.</p>`,
  terms: `<h3>Kullanım Koşulları</h3><p class="draft">Taslaktır.</p><ul><li>Site yalnızca 18 yaş ve üzeri kişiler içindir. Yaşını yanlış beyan eden kullanıcılar kalıcı olarak engellenir.</li><li>Taciz, tehdit, hakaret, nefret söylemi ve müstehcen içerik yasaktır.</li><li>Telefon, adres, sosyal medya hesabı gibi kişisel bilgiler istenemez ve paylaşılamaz.</li><li>Para isteme, reklam, dolandırıcılık ve başka sitelere yönlendirme yasaktır.</li><li>Her kullanıcının günde ${DAILY} eşleşme hakkı vardır.</li><li>Her kullanıcının aynı anda yalnızca 1 arkadaşı olabilir; arkadaşlıktan çıkardıktan sonra yeni arkadaş eklemek için ${COOLDOWN_H} saat beklenir.</li><li>Sesli mesaj, açılış soruları hariç sohbette ${VOICE_MSGS} mesaj geçtikten ya da arkadaş olduktan sonra ve iki tarafın da izniyle açılır; en fazla ${VOICE_MAX} saniyedir. Sesli mesajların kaydedilmesi ve paylaşılması yasaktır.</li><li>Farklı kişilerden kısa sürede birden fazla şikayet alan veya 18 yaşından küçük olduğundan şüphelenilen kullanıcılar inceleme süresince askıya alınır.</li><li>Kurallara uymayanlar uyarılmadan engellenebilir; suç teşkil eden durumlar yetkili makamlara bildirilir.</li></ul>`,
  cookie: `<h3>Oturum bilgisi</h3><p>Hesap açmadan kullandığın için, rumuzunu, arkadaşını ve engellediğin kişileri hatırlayabilmemiz adına tarayıcında zorunlu bir oturum bilgisi tutulur. Reklam veya takip amaçlı çerez kullanılmaz.</p><p class="muted small">Tarayıcı verilerini silersen ya da başka bir cihazdan girersen rumuzun ve arkadaşın kaybolur.</p>`
};
document.addEventListener('click', e => { const b = e.target.closest('[data-doc]'); if (!b) return; e.preventDefault(); sheet(DOCS[b.dataset.doc], [['Kapat', closeSheet, 'btn']]); });

// ---------- Başlat ----------
if (!configured) show('s-setup'); else route().catch(e => info('Bağlantı sorunu', errMsg(e)));

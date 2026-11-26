// Tek Kalbim — yönetim paneli
const { createClient } = window.supabase;

const CFG = window.TK_CONFIG || {};
// Kullanıcı oturumundan ayrı tutulur: aynı tarayıcıda siteye kullanıcı olarak girmek yönetici oturumunu bozmaz
const sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { storageKey: 'tk-admin', persistSession: true, detectSessionInUrl: true } });
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = iso => iso ? new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';
const REASONS = { taciz: 'Taciz / rahatsız edici', mustehcen: 'Müstehcen içerik', '18_alti': '18 yaş altı şüphesi', kisisel_bilgi: 'Kişisel bilgi', dolandiricilik: 'Para / dolandırıcılık', nefret: 'Nefret / hakaret', diger: 'Diğer' };
const QS = ['Bugün günün nasıl geçti?', 'Şu an ne dinliyorsun?', 'En son izlediğin dizi ya da film?', 'Çay mı kahve mi?', 'Hayalindeki tatil yeri neresi?', 'Sabah insanı mısın, gece kuşu mu?', 'Seni en çok ne güldürür?', 'Bir süper gücün olsa ne olurdu?', 'Hafta sonunu nasıl geçirmeyi seversin?', 'Okuduğun son kitap hangisi?', 'Deniz mi dağ mı?', 'Burada ne arıyorsun: sohbet mi arkadaşlık mı?', 'En sevdiğin yemek ne?', 'Çocukken ne olmak isterdin?', 'Seni mutlu eden küçük bir şey?', 'Bir günlüğüne başka bir şehirde yaşasan neresi olurdu?', 'İlk görüşte aşka inanır mısın?', 'Senin için mükemmel bir ilk buluşma nasıl olurdu?', 'Hiç birine mektup yazdın mı?', 'Bir ilişkide senin için en önemli şey ne?', 'Romantik bir sürpriz yapsan ne yapardın?', 'Seni bir insana bağlayan ilk şey ne olur?'];
const EV = { matched: 'Eşleştiler', ended: 'Sohbet bitti', friend_request: 'Arkadaşlık isteği', friend_accepted: 'Arkadaş oldular', voice_on: 'Sesli mesaja izin', voice_off: 'Ses izni geri alındı', questions: 'Sorular seçildi', friend_chat: 'Arkadaş sohbeti' };

$('logo').innerHTML = '<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" style="border-radius:8px;vertical-align:middle;margin-inline-end:8px"><rect width="64" height="64" rx="15" fill="#0d3b47"/><path d="M32 56C32 56 6 41 6 22.5 6 13.5 12.8 7 21 7c5 0 9 2.6 11 6.8C34 9.6 38 7 43 7c8.2 0 15 6.5 15 15.5C58 41 32 56 32 56Z" fill="#e8152b"/><circle cx="32" cy="26" r="5.2" fill="#0d3b47"/><path d="M29.3 29.5h5.4l1.7 11.5h-8.8z" fill="#0d3b47"/></svg>';

function sheet(html, acts) {
  $('sheet').innerHTML = html + `<div class="acts">${acts.map((a, i) => `<button class="${a[2] || 'ghost'}" data-a="${i}">${esc(a[0])}</button>`).join('')}</div>`;
  $('sheet').querySelectorAll('[data-a]').forEach(b => b.onclick = () => acts[+b.dataset.a][1]());
  $('veil').classList.add('on');
}
const close = () => $('veil').classList.remove('on');
const info = (t, x) => sheet(`<h3>${esc(t)}</h3>${x ? `<p>${esc(x)}</p>` : ''}`, [['Tamam', close, 'btn']]);
$('veil').addEventListener('click', e => { if (e.target === $('veil')) close(); });
async function rpc(name, args) { const { data, error } = await sb.rpc(name, args || {}); if (error) throw error; return data; }

// ---------- Giriş ----------
$('loginForm').onsubmit = async e => {
  e.preventDefault();
  const email = $('email').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $('loginMsg').textContent = 'Geçerli bir e-posta yaz.'; return; }
  $('sendLink').disabled = true;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  $('sendLink').disabled = false;
  $('loginMsg').textContent = error ? 'Gönderilemedi: ' + error.message : 'Bağlantı gönderildi. E-postandaki bağlantıya bu cihazda dokun.';
};
$('logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || session.user.is_anonymous) { $('a-login').hidden = false; return; }
  $('logout').hidden = false; $('a-login').hidden = true;
  let ok = false; try { ok = await rpc('is_admin'); } catch {}
  if (!ok) { $('a-denied').hidden = false; $('deniedTxt').textContent = `Giriş yapan: ${session.user.email}. Yönetici olarak eklenmesi gerekiyor.`; return; }
  $('a-panel').hidden = false;
  load();
}
sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' && $('a-login').hidden === false) location.reload(); });

// ---------- Panel ----------
let status = 'open';
$('tabs').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; status = b.dataset.s; $('tabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); load(); };
async function load() {
  try {
    const s = await rpc('admin_stats');
    $('stats').innerHTML = [['users', 'Kullanıcı'], ['online', 'Şu an çevrimiçi'], ['today', 'Bugün katılan'], ['active_chats', 'Aktif sohbet'], ['open_reports', 'Açık şikayet'], ['banned', 'Engelli']]
      .map(([k, l]) => `<div class="stat ${k === 'open_reports' && s[k] ? 'alert' : ''}"><b>${esc(s[k])}</b><span>${l}</span></div>`).join('');
    const list = await rpc('admin_reports', { p_status: status });
    $('list').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">Burada şikayet yok.</div>';
  } catch (e) { info('Yüklenemedi', e.message); }
}
function card(r) {
  const banned = r.banned_until && new Date(r.banned_until) > new Date();
  const forever = banned && new Date(r.banned_until).getFullYear() > 9000;
  return `<article class="rep" data-id="${esc(r.id)}" data-user="${esc(r.reported)}" data-chat="${esc(r.chat_id)}">
    <h3>${esc(r.reported_nick || 'Silinmiş kullanıcı')} <span class="tag red">${esc(REASONS[r.reason] || r.reason)}</span>${banned ? `<span class="tag">${forever ? 'Kalıcı engelli' : 'Askıda: ' + esc(when(r.banned_until))}</span>` : ''}${r.status === 'reviewed' ? `<span class="tag">İncelendi${r.action ? ': ' + esc(r.action) : ''}</span>` : ''}</h3>
    <div class="meta">${r.reported_gender === 'K' ? 'Kadın' : r.reported_gender === 'E' ? 'Erkek' : ''} ${esc(r.reported_age || '')} · Hakkındaki toplam şikayet: <b>${esc(r.reported_total)}</b> · Şikayet eden: ${esc(r.reporter_nick || 'silinmiş')} · ${esc(when(r.created_at))}</div>
    <div class="acts2">
      <button class="ghost" data-do="chat">Sohbeti gör</button>
      <button class="ghost" data-do="ban24">24 saat askı</button>
      <button class="ghost" data-do="ban168">7 gün askı</button>
      <button class="btn" data-do="banall">Kalıcı engelle</button>
      ${banned ? '<button class="ghost" data-do="unban">Engeli kaldır</button>' : ''}
      ${r.status === 'open' ? '<button class="ghost" data-do="dismiss">Yersiz, kapat</button>' : ''}
      <button class="ghost" data-do="log">Bağlantı kayıtları</button>
    </div>
    <div class="convo" hidden></div>
  </article>`;
}
$('list').onclick = async e => {
  const b = e.target.closest('[data-do]'); if (!b) return;
  const art = b.closest('.rep'), id = art.dataset.id, user = art.dataset.user, chat = art.dataset.chat, act = b.dataset.do;
  try {
    if (act === 'chat') return showChat(art, chat);
    if (act === 'log') return showLog(user);
    if (act === 'dismiss') { await rpc('admin_resolve', { p_report: id, p_action: 'Yersiz bulundu' }); return load(); }
    if (act === 'unban') { await rpc('admin_unban', { p_user: user }); return load(); }
    const hours = act === 'ban24' ? 24 : act === 'ban168' ? 168 : null;
    const label = hours === 24 ? '24 saat askı' : hours === 168 ? '7 gün askı' : 'Kalıcı engel';
    sheet(`<h3>${label}</h3><p>Kullanıcının aktif sohbeti kapanır ve süre boyunca siteyi kullanamaz.</p><label class="chk"><input type="checkbox" id="ipToo"><span>Son kullandığı IP adresini de engelle (yeni hesap açmasın)</span></label>`,
      [[label, async () => { const ip = $('ipToo').checked; close(); try { await rpc('admin_ban', { p_user: user, p_hours: hours, p_ip: ip }); await rpc('admin_resolve', { p_report: id, p_action: label + (ip ? ' + IP' : '') }); load(); } catch (er) { info('Olmadı', er.message); } }, 'btn'], ['Vazgeç', close]]);
  } catch (er) { info('Olmadı', er.message); }
};
async function showChat(art, chat) {
  const box = art.querySelector('.convo');
  if (!box.hidden) { box.hidden = true; return; }
  const msgs = await rpc('admin_chat', { p_chat: chat });
  const reported = art.dataset.user;
  box.innerHTML = msgs.length ? '' : '<div class="empty">Bu sohbetin mesajları silinmiş.</div>';
  for (const m of msgs) {
    const d = document.createElement('div');
    if (m.kind === 'event') { d.className = 'm sys'; d.textContent = `${EV[m.body] || m.body} · ${when(m.created_at)}`; box.append(d); continue; }
    d.className = 'm ' + (m.sender === reported ? 'them' : 'me');
    const s = document.createElement('small'); s.textContent = `${m.nick || '?'}${m.sender === reported ? ' (şikayet edilen)' : ''} · ${when(m.created_at)}`; d.append(s);
    if (m.kind === 'question') d.append('Soru: ' + (QS[m.q] || ''));
    else if (m.kind === 'answer') d.append(`Cevap (${QS[m.q] || ''}): ${m.body}`);
    else if (m.kind === 'voice') {
      const { data } = await sb.storage.from('voice').createSignedUrl(m.voice_path, 600);
      if (data) { const a = document.createElement('audio'); a.controls = true; a.src = data.signedUrl; d.append(a); } else d.append('Sesli mesaj (dosya yok)');
    } else d.append(m.body || '');
    box.append(d);
  }
  box.hidden = false;
}
async function showLog(user) {
  const rows = await rpc('admin_traffic', { p_user: user });
  const names = { kayit: 'Kayıt', oturum: 'Bağlantı', yas_engeli: '18 yaş engeli' };
  sheet(`<h3>Bağlantı kayıtları</h3><p class="small muted">5651 sayılı Kanun gereği saklanan kayıtlar. Yalnızca yetkili makamların resmi talebi üzerine paylaşılır.</p>
    ${rows.length ? `<table class="log"><thead><tr><th>Zaman</th><th>IP</th><th>Olay</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(when(r.at))}</td><td>${esc(r.ip || '-')}</td><td>${esc(names[r.event] || r.event)}</td></tr>`).join('')}</tbody></table>` : '<p>Kayıt yok.</p>'}`,
    [['Kapat', close, 'btn']]);
}
boot();

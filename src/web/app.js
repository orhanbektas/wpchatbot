// ── WA Otomasyon Panel — app.js ──────────────────────────────
const socket = io();
let curPage = 'dashboard';
let cPage = 1, campPage = 1, logPage = 1;

// ── Socket ───────────────────────────────────────────────────
socket.on('wa:state',     ({ state }) => setStateUI(state));
socket.on('wa:ready',     ()          => { setStateUI('READY'); showConnected(); });
socket.on('wa:disconnected', ()       => { setStateUI('DISCONNECTED'); showQRPlaceholder(); });
socket.on('wa:qr',        ({ qr })    => renderQR(qr));
socket.on('queue:sent',   ({ phone }) => feed('✔ Gönderildi → ' + phone, 'g'));
socket.on('queue:sending',({ phone }) => feed('⬆ Gönderiliyor → ' + phone, 'a'));
socket.on('queue:stats',  (s)         => updateQStats(s));
socket.on('campaign:done',({ campaignId }) => feed('✓ Kampanya #' + campaignId + ' tamamlandı', 'g'));

function setStateUI(state) {
  const dot = document.getElementById('sdot');
  document.getElementById('sstate').textContent = state;
  dot.className = 'dot';
  if (state === 'READY') dot.classList.add('ready');
  else if (['INITIALIZING','QR_PENDING','AUTHENTICATED'].includes(state)) dot.classList.add('connecting');
  else if (state === 'FAILED') dot.classList.add('failed');
  const el = document.getElementById('ds-state');
  if (el) {
    el.textContent = state;
    el.className = 'sc-val';
    if (state === 'READY') el.classList.add('g');
    else if (state === 'QR_PENDING') el.classList.add('pending');
    else if (state === 'FAILED') el.classList.add('r');
    else el.classList.add('b');
  }
  // Auth sayfasında spinner kontrolü
  const loading = document.getElementById('qr-loading');
  const qrPh   = document.getElementById('qr-ph');
  if (!loading || !qrPh) return;
  if (state === 'INITIALIZING') {
    qrPh.style.display    = 'none';
    loading.style.display = 'block';
    document.getElementById('qr-box').style.display = 'none';
    document.getElementById('qr-ok').style.display  = 'none';
  } else if (state === 'FAILED' || state === 'DISCONNECTED') {
    loading.style.display = 'none';
    qrPh.style.display    = 'block';
  }
}

function updateQStats(s) {
  set('ds-queued', (s.queued||0)+(s.sending||0));
  set('ds-total-sent', s.sent||0);
  set('ds-failed', s.failed||0);
}

function feed(msg, cls='n') {
  const el = document.getElementById('live-feed');
  if (!el) return;
  const row = document.createElement('div');
  row.className = 'fr';
  row.innerHTML = `<span class="ft">[${new Date().toLocaleTimeString('tr-TR')}]</span><span class="fm ${cls}">${msg}</span>`;
  el.prepend(row);
  if (el.children.length > 60) el.removeChild(el.lastChild);
  const badge = document.getElementById('feed-badge');
  if (badge) badge.textContent = el.children.length + ' kayıt';
}

// ── Navigation ───────────────────────────────────────────────
document.getElementById('nav').addEventListener('click', e => {
  const item = e.target.closest('.nav-item');
  if (!item) return;
  goto(item.dataset.page);
});

function goto(page) {
  curPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  ({ dashboard: loadDashboard, contacts: loadContacts, campaigns: loadCampaigns, logs: loadLogs, settings: loadSettings })[page]?.();
}

// ── API ──────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API hatası');
  return data;
}

function showAlert(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert al-${type}">${msg}</div>`;
  setTimeout(() => el.innerHTML = '', 5000);
}

function set(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }

// ── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [sett, stats, auth, contacts] = await Promise.all([
      api('GET','/settings'), api('GET','/messages/stats'),
      api('GET','/auth/status'), api('GET','/contacts?limit=1'),
    ]);
    setStateUI(auth.state);
    set('ds-sent-today', sett.dailyStats.sentToday);
    set('ds-limit', sett.dailyStats.limit);
    set('ds-queued', (stats.stats.queued||0)+(stats.stats.sending||0));
    set('ds-total-sent', stats.stats.sent||0);
    set('ds-failed', stats.stats.failed||0);
    set('ds-contacts', contacts.total||0);
    set('ds-warmup', `Gün ${sett.dailyStats.warmupDay}/14`);
  } catch(e){ console.error(e); }
  loadRecentMessages();
}

async function loadRecentMessages() {
  try {
    const d = await api('GET', '/messages/recent?limit=10');
    const tbody = document.getElementById('recent-msgs');
    if (!tbody) return;
    if (!d.rows || !d.rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--t3)">Henüz gönderim yok</td></tr>';
      return;
    }
    const statusMap = { sent:'bg', failed:'br', sending:'ba', queued:'bgr', retry:'ba' };
    const statusTR  = { sent:'Gönderildi', failed:'Başarısız', sending:'Gönderiliyor', queued:'Bekliyor', retry:'Yeniden' };
    tbody.innerHTML = d.rows.map(m => `
      <tr>
        <td><span style="font-family:var(--mono);font-size:12px">${m.contact_phone}</span></td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(m.message_text)}">${esc(m.message_text||'').substring(0,60)}${(m.message_text||'').length>60?'…':''}</td>
        <td><span class="badge ${statusMap[m.status]||'bgr'}">${statusTR[m.status]||m.status}</span></td>
        <td class="dim xsm">${fmtDate(m.updated_at||m.created_at)}</td>
      </tr>`).join('');
  } catch(e){ console.error(e); }
}

// ── Auth ─────────────────────────────────────────────────────
function renderQR(qr) {
  const box = document.getElementById('qr-box');
  box.innerHTML = '';
  new QRCode(box, { text: qr, width: 228, height: 228, correctLevel: QRCode.CorrectLevel.L });
  box.style.display = 'block';
  document.getElementById('qr-ph').style.display = 'none';
  document.getElementById('qr-ok').style.display = 'none';
  document.getElementById('qr-loading').style.display = 'none';
}
function showConnected() {
  document.getElementById('qr-box').style.display = 'none';
  document.getElementById('qr-ph').style.display = 'none';
  document.getElementById('qr-ok').style.display = 'block';
}
function showQRPlaceholder() {
  document.getElementById('qr-box').style.display = 'none';
  document.getElementById('qr-ok').style.display = 'none';
  document.getElementById('qr-loading').style.display = 'none';
  document.getElementById('qr-ph').style.display = 'block';
}
async function connectWA() {
  // Spinner göster
  document.getElementById('qr-ph').style.display = 'none';
  document.getElementById('qr-ok').style.display = 'none';
  document.getElementById('qr-box').style.display = 'none';
  document.getElementById('qr-loading').style.display = 'block';
  try { await api('POST','/auth/connect'); } catch(e){ alert(e.message); showQRPlaceholder(); }
}
async function disconnectWA() { if(!confirm('WhatsApp oturumunu kapat?')) return; try{ await api('POST','/auth/disconnect'); }catch(e){alert(e.message);} }
async function restartWA()    { try { await api('POST','/auth/restart'); } catch(e){ alert(e.message); } }

// ── Contacts ─────────────────────────────────────────────────
async function loadContacts() {
  const search = document.getElementById('contact-search')?.value || '';
  try {
    const d = await api('GET', `/contacts?page=${cPage}&limit=50&search=${encodeURIComponent(search)}`);
    set('contact-count-label', `${d.total} kişi kayıtlı`);
    const tbody = document.getElementById('contacts-body');
    if (!d.rows.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-icon">◉</div><div class="empty-txt">Henüz kişi yok. Excel dosyası yükleyin.</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = d.rows.map(c => `
      <tr>
        <td><span style="font-family:var(--mono);font-size:12px">${c.phone}</span></td>
        <td>${c.name || '<span class="dim">—</span>'}</td>
        <td><span class="badge bgr">${c.source||'manuel'}</span></td>
        <td class="dim xsm">${fmtDate(c.created_at)}</td>
        <td><button class="btn btn-d sm" onclick="deleteContact(${c.id})">✕</button></td>
      </tr>`).join('');
    renderPager('contacts-pager', d.page, Math.ceil(d.total/d.limit), p => { cPage=p; loadContacts(); });
  } catch(e){ console.error(e); }
}

async function uploadContacts(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  document.getElementById('import-result').innerHTML = '<div class="alert al-warn">Aktarılıyor...</div>';
  try {
    const res = await fetch('/api/contacts/import', { method:'POST', body:fd });
    const d = await res.json();
    if (!d.success) throw new Error(d.error);
    document.getElementById('import-result').innerHTML = `
      <div class="alert al-ok">
        ✔ <strong>${d.imported}</strong> kişi eklendi —
        ${d.duplicates} tekrar atlandı —
        ${d.invalid} geçersiz numara
      </div>`;
    loadContacts();
  } catch(e) {
    document.getElementById('import-result').innerHTML = `<div class="alert al-err">✕ ${e.message}</div>`;
  }
  input.value = '';
}

async function deleteContact(id) {
  if (!confirm('Bu kişi silinsin mi?')) return;
  await api('DELETE', `/contacts/${id}`);
  loadContacts();
}

async function deleteAllContacts() {
  if (!confirm('Tüm kişiler silinsin mi? Bu işlem geri alınamaz.')) return;
  await api('DELETE', '/contacts/all');
  loadContacts();
}

// ── Send Single ──────────────────────────────────────────────
function previewMedia(input) {
  const file = input.files[0];
  if (!file) return;
  const wrap = document.getElementById('media-preview-wrap');
  const isImg = file.type.startsWith('image/');
  wrap.innerHTML = isImg
    ? `<img src="${URL.createObjectURL(file)}" style="max-height:120px;border-radius:6px;margin-bottom:6px"/><div class="up-sub">${file.name} <button class="btn btn-d sm" style="margin-left:8px" onclick="clearMedia(event)">✕ Kaldır</button></div>`
    : `<div style="font-size:28px">🎥</div><div class="up-sub">${file.name} <button class="btn btn-d sm" style="margin-left:8px" onclick="clearMedia(event)">✕ Kaldır</button></div>`;
}

function clearMedia(e) {
  e.stopPropagation();
  document.getElementById('media-input').value = '';
  document.getElementById('media-preview-wrap').innerHTML = `
    <div class="up-icon" style="font-size:22px">📎</div>
    <div class="up-sub">Fotoğraf veya video seç (opsiyonel)</div>`;
}

async function sendSingle() {
  const phone    = document.getElementById('send-phone').value.trim();
  const text     = document.getElementById('send-text').value.trim();
  const minDelay = parseInt(document.getElementById('send-min').value);
  const maxDelay = parseInt(document.getElementById('send-max').value);
  const mediaFile = document.getElementById('media-input').files[0];

  if (!phone || !text) return showAlert('send-alert','err','Telefon ve mesaj zorunludur');

  try {
    const fd = new FormData();
    fd.append('phone', phone);
    fd.append('text', text);
    fd.append('minDelay', minDelay);
    fd.append('maxDelay', maxDelay);
    if (mediaFile) fd.append('media', mediaFile);

    const res = await fetch('/api/messages/single', { method: 'POST', body: fd });
    const d = await res.json();
    if (!d.success) throw new Error(d.error);

    showAlert('send-alert','ok',`✔ Kuyruğa eklendi — Kampanya #${d.campaignId}`);
    document.getElementById('send-phone').value = '';
    document.getElementById('send-text').value  = '';
    clearMedia({ stopPropagation: () => {} });
  } catch(e){ showAlert('send-alert','err','✕ '+e.message); }
}

// ── Campaigns ────────────────────────────────────────────────
async function loadCampaigns() {
  try {
    const d = await api('GET', `/campaigns?page=${campPage}&limit=20`);
    const el = document.getElementById('campaigns-list');
    if (!d.rows.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">◈</div><div class="empty-txt">Kampanya yok. Yeni oluşturun.</div></div>';
      return;
    }
    const statusMap = { draft:'ba', running:'bb', paused:'ba', done:'bg', failed:'br' };
    const statusTR  = { draft:'Taslak', running:'Çalışıyor', paused:'Duraklatıldı', done:'Tamamlandı', failed:'Başarısız' };
    const typeTR    = { single:'Tekli', bulk:'Toplu', scheduled:'Zamanlanmış' };
    el.innerHTML = d.rows.map(c => {
      const total = c.total_messages||0;
      const sent  = c.sent_count||0;
      const pct   = total ? Math.round(sent/total*100) : 0;
      return `
      <div class="cc">
        <div class="cc-head">
          <div>
            <span class="cc-name">${esc(c.name)}</span>
            <span class="badge ${statusMap[c.status]||'bgr'}" style="margin-left:8px">${statusTR[c.status]||c.status}</span>
            <span class="badge bgr" style="margin-left:4px">${typeTR[c.type]||c.type}</span>
          </div>
          <div class="flex g8">
            ${c.status==='running'  ? `<button class="btn btn-w sm" onclick="pauseCamp(${c.id})">⏸ Duraklat</button>` : ''}
            ${c.status==='paused'   ? `<button class="btn btn-s sm" onclick="resumeCamp(${c.id})">▶ Devam</button>` : ''}
            <button class="btn btn-d sm" onclick="deleteCamp(${c.id})">✕</button>
          </div>
        </div>
        <div class="cc-meta">
          <div><div class="cc-ml">Toplam</div><div class="cc-mv">${total}</div></div>
          <div><div class="cc-ml">Gönderildi</div><div class="cc-mv" style="color:var(--green)">${sent}</div></div>
          <div><div class="cc-ml">Başarısız</div><div class="cc-mv" style="color:var(--red)">${c.failed_count||0}</div></div>
          <div><div class="cc-ml">Bekleyen</div><div class="cc-mv" style="color:var(--amber)">${c.pending_count||0}</div></div>
        </div>
        <div class="prog"><div class="prog-bar" style="width:${pct}%"></div></div>
        <div class="xsm dim" style="margin-top:5px">%${pct} tamamlandı${c.scheduled_at ? ' · Zamanlama: '+fmtDate(c.scheduled_at) : ''}</div>
      </div>`;
    }).join('');
    renderPager('campaigns-pager', d.page, Math.ceil(d.total/d.limit), p => { campPage=p; loadCampaigns(); });
  } catch(e){ console.error(e); }
}

function openCampModal()  { document.getElementById('camp-modal').classList.remove('hidden'); }
function closeCampModal() { document.getElementById('camp-modal').classList.add('hidden'); }
function toggleSchField() {
  const t = document.getElementById('cm-type').value;
  document.getElementById('cm-sch-grp').style.display = t==='scheduled' ? 'block' : 'none';
}

async function createCampaign() {
  const name = document.getElementById('cm-name').value.trim();
  const type = document.getElementById('cm-type').value;
  const text = document.getElementById('cm-text').value.trim();
  const sch  = document.getElementById('cm-scheduled-at').value;
  const minD = parseInt(document.getElementById('cm-min').value);
  const maxD = parseInt(document.getElementById('cm-max').value);
  if (!name || !text) return showAlert('camp-modal-alert','err','Ad ve mesaj zorunludur');
  if (type==='scheduled' && !sch) return showAlert('camp-modal-alert','err','Zamanlama tarihi gerekli');
  try {
    const cr = await api('POST','/campaigns',{
      name, type, message_text:text,
      scheduled_at: sch ? new Date(sch).toISOString() : null,
      min_delay:minD, max_delay:maxD,
    });
    if (type==='bulk') await api('POST',`/campaigns/${cr.campaign.id}/start`,{});
    closeCampModal();
    loadCampaigns();
  } catch(e){ showAlert('camp-modal-alert','err','✕ '+e.message); }
}

async function pauseCamp(id)  { await api('POST',`/campaigns/${id}/pause`);  loadCampaigns(); }
async function resumeCamp(id) { await api('POST',`/campaigns/${id}/resume`); loadCampaigns(); }
async function deleteCamp(id) {
  if (!confirm('Kampanya ve tüm mesajlar silinsin mi?')) return;
  await api('DELETE',`/campaigns/${id}`);
  loadCampaigns();
}

// ── Logs ─────────────────────────────────────────────────────
async function loadLogs() {
  const level = document.getElementById('log-level')?.value || '';
  const ctx   = document.getElementById('log-ctx')?.value   || '';
  try {
    const d = await api('GET',`/logs?page=${logPage}&limit=200&level=${level}&context=${ctx}`);
    const el = document.getElementById('log-entries');
    if (!d.rows.length) { el.innerHTML = '<div class="empty">Kayıt yok</div>'; return; }
    el.innerHTML = d.rows.map(l => `
      <div class="lr">
        <span class="lt">${l.created_at}</span>
        <span class="ll ${l.level}">${l.level.toUpperCase()}</span>
        <span class="lc">[${l.context||'—'}]</span>
        <span class="lm">${esc(l.message)}</span>
      </div>`).join('');
  } catch(e){ console.error(e); }
}

async function clearLogs() {
  if (!confirm('Tüm kayıtlar silinsin mi?')) return;
  await api('DELETE','/logs');
  loadLogs();
}

// ── Settings ─────────────────────────────────────────────────
const warmupSch = {1:15,2:20,3:25,4:35,5:45,6:55,7:65,8:80,9:95,10:110,11:130,12:150,13:175,14:200};

async function loadSettings() {
  try {
    const d = await api('GET','/settings');
    const s = d.settings;
    document.getElementById('s-daily-limit').value    = s.daily_limit||50;
    document.getElementById('s-min-delay').value      = s.min_delay||30000;
    document.getElementById('s-max-delay').value      = s.max_delay||60000;
    document.getElementById('s-warmup-enabled').value = s.warmup_enabled||'true';
    document.getElementById('s-warmup-day').value     = s.warmup_day||1;
    updateWarmupHint(parseInt(s.warmup_day||1));
  } catch(e){ console.error(e); }
}

document.getElementById('s-warmup-day')?.addEventListener('input', e => updateWarmupHint(parseInt(e.target.value)));
function updateWarmupHint(day) {
  const d = Math.min(Math.max(day,1),14);
  const el = document.getElementById('s-warmup-hint');
  if (el) el.textContent = `Gün ${d} → günlük maksimum ${warmupSch[d]||200} mesaj`;
}

async function saveSettings() {
  try {
    await api('PUT','/settings',{
      daily_limit:       document.getElementById('s-daily-limit').value,
      min_delay:         document.getElementById('s-min-delay').value,
      max_delay:         document.getElementById('s-max-delay').value,
      warmup_enabled:    document.getElementById('s-warmup-enabled').value,
      warmup_day:        document.getElementById('s-warmup-day').value,
    });
    showAlert('settings-alert','ok','✔ Ayarlar kaydedildi');
  } catch(e){ showAlert('settings-alert','err','✕ '+e.message); }
}

// ── Helpers ──────────────────────────────────────────────────
function renderPager(id, cur, total, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  if (total <= 1) { el.innerHTML = ''; return; }
  el.innerHTML =
    `<span class="pi">Sayfa ${cur}/${total}</span>` +
    (cur>1    ? `<button class="pb" onclick="(${cb.toString()})(${cur-1})">← Önceki</button>` : '') +
    (cur<total? `<button class="pb" onclick="(${cb.toString()})(${cur+1})">Sonraki →</button>` : '');
}

function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('tr-TR'); } catch { return s; }
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Init ─────────────────────────────────────────────────────
(async () => {
  try {
    const d = await api('GET','/auth/status');
    setStateUI(d.state);
    if (d.state === 'READY') showConnected();
  } catch(_){}
  loadDashboard();
})();

// Auth sayfası için durum polling — socket'ten önce de çalışır
setInterval(async () => {
  if (curPage !== 'auth') return;
  try {
    const d = await api('GET','/auth/status');
    setStateUI(d.state);
    if (d.state === 'READY') showConnected();
  } catch(_){}
}, 3000);

setInterval(() => { if (curPage==='dashboard') loadDashboard(); }, 10000);
setInterval(() => { if (curPage==='campaigns') loadCampaigns(); }, 8000);

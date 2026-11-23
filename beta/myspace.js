/* ВФД · «Мій простір» · БЕТА · етап 1 (вхід, закриття, ігри, щоденник, «Мій рік») */
(function () {
  'use strict';
  var SB_URL = 'https://zlqggxwjqqiyhqfujaza.supabase.co';
  var SB_KEY = 'sb_publishable_5oQwriCZ0BkXnuQC4MsqaA_yWwjXkeb';
  var SKIP = [159, 162, 163, 165, 166, 168, 169];
  var VALUES = []; for (var v = 41; v <= 170; v++) if (SKIP.indexOf(v) < 0) VALUES.push(v);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtDate(s) { if (!s) return ''; var d = new Date(s); if (isNaN(d)) return esc(s); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
  function yearOf(s) { return new Date(s).getFullYear(); }
  function nums(str) { return String(str || '').split(/[\s,;]+/).map(Number).filter(function (n) { return isFinite(n) && n > 0; }); }
  function num(x) { if (x === '' || x == null) return null; var n = Number(String(x).replace(',', '.')); return isFinite(n) ? n : null; }
  function int0(x) { var n = parseInt(x, 10); return isFinite(n) && n >= 0 ? n : 0; }

  // ---------- CSS ----------
  var css = document.createElement('style');
  css.textContent = [
    '#my-space{max-width:760px;margin:0 auto;padding:18px 16px 40px;color:var(--cream)}',
    '#my-space h2{font:800 22px Montserrat,Inter,sans-serif;margin:0 0 4px}',
    '#my-space .sub{color:var(--muted);font-size:13px;margin:0 0 14px}',
    '.ms-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}',
    '.ms-btn{background:var(--gold);color:#101535;border:0;border-radius:10px;padding:11px 16px;font:700 14px Inter,sans-serif;cursor:pointer}',
    '.ms-btn.sec{background:var(--panel-2);color:var(--cream);border:1px solid var(--line)}',
    '.ms-btn.sm{padding:7px 11px;font-size:12px}',
    '.ms-btn[disabled]{opacity:.45;cursor:not-allowed}',
    '.ms-tabs{display:flex;gap:6px;overflow-x:auto;margin:0 0 14px;scrollbar-width:none}',
    '.ms-tabs button{flex:none;border:1px solid var(--line);background:var(--panel);color:var(--muted);padding:9px 14px;border-radius:999px;font:600 13px Inter,sans-serif;cursor:pointer}',
    '.ms-tabs button.on{background:var(--royal);border-color:var(--royal-light);color:#fff}',
    '.ms-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
    '.ms-in{background:var(--bg);border:1px solid var(--line);color:var(--cream);border-radius:9px;padding:9px 10px;font:16px Inter,sans-serif;width:100%;min-width:0;max-width:100%;box-sizing:border-box}',
    'input[type=date].ms-in{-webkit-appearance:none;appearance:none;min-height:44px;display:block;text-align:left}',
    '.ms-btn.ok{background:#2e8b57;color:#fff}',
    '.ms-src{background:var(--panel);border:1px solid var(--line);border-left:5px solid var(--c);border-radius:14px;padding:14px;margin-bottom:14px}.ms-src.site{--c:#4a64e8}.ms-src.local{--c:#fcc202}.ms-src.train{--c:#2ecc71}',
    '.ms-srch{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.ms-srch b{font-size:16px}',
    '.ms-badge{font:700 10px Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#101535;background:var(--c);border-radius:999px;padding:4px 9px}',
    '.ms-f{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.ms-f label{min-width:0;display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}.ms-f .w{grid-column:1/-1}',
    '.ms-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}',
    '.ms-stat{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px}.ms-stat b{display:block;font:800 22px Montserrat,Inter,sans-serif;color:var(--gold)}.ms-stat span{font-size:11px;color:var(--muted)}',
    '.ms-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}',
    '@media(min-width:560px){.ms-grid{grid-template-columns:repeat(8,1fr)}}',
    '.ms-c{position:relative;background:var(--bg);border:1px solid var(--line);color:var(--cream);border-radius:10px;padding:11px 0;font:700 15px Inter,sans-serif;cursor:pointer;text-align:center;user-select:none}',
    '.ms-c.done{background:#1c3b2a;border-color:#2e8b57;color:#8fe3b0}',
    '.ms-c i{position:absolute;top:-6px;right:-4px;min-width:17px;height:17px;border-radius:9px;background:var(--gold);color:#101535;font:800 10px Inter,sans-serif;font-style:normal;display:grid;place-items:center;padding:0 3px}',
    '.ms-bar{height:8px;background:var(--bg);border-radius:6px;overflow:hidden;margin:8px 0}.ms-bar>div{height:100%;background:linear-gradient(90deg,var(--gold-2),var(--gold))}',
    '.ms-item{border-top:1px solid var(--line);padding:10px 0;display:flex;gap:10px;justify-content:space-between;align-items:flex-start}.ms-item:first-child{border-top:0}',
    '.ms-item small{color:var(--muted);display:block;margin-top:2px;line-height:1.5}',
    '.ms-x{background:none;border:0;color:var(--muted);font-size:18px;cursor:pointer;padding:0 4px}',
    '.ms-warn{background:#3a2a10;border:1px solid #8a6a20;color:#ffd98a;border-radius:12px;padding:11px 13px;font-size:13px;margin-bottom:12px}',
    '.ms-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:#0c1230;border:1px solid var(--gold);color:var(--cream);padding:10px 14px;border-radius:12px;z-index:200;font-size:13px;display:flex;gap:12px;align-items:center}',
    '.ms-toast button{background:none;border:0;color:var(--gold);font:700 13px Inter,sans-serif;cursor:pointer}',
    '.ms-modal{position:fixed;inset:0;background:rgba(5,8,25,.75);z-index:210;display:grid;place-items:center;padding:16px}.ms-modal>div{background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:16px;max-width:420px;width:100%;max-height:80vh;overflow:auto}',
    '#beta-me{position:relative}#beta-me.in::after{content:"";position:absolute;top:5px;right:5px;width:8px;height:8px;border-radius:50%;background:#2ecc71}'
  ].join('\n');
  document.head.appendChild(css);

  // ---------- каркас ----------
  var sec = document.createElement('section');
  sec.id = 'my-space'; sec.setAttribute('data-i18n-skip', '');
  sec.className = 'beta-hide';
  var ft = document.querySelector('footer'); if (ft && ft.parentNode) ft.parentNode.insertBefore(sec, ft); else document.body.appendChild(sec);

  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });
  function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function installHelp() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var m = document.createElement('div'); m.className = 'ms-modal'; m.setAttribute('data-i18n-skip', '');
    m.innerHTML = '<div><b style="font-size:18px">Додати на головний екран</b><p class="sub" style="margin:8px 0">' + (ios ?
      'У Safari натисніть кнопку «Поділитися» (квадрат зі стрілкою) → «На екран “Додому”» → «Додати».' :
      'У Chrome натисніть ⋮ (меню) → «Додати на головний екран» або «Встановити застосунок».') +
      '</p><p class="sub" style="margin:0 0 12px">Після цього іконка ВФД відкриватиме Мій простір одним дотиком.</p><button type="button" class="ms-btn sec sm" data-close="1">Закрити</button></div>';
    m.addEventListener('click', function (e) { if (e.target === m || e.target.getAttribute('data-close')) m.remove(); });
    document.body.appendChild(m);
  }
  var sb = null, session = null, member = null, tab = 'overview', year = new Date().getFullYear();
  var D = { checkouts: [], events: [], skills: [] };
  var checkMode = 'add', checkDate = today();
  var toastT = null;

  function toast(msg, undo) {
    var old = document.querySelector('.ms-toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'ms-toast'; t.setAttribute('data-i18n-skip', ''); t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button">Скасувати</button>' : '');
    if (undo) t.querySelector('button').onclick = function () { t.remove(); undo(); };
    document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function () { t.remove(); }, undo ? 6000 : 2500);
  }
  function fail(e) { console.error(e); toast('Помилка: ' + ((e && e.message) || e)); }

  function canWrite() { return !!(member && member.has_current); }

  // ---------- Supabase ----------
  function init() {
    if (!window.supabase || !window.supabase.createClient) { render(); return; }
    sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    sb.auth.onAuthStateChange(function (ev, s) {
      var had = !!session; session = s || null;
      document.getElementById('beta-me') && document.getElementById('beta-me').classList.toggle('in', !!session);
      if (ev === 'SIGNED_IN' && !had) { setTimeout(afterLogin, 0); }
      if (ev === 'SIGNED_OUT') { member = null; D = { checkouts: [], events: [], skills: [] }; window.__ms.reset(); render(); }
    });
    sb.auth.getSession().then(function (r) {
      session = r.data && r.data.session; 
      var me = document.getElementById('beta-me'); if (me) me.classList.toggle('in', !!session);
      if (session) afterLogin(); else render();
    });
  }

  function afterLogin() {
    sec.innerHTML = '<div class="ms-card">Завантаження…</div>';
    if (sessionStorage.getItem('ms_go') && window.__betaShow) { sessionStorage.removeItem('ms_go'); window.__betaShow('my-space', true); }
    ensureProfile().then(function () { return sb.rpc('my_membership'); }).then(function (r) {
      if (r.error) throw r.error;
      var row = Array.isArray(r.data) ? r.data[0] : r.data;
      member = row || null;
      if (!member) { render(); return; }
      return loadAll().then(render);
    }).catch(function (e) { fail(e); render(); });
  }

  function ensureProfile() {
    return sb.from('profiles').select('user_id').maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      if (r.data) return;
      var c = localStorage.getItem('ms_consent');
      if (!c) return; // згоду покаже render()
      return sb.from('profiles').insert({ user_id: session.user.id, email: session.user.email, consent_at: c }).then(function (x) { if (x.error) throw x.error; localStorage.removeItem('ms_consent'); });
    }).then(function () { return sb.from('profiles').select('user_id').maybeSingle(); }).then(function (r) { needConsent = !(r && r.data); });
  }
  var needConsent = false;

  function loadAll() {
    return Promise.all([
      sb.from('checkouts').select('id,value,achieved_at').order('achieved_at', { ascending: false }),
      sb.from('local_events').select('*').order('event_date', { ascending: false }),
      sb.from('skills').select('*').order('created_at', { ascending: false })
    ]).then(function (a) {
      a.forEach(function (x) { if (x.error) throw x.error; });
      D.checkouts = a[0].data || []; D.events = a[1].data || []; D.skills = a[2].data || [];
    }).then(function () { return Promise.all(EXT.filter(function (x) { return x.load; }).map(function (x) { return x.load(); })); });
  }

  // ---------- рендер ----------
  function render() {
    if (!window.supabase) { sec.innerHTML = '<h2>Мій простір</h2><div class="ms-warn">Не вдалося завантажити модуль входу (supabase.js). Перевірте, що файл завантажено в папку beta/.</div>'; return; }
    if (!session) return renderLogin();
    if (needConsent) return renderConsent();
    if (!member) return renderNoMember();
    for (var oi = 0; oi < EXT.length; oi++) { if (EXT[oi].override) { var ov = EXT[oi].override(); if (ov) { sec.innerHTML = ov; if (EXT[oi].after) EXT[oi].after(); return; } } }
    var head = '<h2>Мій простір</h2><p class="sub">' + esc(member.player_name) + ' · ' + esc(session.user.email) + '</p>';
    if (!canWrite()) head += '<div class="ms-warn">Тур-карти на ' + new Date().getFullYear() + ' рік не знайдено. Ваші дані доступні для перегляду; додавати нові записи можна після отримання тур-карти.</div>';
    var tabs = [['overview', '📊 Статистика']].concat(EXT.filter(function (x) { return x.id; }).map(function (x) { return [x.id, x.label]; })).concat([['checkouts', '🎯 Закриття'], ['events', '🏆 Ігри'], ['skills', '📓 Щоденник']]);
    head += '<div class="ms-tabs">' + tabs.map(function (t) { return '<button type="button" data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var ext = EXT.filter(function (x) { return x.id === tab; })[0];
    var body = ext ? ext.view() : tab === 'checkouts' ? viewCheckouts() : tab === 'events' ? viewEvents() : tab === 'skills' ? viewSkills() : viewOverview();
    var foot = '<div class="ms-row" style="margin-top:18px">' + (isStandalone() ? '' : '<button type="button" class="ms-btn sec sm" data-a="install">📲 На головний екран</button>') + '<button type="button" class="ms-btn sec sm" data-a="export">⬇ Експорт в Excel</button><button type="button" class="ms-btn sec sm" data-a="logout">Вийти</button><button type="button" class="ms-btn sec sm" data-a="wipe">🗑 Видалити мої дані</button><a class="ms-btn sec sm" href="instruction.html" target="_blank" rel="noopener" style="text-decoration:none">ℹ️ Інструкція</a></div>';
    sec.innerHTML = head + body + foot;
  }

  function renderLogin() {
    var consent = '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;margin:12px 0"><input type="checkbox" id="ms-consent" style="margin-top:3px"><span>Погоджуюсь на обробку моїх особистих даних (email та записи тренувань і досягнень) для роботи сервісу. Дані бачу лише я. <a href="../privacy.html" target="_blank" rel="noopener" style="color:var(--gold)">Політика конфіденційності</a></span></label>';
    sec.innerHTML = '<h2>Мій простір</h2><p class="sub">Особистий кабінет власників тур-карти ВФД: таблиця закриттів, журнал ігор, щоденник саморозвитку.</p>' +
      '<div class="ms-card">' + consent + '<button type="button" class="ms-btn" id="ms-login" disabled>Увійти через Google</button>' +
      '<p class="sub" style="margin:10px 0 0">Використовуйте email, який вказано в списку власників тур-карти.</p></div><p class="sub"><a href="instruction.html" target="_blank" rel="noopener" style="color:var(--gold)">ℹ️ Інструкція для тестувальників</a></p>';
    var cb = sec.querySelector('#ms-consent'), bt = sec.querySelector('#ms-login');
    cb.onchange = function () { bt.disabled = !cb.checked; };
    bt.onclick = function () {
      if (!cb.checked || !sb) return;
      localStorage.setItem('ms_consent', new Date().toISOString());
      sessionStorage.setItem('ms_go', '1');
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }).then(function (r) { if (r.error) fail(r.error); });
    };
  }
  function renderConsent() {
    sec.innerHTML = '<h2>Мій простір</h2><div class="ms-card"><label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5"><input type="checkbox" id="ms-consent2" style="margin-top:3px"><span>Погоджуюсь на обробку моїх особистих даних. <a href="../privacy.html" target="_blank" rel="noopener" style="color:var(--gold)">Політика конфіденційності</a></span></label><p></p><button type="button" class="ms-btn" id="ms-c2" disabled>Продовжити</button> <button type="button" class="ms-btn sec" data-a="logout">Вийти</button></div>';
    var cb = sec.querySelector('#ms-consent2'), bt = sec.querySelector('#ms-c2');
    cb.onchange = function () { bt.disabled = !cb.checked; };
    bt.onclick = function () { localStorage.setItem('ms_consent', new Date().toISOString()); afterLogin(); };
  }
  function renderNoMember() {
    sec.innerHTML = '<h2>Мій простір</h2><div class="ms-warn">Email <b>' + esc(session.user.email) + '</b> не знайдено у списку власників тур-карти. Напишіть організаторам ВФД, щоб додали вашу пошту, або увійдіть з іншою адресою.</div><button type="button" class="ms-btn sec" data-a="logout">Вийти</button>';
  }

  // ---------- Огляд ----------
  function yearsAvail() {
    var s = {}; s[new Date().getFullYear()] = 1;
    D.checkouts.forEach(function (c) { s[yearOf(c.achieved_at)] = 1; });
    D.events.forEach(function (e) { s[yearOf(e.event_date)] = 1; });
    D.skills.forEach(function (k) { s[yearOf(k.done_at || k.created_at)] = 1; });
    return Object.keys(s).map(Number).sort(function (a, b) { return b - a; });
  }
  var siteRetry = 0;
  function yearUa(d) { return Number(String(d || '').slice(-4)); }
  function nkey(n) {
    return String(n || '').toLowerCase().replace(/[ʼ'’`]/g, '').replace(/ё/g, 'е').replace(/[єе]/g, 'е').replace(/[иіїы]/g, 'и').replace(/[^a-zа-я ]/g, '').split(/\s+/).filter(Boolean).sort().join(' ');
  }
  function siteName(raw) {
    var al = window.__nameAliases || {}, n = String(raw || '').trim().replace(/\s+/g, ' ');
    if (al[n]) n = al[n];
    var pool = [];
    try { pool = (nakkaPlayerStats || []).map(function (r) { return r.name; }); } catch (e) {}
    if (pool.indexOf(n) >= 0) return n;
    var k = nkey(n), hit = null;
    // порівняння без урахування регістру, є/е, і/и, порядку слів
    pool.concat((typeof leaderboard !== 'undefined' ? leaderboard : []).map(function (p) { return p.name; })).forEach(function (x) { if (!hit && nkey(x) === k) hit = x; });
    if (!hit && al) Object.keys(al).forEach(function (a) { if (!hit && nkey(a) === k) hit = al[a]; });
    return hit || n;
  }
  function siteBlock() {
    var name = siteName(member && member.player_name), ready = typeof nakkaPlayerStats !== 'undefined' && nakkaPlayerStats && nakkaPlayerStats.length;
    var head = '<div class="ms-src site"><div class="ms-srch"><b>🏛 Всеукраїнські турніри</b><span class="ms-badge">авто · основний сайт</span></div>' +
      '<p class="sub" style="margin:2px 0 10px">Створюється автоматично з протоколів ВФД та Nakka: Чемпіонати й Кубки України. Ви цю статистику не редагуєте.</p>';
    if (!ready) {
      if (siteRetry++ < 12) setTimeout(function () { if (tab === 'overview' && session && member) render(); }, 1000);
      return head + '<p class="sub">Завантажуємо дані сайту…</p></div>';
    }
    var rows = nakkaPlayerStats.filter(function (r) { return r.name === name && !r.isUDL && (year === 'all' || yearUa(r.date) === year); });
    var inLists = (typeof leaderboard !== 'undefined' && (leaderboard.some(function (p) { return p.name === name; }) || (typeof leaderboardWomen !== 'undefined' && leaderboardWomen.some(function (p) { return p.name === name; }))));
    var rating = null;
    [typeof currentRatingMen !== 'undefined' ? currentRatingMen : null, typeof currentRatingWomen !== 'undefined' ? currentRatingWomen : null].forEach(function (cr) {
      if (cr && cr.rows) cr.rows.forEach(function (r) { if (r.name === name) rating = r; });
    });
    var profBtn = '<p style="margin:12px 0 0"><button type="button" class="ms-btn sec sm" data-prof="1">Повний профіль на сайті ›</button></p>';
    if (!rows.length && !rating && !inLists) {
      return head + '<p class="sub">Профіль «' + esc(name) + '» на основному сайті поки не знайдено. Дані з\'являться після участі у всеукраїнських турнірах ВФД.</p></div>';
    }
    var sum = function (f) { return rows.reduce(function (a, r) { return a + (r[f] || 0); }, 0); };
    var cells = [];
    if (rating) cells.push(st(rating.rank + ' місце', 'у поточному рейтингу'), st(rating.total, 'балів рейтингу'));
    if (rows.length) {
      var avgs = rows.map(function (r) { return r.avg || 0; });
      var legsB = rows.filter(function (r) { return r.bestLeg > 8; }).map(function (r) { return r.bestLeg; });
      var mt = sum('match'), mw = sum('winMatch');
      cells.push(st(rows.length, 'турнірів із даними Nakka'), st((avgs.reduce(function (a, b) { return a + b; }, 0) / rows.length).toFixed(2), 'середній по турнірах'), st(Math.max.apply(null, avgs).toFixed(2), 'найкращий середній'),
        st(mt ? mw + ' / ' + mt : '—', 'матчів виграно / зіграно'), st(sum('ton80'), '180'), st(sum('highOutCount'), 'закриттів 100+'),
        st(Math.max.apply(null, rows.map(function (r) { return r.highOut || 0; })) || '—', 'найкраще закриття'), st(legsB.length ? Math.min.apply(null, legsB) + ' дрот.' : '—', 'найкращий лег'));
    }
    // місця на етапах Кубку України
    var g = 0, sl = 0, br = 0;
    if (year === 'all' && typeof leaderboard !== 'undefined') {
      var e = leaderboard.filter(function (p) { return p.name === name; })[0] || (typeof leaderboardWomen !== 'undefined' ? leaderboardWomen.filter(function (p) { return p.name === name; })[0] : null);
      if (e) { g = e.gold || 0; sl = e.silver || 0; br = e.bronze || 0; }
    } else if (typeof tournaments !== 'undefined') {
      tournaments.forEach(function (t) {
        if (t.isUDL || t.name !== 'Кубок України' || yearUa(t.date) !== year) return;
        [t.nakkaMedals || t.medals, t.nakkaMedalsWomen || t.medalsWomen].forEach(function (m) { if (!m) return; if (m.gold === name) g++; if (m.silver === name) sl++; if ((m.bronze || []).indexOf(name) >= 0) br++; });
      });
    }
    var medals = (g + sl + br) ? '<div class="ms-stat" style="grid-column:1/-1"><b>🥇 ' + g + ' · 🥈 ' + sl + ' · 🥉 ' + br + '</b><span>місця на етапах Кубку України</span></div>' : '';
    if (!cells.length && !medals) return head + '<p class="sub">За цей період немає даних про участь у всеукраїнських турнірах.</p>' + profBtn + '</div>';
    return head + '<div class="ms-stats">' + cells.join('') + medals + '</div>' + profBtn + '</div>';
  }
  function viewOverview() {
    var ys = yearsAvail();
    function inY(d) { return year === 'all' || yearOf(d) === year; }
    var ck = D.checkouts.filter(function (c) { return inY(c.achieved_at); });
    var ev = D.events.filter(function (e) { return inY(e.event_date); });
    var done = D.skills.filter(function (k) { return k.status === 'done' && k.done_at && inY(k.done_at); });
    var uniq = {}; ck.forEach(function (c) { uniq[c.value] = 1; });
    var avgs = ev.map(function (e) { return e.avg_game; }).filter(function (x) { return x != null; });
    var avg = avgs.length ? (avgs.reduce(function (a, b) { return a + Number(b); }, 0) / avgs.length).toFixed(2) : '—';
    var lp = 0, lw = 0, c180 = 0, c140 = 0, c100 = 0, best = null, hi = 0;
    ev.forEach(function (e) { lp += e.legs_played || 0; lw += e.legs_won || 0; c180 += e.c180; c140 += e.c140; c100 += e.c100; (e.best_legs || []).forEach(function (b) { if (best == null || b < best) best = b; }); (e.checkouts100 || []).forEach(function (b) { if (b > hi) hi = b; }); });
    ck.forEach(function (c) { if (c.value > hi) hi = c.value; });
    var sel = '<select class="ms-in" id="ms-year" style="width:auto"><option value="all"' + (year === 'all' ? ' selected' : '') + '>За весь період</option>' + ys.map(function (y) { return '<option' + (y === year ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>';
    var h = '<div class="ms-row" style="justify-content:space-between;margin-bottom:6px"><b style="font-size:17px">' + (year === 'all' ? 'Моя статистика · весь період' : 'Моя статистика · ' + year) + '</b>' + sel + '</div>' +
      '<p class="sub" style="margin:0 0 12px">У вас три окремі статистики. Вони не змішуються: різні джерела даних.</p>';
    h += siteBlock();
    h += '<div class="ms-src local"><div class="ms-srch"><b>🏆 Локальні турніри та зустрічі</b><span class="ms-badge">вручну · ваші записи</span></div>' +
      '<p class="sub" style="margin:2px 0 10px">Те, що ви вносите самі: журнал ігор, таблиця закриттів, щоденник саморозвитку.</p><div class="ms-stats">' +
      st(ev.length, 'ігор / турнірів у журналі') + st(avg, 'середній за гру') + st(lw + ' / ' + lp, 'леги виграно / зіграно') + st(c180 + ' · ' + c140 + ' · ' + c100, '180 · 140+ · 100+') +
      st(Object.keys(uniq).length + ' / ' + VALUES.length, 'різних закриттів у таблиці') + st(ck.length, 'усіх закриттів') + st(hi || '—', 'найвище закриття') + st(best != null ? best + ' дрот.' : '—', 'найкращий лег') +
      st(done.length, 'опанованих навичок') + '</div>' +
      '<p class="ms-row" style="margin:12px 0 0"><button type="button" class="ms-btn sec sm" data-t="events">Журнал ігор ›</button><button type="button" class="ms-btn sec sm" data-t="checkouts">Таблиця закриттів ›</button><button type="button" class="ms-btn sec sm" data-t="skills">Щоденник ›</button></p></div>';
    var tr = EXT.filter(function (x) { return x.overview; }).map(function (x) { return x.overview(year); }).join('');
    h += '<div class="ms-src train"><div class="ms-srch"><b>🎯 Тренування</b><span class="ms-badge">із тренувань у кабінеті</span></div>' +
      '<p class="sub" style="margin:2px 0 10px">Рахується з ваших тренувальних легів і вправ: 501DO, з тінню, 170+1, 60+10−1, сектор.</p>' + (tr || '<p class="sub">Ще немає тренувань за цей період.</p>') + '</div>';
    return h;
  }
  function st(v, l) { return '<div class="ms-stat"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }

  // ---------- Закриття ----------
  function viewCheckouts() {
    var cnt = {}; D.checkouts.forEach(function (c) { cnt[c.value] = (cnt[c.value] || 0) + 1; });
    var got = Object.keys(cnt).length, pct = Math.round(got / VALUES.length * 100);
    var w = canWrite();
    var h = '<div class="ms-card"><div class="ms-row" style="justify-content:space-between"><b>Таблиця закриттів</b><span class="sub" style="margin:0">' + got + ' з ' + VALUES.length + ' · ' + pct + '%</span></div><div class="ms-bar"><div style="width:' + pct + '%"></div></div>';
    h += '<div class="ms-row" style="margin-bottom:10px"><button type="button" class="ms-btn sm ' + (checkMode === 'add' ? '' : 'sec') + '" data-cm="add">+ Додати закриття</button><button type="button" class="ms-btn sm ' + (checkMode === 'hist' ? '' : 'sec') + '" data-cm="hist">🕑 Історія / правка</button>';
    if (checkMode === 'add' && w) h += '<label class="sub" style="margin:0;display:flex;gap:6px;align-items:center">Дата: <input type="date" id="ms-cdate" class="ms-in" style="width:auto" value="' + checkDate + '" max="' + today() + '"></label>';
    h += '</div><div class="ms-grid">' + VALUES.map(function (v) { return '<button type="button" class="ms-c' + (cnt[v] ? ' done' : '') + '" data-v="' + v + '">' + v + (cnt[v] ? '<i>' + cnt[v] + '</i>' : '') + '</button>'; }).join('') + '</div>';
    if (!w) h += '<p class="sub">Режим перегляду: додавання недоступне без тур-карти поточного року.</p>';
    return h + '</div>';
  }
  function addCheckout(v) {
    var d = checkDate || today(); if (d > today()) d = today();
    var at = d === today() ? new Date().toISOString() : new Date(d + 'T12:00:00').toISOString();
    sb.from('checkouts').insert({ value: v, achieved_at: at }).select('id,value,achieved_at').single().then(function (r) {
      if (r.error) throw r.error;
      D.checkouts.unshift(r.data); render();
      toast('Закриття ' + v + ' додано', function () { delCheckout(r.data.id, true); });
    }).catch(fail);
  }
  function delCheckout(id, quiet) {
    sb.from('checkouts').delete().eq('id', id).then(function (r) {
      if (r.error) return fail(r.error);
      D.checkouts = D.checkouts.filter(function (c) { return c.id !== id; });
      render(); if (!quiet) toast('Видалено');
    });
  }
  function histModal(v) {
    var list = D.checkouts.filter(function (c) { return c.value === v; });
    var m = document.createElement('div'); m.className = 'ms-modal'; m.setAttribute('data-i18n-skip', '');
    m.innerHTML = '<div><b style="font-size:18px">Закриття ' + v + '</b><p class="sub">' + (list.length ? 'Записів: ' + list.length : 'Ще не було') + '</p>' +
      list.map(function (c) { return '<div class="ms-item"><span>' + fmtDate(c.achieved_at) + '</span>' + (canWrite() ? '<button class="ms-x" data-del="' + c.id + '" type="button">✕</button>' : '') + '</div>'; }).join('') +
      '<p><button type="button" class="ms-btn sec sm" data-close="1">Закрити</button></p></div>';
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.getAttribute('data-close')) m.remove();
      var d = e.target.getAttribute('data-del'); if (d) { m.remove(); delCheckout(Number(d)); }
    });
    document.body.appendChild(m);
  }

  // ---------- Ігри ----------
  function viewEvents() {
    var w = canWrite(), h = '';
    if (w) {
      h += '<div class="ms-card"><b>Додати гру / турнір</b><form id="ms-evf" class="ms-f" style="margin-top:10px">' +
        '<label>Дата<input class="ms-in" type="date" name="event_date" required value="' + today() + '"></label>' +
        '<label>Назва<input class="ms-in" name="title" required maxlength="120" placeholder="Напр. Локальний турнір"></label>' +
        '<label>Середній за турнір<input class="ms-in" name="avg_tournament" inputmode="decimal"></label>' +
        '<label>Середній за гру<input class="ms-in" name="avg_game" inputmode="decimal"></label>' +
        '<label>Леги зіграні<input class="ms-in" name="legs_played" inputmode="numeric"></label>' +
        '<label>Леги виграні<input class="ms-in" name="legs_won" inputmode="numeric"></label>' +
        '<label>180<input class="ms-in" name="c180" inputmode="numeric" value="0"></label>' +
        '<label>140+<input class="ms-in" name="c140" inputmode="numeric" value="0"></label>' +
        '<label>100+<input class="ms-in" name="c100" inputmode="numeric" value="0"></label>' +
        '<label>Закриття через булл (к-сть)<input class="ms-in" name="bull_checkouts" inputmode="numeric" value="0"></label>' +
        '<label class="w">Закриття 100+ (значення через кому)<input class="ms-in" name="checkouts100" placeholder="напр. 120, 107"></label>' +
        '<label class="w">Найкращі леги (дротиків, через кому)<input class="ms-in" name="best_legs" placeholder="напр. 15, 18"></label>' +
        '<label class="w">Нотатки<input class="ms-in" name="notes" maxlength="500"></label>' +
        '<div class="w"><button class="ms-btn" type="submit">Зберегти</button></div></form></div>';
    }
    h += '<div class="ms-card"><b>Журнал</b>' + (D.events.length ? D.events.map(function (e) {
      return '<div class="ms-item"><div><b>' + esc(e.title) + '</b> · ' + fmtDate(e.event_date) + '<small>' +
        [e.avg_game != null ? 'сер. гра ' + e.avg_game : '', e.avg_tournament != null ? 'сер. турнір ' + e.avg_tournament : '', e.legs_played != null ? 'леги ' + (e.legs_won || 0) + '/' + e.legs_played : '',
        '180: ' + e.c180 + ' · 140+: ' + e.c140 + ' · 100+: ' + e.c100, (e.checkouts100 || []).length ? 'закриття 100+: ' + e.checkouts100.join(', ') : '', e.bull_checkouts ? 'булл: ' + e.bull_checkouts : '', (e.best_legs || []).length ? 'найкращі леги: ' + e.best_legs.join(', ') : '', e.notes || ''].filter(Boolean).map(esc).join(' · ') + '</small></div>' +
        (w ? '<button class="ms-x" data-delev="' + e.id + '" type="button">✕</button>' : '') + '</div>';
    }).join('') : '<p class="sub">Поки порожньо.</p>') + '</div>';
    return h;
  }
  function saveEvent(form) {
    var f = form.elements;
    var row = { event_date: f.event_date.value, title: f.title.value.trim(), avg_tournament: num(f.avg_tournament.value), avg_game: num(f.avg_game.value),
      legs_played: f.legs_played.value === '' ? null : int0(f.legs_played.value), legs_won: f.legs_won.value === '' ? null : int0(f.legs_won.value),
      c180: int0(f.c180.value), c140: int0(f.c140.value), c100: int0(f.c100.value), bull_checkouts: int0(f.bull_checkouts.value),
      checkouts100: nums(f.checkouts100.value), best_legs: nums(f.best_legs.value), notes: f.notes.value.trim() || null };
    if (!row.title) return;
    sb.from('local_events').insert(row).select('*').single().then(function (r) {
      if (r.error) throw r.error;
      D.events.unshift(r.data); D.events.sort(function (a, b) { return a.event_date < b.event_date ? 1 : -1; }); render(); toast('Збережено');
    }).catch(fail);
  }

  // ---------- Щоденник ----------
  function viewSkills() {
    var w = canWrite(), open = D.skills.filter(function (k) { return k.status === 'open'; }), done = D.skills.filter(function (k) { return k.status === 'done'; });
    var h = '';
    if (w) h += '<div class="ms-card"><b>Нова ціль / навичка</b><form id="ms-skf" style="margin-top:10px;display:grid;gap:8px"><input class="ms-in" name="title" required maxlength="140" placeholder="Що хочу опанувати? Напр. стабільний вихід на D16"><input class="ms-in" name="note" maxlength="500" placeholder="Нотатка (необов\'язково)"><div><button class="ms-btn" type="submit">Додати</button></div></form></div>';
    function it(k) {
      return '<div class="ms-item"><div>' + (k.status === 'done' ? '<span style="color:#2ecc71;font-weight:800">✓ </span>' : '') + '<b>' + esc(k.title) + '</b><small>' + (k.note ? esc(k.note) + '<br>' : '') + 'Додано ' + fmtDate(k.created_at) + (k.status === 'done' ? ' · опановано ' + fmtDate(k.done_at) : '') + (k.result ? '<br>Результат: ' + esc(k.result) : '') + '</small></div>' +
        (w ? '<div class="ms-row" style="flex:none;flex-wrap:nowrap">' + (k.status === 'open' ? '<button class="ms-btn ok sm" type="button" data-skdone="' + k.id + '">✓</button>' : '<button class="ms-btn sec sm" type="button" data-skopen="' + k.id + '">↺</button>') + '<button class="ms-x" type="button" data-skdel="' + k.id + '">✕</button></div>' : '') + '</div>';
    }
    h += '<div class="ms-card"><b>В роботі (' + open.length + ')</b>' + (open.map(it).join('') || '<p class="sub">Немає активних цілей.</p>') + '</div>';
    h += '<div class="ms-card"><b>Опановано (' + done.length + ')</b>' + (done.map(it).join('') || '<p class="sub">Поки нічого.</p>') + '</div>';
    return h;
  }
  function skillUpdate(id, patch) {
    sb.from('skills').update(patch).eq('id', id).select('*').single().then(function (r) {
      if (r.error) throw r.error;
      D.skills = D.skills.map(function (k) { return k.id === id ? r.data : k; }); render();
    }).catch(fail);
  }
  function doneModal(id) {
    var m = document.createElement('div'); m.className = 'ms-modal'; m.setAttribute('data-i18n-skip', '');
    m.innerHTML = '<div><b>Навичку опановано 🎉</b><p class="sub">Що вийшло? (необов\'язково)</p><input class="ms-in" id="ms-res" maxlength="300" placeholder="Результат"><p class="ms-row"><button type="button" class="ms-btn" data-ok="1">Зберегти</button><button type="button" class="ms-btn sec" data-close="1">Скасувати</button></p></div>';
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.getAttribute('data-close')) m.remove();
      if (e.target.getAttribute('data-ok')) { var v = m.querySelector('#ms-res').value.trim(); m.remove(); skillUpdate(id, { status: 'done', done_at: new Date().toISOString(), result: v || null }); }
    });
    document.body.appendChild(m);
  }

  // ---------- дії ----------
  // ---------- експорт в Excel (.xlsx без сторонніх бібліотек) ----------
  var XMIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  function crc32(buf) {
    var t = crc32.t; if (!t) { t = crc32.t = []; for (var n = 0; n < 256; n++) { var c0 = n; for (var k = 0; k < 8; k++) c0 = c0 & 1 ? 0xEDB88320 ^ (c0 >>> 1) : c0 >>> 1; t[n] = c0 >>> 0; } }
    var c = 0xFFFFFFFF; for (var i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], cd = [], off = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data), sz = data.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(lh.buffer), nm, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      cd.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + sz;
    });
    var cdsize = 0; cd.forEach(function (x) { cdsize += x.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdsize, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(end.buffer)]), { type: XMIME });
  }
  function xesc(v) { return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function colL(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(rows) {
    var widths = []; rows.forEach(function (r) { r.forEach(function (v, i) { var l = v == null ? 0 : String(v).length; widths[i] = Math.min(60, Math.max(widths[i] || 8, l + 2)); }); });
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
    widths.forEach(function (w, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; });
    x += '</cols><sheetData>';
    rows.forEach(function (r, ri) {
      x += '<row r="' + (ri + 1) + '">';
      r.forEach(function (v, ci) {
        if (v == null || v === '') return;
        var ref = colL(ci) + (ri + 1);
        if (typeof v === 'number' && isFinite(v) && ri > 0) x += '<c r="' + ref + '"><v>' + v + '</v></c>';
        else x += '<c r="' + ref + '" t="inlineStr"' + (ri === 0 ? ' s="1"' : '') + '><is><t xml:space="preserve">' + xesc(v) + '</t></is></c>';
      });
      x += '</row>';
    });
    return x + '</sheetData></worksheet>';
  }
  function buildXlsx(sheets) {
    var used = {};
    sheets.forEach(function (sh, i) { var n = String(sh.name).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || ('Аркуш' + (i + 1)); while (used[n.toLowerCase()]) n = n.slice(0, 28) + '_' + i; used[n.toLowerCase()] = 1; sh._n = n; });
    var files = [];
    files.push({ name: '[Content_Types].xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (_, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' });
    files.push({ name: '_rels/.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
    files.push({ name: 'xl/workbook.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (sh, i) { return '<sheet name="' + xesc(sh._n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' });
    files.push({ name: 'xl/_rels/workbook.xml.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (_, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
    files.push({ name: 'xl/styles.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' });
    sheets.forEach(function (sh, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXml(sh.rows) }); });
    return zipStore(files);
  }
  function fd(s) { if (!s) return ''; var d = new Date(s); if (isNaN(d)) return String(s); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
  function exportData() {
    try {
      var sheets = [];
      var ck = D.checkouts.slice().sort(function (a, b) { return a.achieved_at < b.achieved_at ? 1 : -1; });
      sheets.push({ name: 'Закриття', rows: [['Дата', 'Закриття']].concat(ck.map(function (c) { return [fd(c.achieved_at), c.value]; })) });
      sheets.push({ name: 'Ігри', rows: [['Дата', 'Назва', 'Середній за турнір', 'Середній за гру', 'Леги зіграні', 'Леги виграні', '180', '140+', '100+', 'Закриття 100+', 'Закриття через булл', 'Найкращі леги', 'Нотатки']].concat(D.events.map(function (e) { return [fd(e.event_date), e.title, e.avg_tournament, e.avg_game, e.legs_played, e.legs_won, e.c180, e.c140, e.c100, (e.checkouts100 || []).join(', '), e.bull_checkouts, (e.best_legs || []).join(', '), e.notes]; })) });
      sheets.push({ name: 'Щоденник', rows: [['Ціль / навичка', 'Нотатка', 'Статус', 'Додано', 'Опановано', 'Результат']].concat(D.skills.map(function (k) { return [k.title, k.note, k.status === 'done' ? 'опановано' : 'в роботі', fd(k.created_at), fd(k.done_at), k.result]; })) });
      EXT.forEach(function (x) { if (x.exportSheets) x.exportSheets().forEach(function (sh) { sheets.push(sh); }); });
      var blob = buildXlsx(sheets);
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vfd-moi-dani-' + today() + '.xlsx'; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      toast('Файл Excel сформовано');
    } catch (e) { fail(e); }
  }
  function wipe() {
    if (!confirm('Видалити ВСІ ваші дані з «Мого простору» (закриття, ігри, щоденник, згоду)? Це незворотно.')) return;
    sb.rpc('delete_my_data').then(function (r) { if (r.error) return fail(r.error); D = { checkouts: [], events: [], skills: [] }; window.__ms.reset(); needConsent = true; render(); toast('Дані видалено'); });
  }

  sec.addEventListener('click', function (e) {
    var t = e.target;
    var b = t.closest('[data-prof],[data-t],[data-a],[data-v],[data-cm],[data-delev],[data-skdone],[data-skopen],[data-skdel]'); if (!b) return;
    if (b.hasAttribute('data-prof')) { if (typeof openPlayerProfile === 'function') openPlayerProfile(siteName(member.player_name)); }
    else if (b.hasAttribute('data-t')) { tab = b.getAttribute('data-t'); window.scrollTo(0, 0); render(); }
    else if (b.hasAttribute('data-cm')) { checkMode = b.getAttribute('data-cm'); render(); }
    else if (b.hasAttribute('data-v')) { var v = Number(b.getAttribute('data-v')); if (checkMode === 'hist' || !canWrite()) histModal(v); else addCheckout(v); }
    else if (b.hasAttribute('data-delev')) { if (confirm('Видалити запис?')) { var id = Number(b.getAttribute('data-delev')); sb.from('local_events').delete().eq('id', id).then(function (r) { if (r.error) return fail(r.error); D.events = D.events.filter(function (x) { return x.id !== id; }); render(); }); } }
    else if (b.hasAttribute('data-skdone')) doneModal(Number(b.getAttribute('data-skdone')));
    else if (b.hasAttribute('data-skopen')) skillUpdate(Number(b.getAttribute('data-skopen')), { status: 'open', done_at: null, result: null });
    else if (b.hasAttribute('data-skdel')) { if (confirm('Видалити?')) { var sid = Number(b.getAttribute('data-skdel')); sb.from('skills').delete().eq('id', sid).then(function (r) { if (r.error) return fail(r.error); D.skills = D.skills.filter(function (x) { return x.id !== sid; }); render(); }); } }
    else { var a = b.getAttribute('data-a'); if (a === 'install') { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } else installHelp(); } else if (a === 'logout') sb.auth.signOut(); else if (a === 'export') exportData(); else if (a === 'wipe') wipe(); }
  });
  sec.addEventListener('change', function (e) { if (e.target.id === 'ms-year') { year = e.target.value === 'all' ? 'all' : Number(e.target.value); render(); } if (e.target.id === 'ms-cdate' && e.target.value) { checkDate = e.target.value; render(); } });
  sec.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'ms-evf') saveEvent(e.target);
    if (e.target.id === 'ms-skf') { var f = e.target.elements; var title = f.title.value.trim(); if (!title) return; sb.from('skills').insert({ title: title, note: f.note.value.trim() || null }).select('*').single().then(function (r) { if (r.error) throw r.error; D.skills.unshift(r.data); render(); }).catch(fail); }
  });

  var EXT = window.__msExt || [];
  window.__ms = {
    sb: function () { return sb; }, canWrite: canWrite, render: render, esc: esc, toast: toast, fail: fail, el: sec,
    member: function () { return member; }, year: function () { return year; }, reset: function () { EXT.forEach(function (x) { x.reset && x.reset(); }); },
    setTab: function (t) { tab = t; render(); }
  };
  init();
})();

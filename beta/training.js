/* ВФД · «Мій простір» · етап 2 · тренування 501DO (лічильник, «тінь», статистика) */
(function () {
  'use strict';
  var SKIP = [159, 162, 163, 165, 166, 168, 169];
  var BADSCORE = [163, 166, 169, 172, 173, 175, 176, 178, 179];
  var QUICK = [26, 41, 45, 60, 85, 100, 140, 180];
  var T = { legs: [], drills: [], period: 'all', game: '501', ghostPick: false, detail: null };
  var ml = null, sl = null;
  var live = null, wake = null;

  function MS() { return window.__ms; }
  function esc(s) { return MS().esc(s); }
  function uuid() { try { return crypto.randomUUID(); } catch (e) { return 'x' + Date.now() + Math.random().toString(16).slice(2); } }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function lget(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lset(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ---------- CSS ----------
  var css = document.createElement('style');
  css.textContent = [
    'body.ms-live .bbar,body.ms-live .bt,body.ms-live .chipbar,body.ms-live footer{display:none !important}body.ms-live{padding-bottom:0}body.ms-live #my-space{padding-top:10px}',
    '.tr-live{user-select:none;-webkit-user-select:none;touch-action:manipulation}',
    '.tr-top{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted);margin-bottom:6px;gap:8px}',
    '.tr-rem{text-align:center;font:800 76px/1 Montserrat,Inter,sans-serif;color:var(--gold);margin:6px 0 2px}',
    '.tr-rem small{display:block;font:600 12px Inter,sans-serif;color:var(--muted);margin-top:4px}',
    '.tr-ghost{background:#1d2250;border:1px solid var(--royal-light);border-radius:12px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:13px;margin:6px 0}',
    '.tr-ghost b{font:800 22px Montserrat,Inter,sans-serif}.tr-ghost.lose{border-color:#c0392b}.tr-ghost.win{border-color:#2e8b57}',
    '.tr-last{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;min-height:26px;margin:4px 0}',
    '.tr-last span{background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:3px 9px;font:700 13px Inter,sans-serif}',
    '.tr-ent{background:var(--bg);border:1px solid var(--line);border-radius:12px;text-align:center;font:800 40px/1.4 Montserrat,Inter,sans-serif;min-height:58px;margin:6px 0}',
    '.tr-ent.shake{animation:trsh .25s}@keyframes trsh{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}',
    '.tr-q{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}',
    '.tr-q button{background:var(--panel-2);border:1px solid var(--line);color:var(--cream);border-radius:10px;padding:11px 0;font:700 16px Inter,sans-serif;cursor:pointer}',
    '.tr-kp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.tr-kp button{background:var(--panel);border:1px solid var(--line);color:var(--cream);border-radius:14px;height:58px;font:700 26px Inter,sans-serif;cursor:pointer}',
    '.tr-kp button:active,.tr-q button:active{background:var(--royal)}',
    '.tr-kp .ok{background:var(--gold);color:#101535;border-color:var(--gold)}',
    '.tr-d{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.tr-d button{height:70px;font:800 28px Inter,sans-serif;background:var(--panel);border:1px solid var(--gold);color:var(--gold);border-radius:14px;cursor:pointer}',
    '.tr-bars{display:flex;align-items:flex-end;gap:4px;height:112px;margin-top:8px;overflow-x:auto}.tr-bars div{flex:1 0 24px;text-align:center;font-size:10px;color:var(--muted)}.tr-bars i{display:block;background:var(--royal-light);border-radius:4px 4px 0 0;min-height:2px;margin-bottom:3px}.tr-bars b{display:block;font-size:11px;color:var(--cream)}',
    '.tr-sec{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.tr-sec.four{grid-template-columns:1fr 1fr}.tr-sec.three{grid-template-columns:1fr 1fr 1fr}.tr-sec.three button{height:110px;font-size:18px}.tr-sec button{height:96px;border-radius:16px;border:1px solid var(--line);background:var(--panel);color:var(--cream);font:800 22px Inter,sans-serif;cursor:pointer}.tr-sec button small{font:700 14px Inter,sans-serif;color:var(--muted)}.tr-sec .yes{background:#1c3b2a;border-color:#2e8b57;color:#8fe3b0}.tr-sec .no{background:#3b1c1c;border-color:#a33;color:#ff9d9d}.tr-sec button:active{filter:brightness(1.4)}',
    '.tr-sg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.tr-sg button{background:var(--bg);border:1px solid var(--line);color:var(--cream);border-radius:10px;padding:12px 0;font:700 16px Inter,sans-serif;cursor:pointer}',
    '.kbhint{display:none}@media(hover:hover) and (pointer:fine){.kbhint{display:block}}',
    '.tr-leg{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:9px 0;font-size:13px}.tr-leg:first-child{border-top:0}'
  ].join('\n');
  document.head.appendChild(css);

  // ---------- дані ----------
  var LSEL_BASE = 'id,client_id,played_at,mode,scores,darts,last_darts,finished,ghost_result';
  var LSEL_EXT = LSEL_BASE + ',match_id,best_of,ghost_scores,ghost_darts';
  var EXTRA = ['match_id', 'best_of', 'ghost_scores', 'ghost_darts'];
  function fetchLegs() {
    var sb = MS().sb();
    function q(cols) { return sb.from('legs').select(cols).eq('finished', true).order('played_at', { ascending: false }).limit(3000); }
    return q(LSEL_EXT).then(function (r) { return r.error ? q(LSEL_BASE) : r; });
  }
  // мінімальна кількість дротиків для закриття залишку r
  var SC1 = (function () { var a = [0], i; for (i = 1; i <= 20; i++) { a.push(i, i * 2, i * 3); } a.push(25, 50); return a; })();
  var DBL = (function () { var a = [50], i; for (i = 1; i <= 20; i++) a.push(i * 2); return a; })();
  function minDarts(r) {
    if (DBL.indexOf(r) >= 0) return 1;
    var i, j;
    for (i = 0; i < SC1.length; i++) if (DBL.indexOf(r - SC1[i]) >= 0) return 2;
    return 3;
  }
  function dartBtns(r) {
    var mn = minDarts(r);
    return '<div class="tr-d">' + [1, 2, 3].map(function (d) { return '<button type="button" data-tr="d" data-d="' + d + '"' + (d < mn ? ' disabled style="opacity:.2"' : '') + '>' + d + '</button>'; }).join('') + '</div>';
  }
  function nDarts(scores, finished, last) { return finished ? 3 * (scores.length - 1) + last : 3 * scores.length; }
  function load() {
    var sb = MS().sb(); if (!sb) return Promise.resolve();
    return fetchLegs().then(function (r) { if (r.error) throw r.error; T.legs = merge(r.data || []); return flush(); }).then(loadDrills);
  }
  function merge(rows) {
    var have = {}; rows.forEach(function (r) { have[r.client_id] = 1; });
    var extra = queue().filter(function (q) { return !have[q.client_id]; }).map(function (q) { return Object.assign({ id: 'local-' + q.client_id }, q); });
    return extra.concat(rows).sort(function (a, b) { return a.played_at < b.played_at ? 1 : -1; });
  }
  var DSEL = 'id,client_id,played_at,game,param,target,success,darts,scores,detail';
  function dqueue() { return lget('ms_dq') || []; }
  function dmerge(rows) {
    var have = {}; rows.forEach(function (r) { have[r.client_id] = 1; });
    var extra = dqueue().filter(function (q) { return !have[q.client_id]; }).map(function (q) { return Object.assign({ id: 'local-' + q.client_id }, q); });
    return extra.concat(rows).sort(function (a, b) { return a.played_at < b.played_at ? 1 : -1; });
  }
  function loadDrills() {
    var sb = MS().sb(); if (!sb) return Promise.resolve();
    return sb.from('drills').select(DSEL).order('played_at', { ascending: false }).limit(3000).then(function (r) {
      if (r.error) { console.warn('drills', r.error.message); T.drills = dmerge([]); return; }
      T.drills = dmerge(r.data || []); return flushD();
    });
  }
  var dflushing = false;
  function flushD() {
    var sb = MS().sb(), q = dqueue(); if (!sb || !q.length || !MS().canWrite() || dflushing) return Promise.resolve();
    dflushing = true;
    return sb.from('drills').upsert(q, { onConflict: 'user_id,client_id', ignoreDuplicates: true }).then(function (r) {
      dflushing = false;
      if (r.error) { console.warn('drills sync later', r.error.message); return; }
      lset('ms_dq', dqueue().filter(function (x) { return !q.some(function (y) { return y.client_id === x.client_id; }); }));
      return sb.from('drills').select(DSEL).order('played_at', { ascending: false }).limit(3000).then(function (r2) { if (!r2.error) T.drills = dmerge(r2.data || []); if (dqueue().length) return flushD(); });
    }, function () { dflushing = false; });
  }
  function saveDrill(row) {
    T.drills.unshift(Object.assign({ id: 'local-' + row.client_id }, row));
    var q = dqueue(); q.push(row); lset('ms_dq', q); flushD();
  }
  window.addEventListener('online', function () { flushD(); });
  function queue() { return lget('ms_q') || []; }
  var flushing = false;
  function flush() {
    var sb = MS().sb(), q = queue(); if (!sb || !q.length || !MS().canWrite() || flushing) return Promise.resolve();
    flushing = true;
    function up(rows) { return sb.from('legs').upsert(rows, { onConflict: 'user_id,client_id', ignoreDuplicates: true }); }
    function strip(rows) { return rows.map(function (r) { var c = Object.assign({}, r); EXTRA.forEach(function (k) { delete c[k]; }); return c; }); }
    return up(q).then(function (r) { return r.error && /column|schema cache/i.test(r.error.message || '') ? up(strip(q)) : r; }).then(function (r) {
      flushing = false;
      if (r.error) { console.warn('sync later', r.error.message); return; }
      lset('ms_q', queue().filter(function (x) { return !q.some(function (y) { return y.client_id === x.client_id; }); }));
      return fetchLegs().then(function (r2) { if (!r2.error) T.legs = merge(r2.data || []); if (queue().length) return flush(); });
    }, function () { flushing = false; });
  }
  window.addEventListener('online', function () { flush(); });
  function saveLeg(row) {
    T.legs.unshift(Object.assign({ id: 'local-' + row.client_id }, row));
    var q = queue(); q.push(row); lset('ms_q', q); flush();
  }

  // ---------- логіка лега ----------
  function rem() { return (live.start || 501) - sum(live.scores); }
  function darts() { return nDarts(live.scores, live.finished, live.lastDarts); }
  function ghostStatus() {
    if (!live.ghost) return null;
    var n = live.scores.length, g = live.ghost.scores.length;
    if (live.finished) { if (n < g) return 'win'; if (n === g) return darts() <= live.ghost.darts ? 'win' : 'loss'; return 'loss'; }
    return n >= g ? 'loss' : null;
  }
  function ghostRem() { if (!live.ghost) return null; var n = Math.min(live.scores.length, live.ghost.scores.length); return 501 - sum(live.ghost.scores.slice(0, n)); }
  function persist() { lset('ms_live', live && !live.done ? live : null); }
  function wakeOn() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }, function () {}); } catch (e) {} }
  function wakeOff() { try { wake && wake.release(); } catch (e) {} wake = null; }
  function setLive(l) { live = l; document.body.classList.toggle('ms-live', !!l); if (l && !l.done) wakeOn(); else wakeOff(); persist(); window.scrollTo(0, 0); MS().render(); }

  function pickGhost(excl) {
    var pool = T.legs.filter(function (l) { return l.finished !== false && l.scores && l.scores.length; }).slice(0, 50);
    if (!pool.length) return null;
    var fresh = pool.filter(function (l) { return !excl || excl.indexOf(l.client_id) < 0; });
    if (fresh.length) pool = fresh;
    var g = pool[Math.floor(Math.random() * pool.length)];
    return { id: typeof g.id === 'number' ? g.id : null, key: g.client_id, scores: g.scores, darts: g.darts };
  }
  function startMatch(bo) { nextMatchLeg({ id: uuid(), bestOf: bo, need: (bo + 1) / 2, w: 0, l: 0, used: [] }); }
  function nextMatchLeg(match) {
    var g = pickGhost(match.used); if (!g) return;
    match.used.push(g.key);
    setLive({ id: uuid(), mode: 'ghost', match: match, scores: [], entry: '', ghost: g, finished: false, lastDarts: 3, pending: null, startedAt: new Date().toISOString() });
  }
  function start(mode) {
    var g = null;
    if (mode === 'ghost') { g = pickGhost(); if (!g) return; }
    setLive({ id: uuid(), mode: mode, scores: [], entry: '', ghost: g, finished: false, lastDarts: 3, pending: null, startedAt: new Date().toISOString() });
  }
  function bad(msg) { var e = document.querySelector('.tr-ent'); if (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); } MS().toast(msg); }
  function submit(score) {
    if (!live || live.finished || live.pending != null) return;
    if (!isFinite(score) || score < 0 || score > 180 || BADSCORE.indexOf(score) >= 0) { live.entry = ''; MS().render(); return bad('Такий рахунок за три дротики неможливий'); }
    var r = rem(), nr = r - score;
    live.entry = '';
    if (nr === 0 && r <= 170 && SKIP.indexOf(r) < 0) { live.pending = score; if (minDarts(r) >= 3) return chooseDarts(3); persist(); return MS().render(); }
    if (nr <= 1) { live.scores.push(0); MS().toast('Перебір: рахунок 0'); }
    else live.scores.push(score);
    if (live.kind === 'p171' && live.scores.length >= live.maxV) return endP171(false);
    persist(); MS().render();
  }
  function chooseDarts(d) {
    if (live.kind === 'p171') { live.scores.push(live.pending); live.pending = null; live.lastDarts = d; return endP171(true); }
    live.scores.push(live.pending); live.pending = null; live.finished = true; live.lastDarts = d;
    var row = { client_id: live.id, played_at: new Date().toISOString(), mode: live.mode, start_score: 501, scores: live.scores.slice(), darts: darts(), last_darts: d, finished: true,
      ghost_leg_id: live.ghost ? live.ghost.id : null, ghost_result: ghostStatus() };
    if (live.ghost) { row.ghost_scores = live.ghost.scores; row.ghost_darts = live.ghost.darts; }
    if (live.match) { row.match_id = live.match.id; row.best_of = live.match.bestOf; if (row.ghost_result === 'win') live.match.w++; else live.match.l++; }
    saveLeg(row); live.done = true; lset('ms_live', null); wakeOff(); MS().render();
  }
  function undo() {
    if (!live || live.finished) return;
    if (live.pending != null) { live.pending = null; } else if (live.scores.length) { live.scores.pop(); }
    live.entry = ''; persist(); MS().render();
  }
  function quit(force) {
    if (!force && live && !live.done && live.scores.length && !confirm('Вийти з лега? Прогрес буде втрачено.')) return;
    live = null; document.body.classList.remove('ms-live'); wakeOff(); lset('ms_live', null); MS().render();
  }

  // ---------- 170+1 ----------
  function p171State(V) {
    var rows = T.drills.filter(function (r) { return r.game === 'p171' && r.param === V; }).sort(function (a, b) { return a.played_at < b.played_at ? -1 : 1; });
    var t = 170, comp = 0, ok = 0;
    rows.forEach(function (r) { if (r.success) { ok++; if (r.target >= 180) comp++; } });
    if (rows.length) { var lr = rows[rows.length - 1]; t = lr.success ? lr.target + 1 : lr.target; if (t > 180 || t < 170) t = 170; }
    return { target: t, comp: comp, tries: rows.length, ok: ok };
  }
  function startP171(V) {
    var st = p171State(V);
    setLive({ id: uuid(), kind: 'p171', start: st.target, maxV: V, sess: [], scores: [], entry: '', ghost: null, finished: false, lastDarts: 3, pending: null, startedAt: new Date().toISOString() });
  }
  function endP171(ok) {
    var dd = nDarts(live.scores, ok, live.lastDarts);
    saveDrill({ client_id: live.id, played_at: new Date().toISOString(), game: 'p171', param: live.maxV, target: live.start, success: ok,
      darts: dd, scores: live.scores.slice(), detail: { left: live.start - sum(live.scores) } });
    live.sess = live.sess || [];
    live.sess.push({ target: live.start, ok: ok, darts: dd, scores: live.scores.slice() });
    live.pending = null;
    if (ok && live.start >= 180) { live.done = true; live.completed = true; lset('ms_live', null); wakeOff(); return MS().render(); }
    var next = ok ? live.start + 1 : live.start;
    MS().toast(ok ? 'Закрито ' + live.start + '! Далі ' + next : 'Не закрито. Ще раз ' + next);
    live.start = next; live.scores = []; live.entry = ''; live.finished = false; live.failed = false; live.lastDarts = 3; live.id = uuid();
    persist(); MS().render();
  }
  function endP171Session() {
    if (!live.sess || !live.sess.length) return quit(true);
    if (live.scores.length && !confirm('Поточна спроба не буде врахована. Завершити тренування?')) return;
    live.done = true; live.completed = false; lset('ms_live', null); wakeOff(); MS().render();
  }
  function delMatch(id) {
    var m = matches().filter(function (x) { return x.id === id; })[0]; if (!m || !confirm('Видалити цей матч зі статистики?')) return;
    var ids = m.legs.filter(function (l) { return typeof l.id === 'number'; }).map(function (l) { return l.id; }), cids = m.legs.map(function (l) { return l.client_id; });
    function done() { T.legs = T.legs.filter(function (l) { return cids.indexOf(l.client_id) < 0; }); lset('ms_q', queue().filter(function (x) { return cids.indexOf(x.client_id) < 0; })); T.detail = null; MS().render(); }
    if (!ids.length) return done();
    MS().sb().from('legs').delete().in('id', ids).then(function (r) { if (r.error) return MS().fail(r.error); done(); });
  }
  function again() {
    var k = live.kind, V = live.maxV, mt = live.match; live = null;
    if (k === 'p171') startP171(V);
    else if (mt) { if (mt.w >= mt.need || mt.l >= mt.need) startMatch(mt.bestOf); else nextMatchLeg(mt); }
    else start('solo');
  }
  function padHtml(n) {
    return '<div class="tr-ent" id="tr-ent">' + (live.entry || '<span style="color:var(--muted)">0</span>') + '</div>' +
      '<div class="tr-q">' + QUICK.map(function (q) { return '<button type="button" data-tr="q" data-n="' + q + '">' + q + '</button>'; }).join('') + '</div>' +
      '<div class="tr-kp">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (d) { return '<button type="button" data-tr="k" data-n="' + d + '">' + d + '</button>'; }).join('') +
      '<button type="button" data-tr="bs">⌫</button><button type="button" data-tr="k" data-n="0">0</button><button type="button" class="ok" data-tr="ok">OK</button></div>' +
      '<p style="text-align:center;margin:12px 0 0"><button type="button" class="ms-btn sec sm" data-tr="undo"' + (n ? '' : ' disabled') + '>↶ Скасувати візит</button></p><p class="sub kbhint" style="text-align:center;margin:8px 0 0">З клавіатури: цифри · Enter · Backspace · Delete</p>';
  }
  function viewP171() {
    var V = live.maxV, n = live.scores.length;
    if (live.done) {
      var ss = live.sess || [], okc = 0, best = 0, dts = 0, c100 = 0, s100 = 0;
      ss.forEach(function (x) { dts += x.darts; if (x.ok) { okc++; if (x.target > best) best = x.target; if (x.scores[x.scores.length - 1] >= 100) c100++; } x.scores.forEach(function (v) { if (v >= 100) s100++; }); });
      var nxt = p171State(V).target;
      return '<div class="tr-live"><h2>' + (live.completed ? 'Цикл 170–180 пройдено 🏆' : 'Тренування завершено') + '</h2>' +
        '<div class="ms-stats" style="margin:10px 0">' + stt(ss.length, 'спроб') + stt(okc, 'закрито') + stt(best || '—', 'найвища закрита ціль') + stt(dts, 'витрачено дротиків') + stt(c100, 'закриттів 100+') + stt(s100, 'підходів 100+') + '</div>' +
        '<div class="ms-row" style="margin-top:12px"><button type="button" class="ms-btn" data-tr="again">Продовжити · ціль ' + nxt + '</button><button type="button" class="ms-btn sec" data-tr="done">Готово</button></div></div>';
    }
    var r = rem(), body;
    if (live.pending != null) body = '<p class="sub" style="text-align:center;margin:12px 0 0">Закриття ' + r + '. Яким дротиком закрили?</p>' + dartBtns(r) + '<p style="text-align:center"><button type="button" class="ms-btn sec sm" data-tr="undo">↶ Скасувати введення</button></p>';
    else body = padHtml(n);
    return '<div class="tr-live"><div class="tr-top"><button type="button" class="ms-btn sec sm" data-tr="p-end">⏹ Завершити</button><span>170+1 · ціль ' + live.start + (live.sess && live.sess.length ? ' · закрито ' + live.sess.filter(function (x) { return x.ok; }).length : '') + '</span><span>підхід ' + (n + 1) + '/' + V + '</span></div>' +
      '<div class="tr-rem">' + r + '<small>залишилось · підходів лишилось ' + (V - n) + '</small></div><div class="tr-last">' + live.scores.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' + body + '</div>';
  }
  function viewP171Home() {
    var w = MS().canWrite(), h = '<div class="ms-card"><b>170+1</b><p class="sub" style="margin:4px 0 10px">Почніть із закриття 170, далі 171, 172… до 180: цілі понад 170 закриваються за кілька підходів. Обираєте кількість підходів на ціль. Закрили: одразу наступна ціль із тією ж кількістю підходів. Не закрили: та сама ціль ще раз. Тренування триває, поки не закриєте 180 або не натиснете «Завершити». Прогрес зберігається.</p><div class="ms-row">';
    [2, 3, 4, 5].forEach(function (V) { var st = p171State(V); h += '<button type="button" class="ms-btn sec" data-tr="p-start" data-vv="' + V + '" ' + (w ? '' : 'disabled') + '>' + V + ' підходи · ціль ' + st.target + '</button>'; });
    h += '</div></div>';
    var all = T.drills.filter(function (r) { return r.game === 'p171'; });
    if (!all.length) return h;
    var darts = 0, ok = 0, c100 = 0, s100 = 0;
    all.forEach(function (r) { darts += r.darts; if (r.success) { ok++; var last = r.scores[r.scores.length - 1]; if (last >= 100) c100++; } r.scores.forEach(function (x) { if (x >= 100) s100++; }); });
    h += '<div class="ms-card"><b>Статистика · ' + all.length + ' спроб</b><div class="ms-stats" style="margin-top:10px">' + stt(Math.round(ok / all.length * 100) + '%', 'успішних спроб') + stt(darts, 'витрачено дротиків') + stt(c100, 'закриттів 100+') + stt(s100, 'підходів 100+') + '</div></div>';
    h += '<div class="ms-card"><b>Прогрес за режимами</b>' + [2, 3, 4, 5].map(function (V) {
      var st = p171State(V); if (!st.tries) return '';
      return '<div style="margin-top:10px;font-size:13px">' + V + ' підходи · ціль <b>' + st.target + '</b> · успішно ' + st.ok + '/' + st.tries + (st.comp ? ' · циклів 🏅' + st.comp : '') + '<div class="ms-bar"><div style="width:' + ((st.target - 170) * 10) + '%"></div></div></div>';
    }).join('') + '</div>';
    return h;
  }

  // ---------- 60+10-1 ----------
  function validTarget(t, dir) { t = Math.max(41, Math.min(170, t)); while (SKIP.indexOf(t) >= 0) t += dir; return t; }
  function mStart() { ml = { id: uuid(), t: 60, att: [] }; document.body.classList.add('ms-live'); wakeOn(); MS().render(); }
  function mAnswer(ok) {
    ml.att.push({ t: ml.t, ok: ok });
    if (ok && ml.t >= 170) return mEnd(true);
    ml.t = ok ? validTarget(ml.t + 10, -1) : validTarget(ml.t - 1, -1);
    MS().render();
  }
  function mEnd(top) {
    var att = ml.att;
    if (att.length) {
      var best = 0, hits = 0; att.forEach(function (a) { if (a.ok) { hits++; if (a.t > best) best = a.t; } });
      saveDrill({ client_id: ml.id, played_at: new Date().toISOString(), game: 'm60', param: null, target: best || null, success: !!top, darts: att.length * 3, scores: att.map(function (a) { return a.t; }), detail: { oks: att.map(function (a) { return a.ok ? 1 : 0; }) } });
    }
    var summary = { n: att.length, hits: att.filter(function (a) { return a.ok; }).length, best: att.reduce(function (m, a) { return a.ok && a.t > m ? a.t : m; }, 0), top: !!top };
    ml = { summary: summary }; wakeOff(); MS().render();
  }
  function viewM60() {
    if (!ml) return null;
    if (ml.summary) { var s = ml.summary; return '<div class="tr-live"><h2>' + (s.top ? 'Дійшли до 170 🏆' : 'Тренування завершено') + '</h2><div class="ms-stats" style="margin:10px 0">' + stt(s.n, 'підходів') + stt(s.hits, 'закрито') + stt(s.best || '—', 'найвище закриття') + stt(s.n ? Math.round(s.hits / s.n * 100) + '%' : '—', 'влучність') + '</div><div class="ms-row"><button type="button" class="ms-btn" data-tr="m-start">Ще раз</button><button type="button" class="ms-btn sec" data-tr="m-close">Готово</button></div></div>'; }
    var n = ml.att.length, hits = ml.att.filter(function (a) { return a.ok; }).length;
    return '<div class="tr-live"><div class="tr-top"><button type="button" class="ms-btn sec sm" data-tr="m-quit">✕ Вийти</button><span>60+10−1</span><span>підходів ' + n + ' · закрито ' + hits + '</span></div>' +
      '<div class="tr-rem">' + ml.t + '<small>закрийте за один підхід (3 дротики)</small></div>' +
      '<div class="tr-last">' + ml.att.slice(-8).map(function (a) { return '<span style="color:' + (a.ok ? '#8fe3b0' : '#ff8d8d') + '">' + a.t + (a.ok ? ' ✓' : ' ✗') + '</span>'; }).join('') + '</div>' +
      '<div class="tr-sec"><button type="button" class="yes" data-tr="m-ok">✓ Закрито<br><small>+10 → ' + validTarget(ml.t + 10, -1) + '</small></button><button type="button" class="no" data-tr="m-no">✗ Не закрито<br><small>−1 → ' + validTarget(ml.t - 1, -1) + '</small></button></div>' +
      '<p style="text-align:center;margin:14px 0 0"><button type="button" class="ms-btn sec sm" data-tr="m-undo"' + (n ? '' : ' disabled') + '>↶ Скасувати</button> <button type="button" class="ms-btn sm" data-tr="m-end"' + (n ? '' : ' disabled') + '>Завершити і зберегти</button></p></div>';
  }
  function viewM60Home() {
    var w = MS().canWrite(), rows = T.drills.filter(function (r) { return r.game === 'm60'; });
    var h = '<div class="ms-card"><b>60+10−1</b><p class="sub" style="margin:4px 0 10px">Початок із 60. Закрили за підхід: ціль +10. Не закрили: ціль −1. Недосяжні значення (159, 162…) пропускаються. Гра завершується, коли ви зупиняєтесь або закриваєте 170.</p><button type="button" class="ms-btn" data-tr="m-start" ' + (w ? '' : 'disabled') + '>▶ Почати</button></div>';
    if (!rows.length) return h;
    var att = 0, hits = 0, best = 0; rows.forEach(function (r) { att += r.scores.length; hits += (r.detail && r.detail.oks ? r.detail.oks.reduce(function (a, b) { return a + b; }, 0) : 0); if (r.target > best) best = r.target; });
    h += '<div class="ms-card"><b>Статистика · ' + rows.length + ' тренувань</b><div class="ms-stats" style="margin-top:10px">' + stt(best || '—', 'найвище закриття') + stt(Math.round(hits / att * 100) + '%', 'влучність') + stt(att, 'усього підходів') + stt(Math.round(att / rows.length), 'підходів за тренування') + '</div></div>';
    h += '<div class="ms-card"><b>Останні тренування</b>' + rows.slice(0, 8).map(function (r) { var o = r.detail && r.detail.oks ? r.detail.oks.reduce(function (a, b) { return a + b; }, 0) : 0; return '<div class="tr-leg"><div>' + new Date(r.played_at).toLocaleDateString('uk-UA') + ' · ' + r.scores.length + ' підх. · закрито ' + o + ' · макс. ' + (r.target || '—') + '</div>' + (typeof r.id === 'number' && w ? '<button class="ms-x" type="button" data-tr="dr-del" data-id="' + r.id + '">✕</button>' : '') + '</div>'; }).join('') + '</div>';
    return h;
  }

  // ---------- сектор ----------
  var SECTORS = [15, 16, 17, 18, 19, 20, 25];
  function secName(k) { return k === 25 ? 'Bull' : String(k); }
  function sStart(sec) { sl = { id: uuid(), sector: sec, darts: [] }; document.body.classList.add('ms-live'); wakeOn(); MS().render(); }
  function sDart(v) {
    sl.darts.push(v);
    if (sl.darts.length >= 30) {
      var pts = sum(sl.darts);
      saveDrill({ client_id: sl.id, played_at: new Date().toISOString(), game: 'sector', param: null, target: sl.sector, success: true, darts: 30, scores: sl.darts.slice(), detail: { points: pts } });
      sl = { summary: { sector: sl.sector, darts: sl.darts.slice(), pts: pts } }; wakeOff();
    }
    MS().render();
  }
  function viewSector() {
    if (!sl) return null;
    if (sl.summary) { var d = sl.summary.darts, c = [0, 0, 0, 0]; d.forEach(function (x) { c[x]++; });
      return '<div class="tr-live"><h2>' + (sl.summary.sector === 25 ? 'Bull' : 'Сектор ' + sl.summary.sector) + ': ' + sl.summary.pts + ' очок</h2><div class="ms-stats" style="margin:10px 0">' + (sl.summary.sector === 25 ? stt(c[2], 'у Bull (50)') + stt(c[1], 'зовнішнє кільце (25)') + stt(c[0], 'мимо') + stt(30 - c[0], 'влучань') : stt(c[3], 'тріплів') + stt(c[2], 'дáблів') + stt(c[1], 'сінглів') + stt(c[0], 'мимо')) + '</div><p class="sub">Влучань у сектор: ' + (30 - c[0]) + ' з 30 · максимум ' + (sl.summary.sector === 25 ? 60 : 90) + '.</p><div class="ms-row"><button type="button" class="ms-btn" data-tr="s-start" data-s="' + sl.summary.sector + '">Ще раз цей сектор</button><button type="button" class="ms-btn sec" data-tr="s-close">Готово</button></div></div>'; }
    var n = sl.darts.length, visit = Math.floor(n / 3) + 1, dn = n % 3 + 1, pts = sum(sl.darts);
    var lastV = []; for (var i = 0; i + 2 < n + 1 && i < n; i += 3) lastV.push(sl.darts.slice(i, i + 3));
    var nm = sl.sector === 25 ? ['мимо', '25', '50'] : ['мимо', '1', '2', '3'];
    return '<div class="tr-live"><div class="tr-top"><button type="button" class="ms-btn sec sm" data-tr="s-quit">✕ Вийти</button><span>' + (sl.sector === 25 ? 'Bull' : 'Сектор ' + sl.sector) + ' · підхід ' + visit + '/10</span><span>очок ' + pts + '</span></div>' +
      '<div class="tr-rem">' + secName(sl.sector) + '<small>дротик ' + dn + ' з 3 · підхід ' + visit + ' з 10</small></div>' +
      '<div class="tr-last">' + lastV.slice(-5).map(function (v) { return '<span>' + v.map(function (x) { return nm[x]; }).join(' · ') + ' = ' + sum(v) + '</span>'; }).join('') + '</div>' +
      (sl.sector === 25
        ? '<div class="tr-sec three"><button type="button" class="no" data-tr="s-d" data-n="0">Мимо<br><small>0</small></button><button type="button" data-tr="s-d" data-n="1">Зовнішнє<br><small>25 · +1</small></button><button type="button" class="yes" data-tr="s-d" data-n="2">Bull<br><small>50 · +2</small></button></div>'
        : '<div class="tr-sec four"><button type="button" class="no" data-tr="s-d" data-n="0">Мимо<br><small>0</small></button><button type="button" data-tr="s-d" data-n="1">Сінгл<br><small>+1</small></button><button type="button" data-tr="s-d" data-n="2">Дабл<br><small>+2</small></button><button type="button" class="yes" data-tr="s-d" data-n="3">Тріпл<br><small>+3</small></button></div>') +
      '<p style="text-align:center;margin:14px 0 0"><button type="button" class="ms-btn sec sm" data-tr="s-undo"' + (n ? '' : ' disabled') + '>↶ Скасувати дротик</button></p></div>';
  }
  function viewSectorHome() {
    var w = MS().canWrite(), rows = T.drills.filter(function (r) { return r.game === 'sector'; });
    var h = '<div class="ms-card"><b>Тренування сектора</b><p class="sub" style="margin:4px 0 10px">10 підходів по 3 дротики (30 дротиків) в обраний сектор: 15–20 або Bull. Сінгл +1, дабл +2, тріпл +3, мимо 0 (максимум 90). У Bull: зовнішнє кільце +1, Bull +2 (максимум 60).</p><div class="tr-sg">' +
      SECTORS.map(function (i) { return '<button type="button" data-tr="s-start" data-s="' + i + '" ' + (w ? '' : 'disabled') + '>' + secName(i) + '</button>'; }).join('') + '</div>' +
      '<p style="margin:10px 0 0"><button type="button" class="ms-btn sec sm" data-tr="s-start" data-s="rnd" ' + (w ? '' : 'disabled') + '>🎲 Випадковий сектор</button></p></div>';
    if (!rows.length) return h;
    var pts = rows.map(function (r) { return r.detail && r.detail.points != null ? r.detail.points : sum(r.scores); }), tot = 0, hit = 0, tr = 0, db = 0, bySec = {};
    rows.forEach(function (r, i) { r.scores.forEach(function (x) { tot++; if (x) hit++; if (x === 3) tr++; if (x === 2) db++; }); var k = r.target; bySec[k] = bySec[k] || []; bySec[k].push(pts[i]); });
    h += '<div class="ms-card"><b>Статистика · ' + rows.length + ' тренувань</b><div class="ms-stats" style="margin-top:10px">' + stt(f2(sum(pts) / rows.length), 'середнє очок за тренування') + stt(Math.max.apply(null, pts), 'найкращий результат') + stt(Math.round(hit / tot * 100) + '%', 'влучань у сектор') + stt(tr + ' / ' + db, 'тріплів / дáблів') + '</div></div>';
    var ks = Object.keys(bySec).map(Number).sort(function (a, b) { return a - b; });
    h += '<div class="ms-card"><b>Середнє по секторах</b>' + ks.map(function (k) { var a = sum(bySec[k]) / bySec[k].length; return '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px"><span style="width:40px;text-align:right;font-weight:700">' + secName(k) + '</span><div class="ms-bar" style="flex:1;margin:0"><div style="width:' + Math.round(a / (k === 25 ? 60 : 90) * 100) + '%"></div></div><span style="width:70px">' + f2(a) + ' (' + bySec[k].length + ')</span></div>'; }).join('') + '</div>';
    h += '<div class="ms-card"><b>Останні тренування</b>' + rows.slice(0, 8).map(function (r, i) { return '<div class="tr-leg"><div>' + new Date(r.played_at).toLocaleDateString('uk-UA') + ' · ' + (r.target === 25 ? 'Bull' : 'сектор ' + r.target) + ' · <b>' + pts[i] + '</b> очок</div>' + (typeof r.id === 'number' && w ? '<button class="ms-x" type="button" data-tr="dr-del" data-id="' + r.id + '">✕</button>' : '') + '</div>'; }).join('') + '</div>';
    return h;
  }

  // ---------- статистика ----------
  function legsFor() {
    var y = T.period;
    return T.legs.filter(function (l) { return l.finished !== false && (y === 'all' || new Date(l.played_at).getFullYear() === Number(y)); });
  }
  function legStats(l) { return { avg: 501 / l.darts * 3, f9: sum(l.scores.slice(0, 3)) / Math.min(9, l.darts) * 3 }; }
  function agg(legs) {
    var sc = 0, dt = 0, f9s = 0, f9d = 0, cat = [0, 0, 0, 0, 0], chk = 0, att = 0, best = null, buckets = {}, months = {};
    legs.forEach(function (l) {
      sc += 501; dt += l.darts; f9s += sum(l.scores.slice(0, 3)); f9d += Math.min(9, l.darts);
      if (best == null || l.darts < best) best = l.darts;
      var r = 501;
      l.scores.forEach(function (s, i) {
        if (s >= 180) cat[4]++; else if (s >= 140) cat[3]++; else if (s >= 100) cat[2]++; else if (s >= 60) cat[1]++; else cat[0]++;
        if (r <= 170 && SKIP.indexOf(r) < 0) { att++; if (i === l.scores.length - 1) chk++; }
        r -= s;
      });
      var b = Math.min(45, l.darts); buckets[b] = (buckets[b] || 0) + 1;
      var m = l.played_at.slice(0, 7); months[m] = months[m] || [0, 0]; months[m][0] += 501; months[m][1] += l.darts;
    });
    return { n: legs.length, avg: dt ? sc / dt * 3 : 0, f9: f9d ? f9s / f9d * 3 : 0, cat: cat, chk: att ? chk / att * 100 : 0, att: att, best: best, buckets: buckets, months: months };
  }
  function donut(cat) {
    var names = ['до 60', '60–99', '100–139', '140–179', '180'], cols = ['#5b6491', '#3a4fc4', '#2e8b57', '#fcc202', '#e8590c'], tot = sum(cat);
    if (!tot) return '<p class="sub">Поки немає даних.</p>';
    var C = 2 * Math.PI * 40, off = 0, arcs = '';
    cat.forEach(function (c, i) { if (!c) return; var len = c / tot * C; arcs += '<circle r="40" cx="60" cy="60" fill="none" stroke="' + cols[i] + '" stroke-width="22" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 60 60)"/>'; off += len; });
    return '<div class="ms-row" style="flex-wrap:nowrap;gap:14px"><svg viewBox="0 0 120 120" width="120" height="120" style="flex:none">' + arcs + '<text x="60" y="58" text-anchor="middle" fill="#eef1fb" font-size="18" font-weight="800">' + tot + '</text><text x="60" y="73" text-anchor="middle" fill="#8d96c4" font-size="9">усіх підходів</text></svg><div style="font-size:13px;line-height:1.9">' +
      names.map(function (n, i) { return '<div><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + cols[i] + ';margin-right:7px"></span>' + n + ': <b>' + cat[i] + '</b></div>'; }).join('') + '</div></div>';
  }
  function bars(b) {
    var ks = Object.keys(b).map(Number); if (!ks.length) return '<p class="sub">Поки немає даних.</p>';
    var lo = Math.min(15, Math.min.apply(null, ks)), hi = Math.max(24, Math.max.apply(null, ks)), keys = [];
    for (var k = lo; k <= hi; k++) keys.push(k);
    var mx = Math.max.apply(null, keys.map(function (k) { return b[k] || 0; })) || 1;
    return '<div class="tr-bars">' + keys.map(function (k) { var v = b[k] || 0; return '<div><b>' + (v || '') + '</b><i style="height:' + Math.round(v / mx * 80) + 'px"></i>' + (k === 45 ? '45+' : k) + '</div>'; }).join('') + '</div><p class="sub" style="margin:6px 0 0">Леги за точною кількістю дротиків' + (keys.length > 13 ? ' (гортайте вбік)' : '') + '</p>';
  }
  function line(months) {
    var ks = Object.keys(months).sort(); if (!ks.length) return '<p class="sub">Поки немає даних.</p>';
    var vals = ks.map(function (k) { return months[k][0] / months[k][1] * 3; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) < 4 ? 2 : (hi - lo) * .2; lo -= pad; hi += pad;
    var W = 340, H = 140, L = 14, R = 14, Tp = 18, B = 26;
    function x(i) { return ks.length === 1 ? W / 2 : L + i * (W - L - R) / (ks.length - 1); }
    function y(v) { return Tp + (hi - v) / (hi - lo) * (H - Tp - B); }
    var pts = vals.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ');
    var step = Math.ceil(ks.length / 6), lab = '';
    ks.forEach(function (k, i) { var show = ks.length <= 6 || i % step === 0 || i === ks.length - 1; if (show) lab += '<text x="' + x(i) + '" y="' + (y(vals[i]) - 8) + '" text-anchor="middle" fill="#eef1fb" font-size="11" font-weight="700">' + vals[i].toFixed(1) + '</text><text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" fill="#8d96c4" font-size="10">' + k.slice(5) + '.' + k.slice(2, 4) + '</text>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%"><polyline fill="none" stroke="#fcc202" stroke-width="2.5" points="' + pts + '"/>' + vals.map(function (v, i) { return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="#fcc202"/>'; }).join('') + lab + '</svg>';
  }
  function stt(v, l) { return '<div class="ms-stat"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }

  // ---------- екрани ----------
  function matches() {
    var map = {}, order = [];
    T.legs.forEach(function (l) {
      if (l.mode !== 'ghost') return;
      var k = l.match_id || l.client_id;
      if (!map[k]) { map[k] = { id: k, bestOf: l.best_of || 1, legs: [], date: l.played_at }; order.push(k); }
      map[k].legs.push(l); if (l.played_at > map[k].date) map[k].date = l.played_at;
    });
    return order.map(function (k) {
      var m = map[k]; m.legs.sort(function (a, b) { return a.played_at < b.played_at ? -1 : 1; });
      m.w = m.legs.filter(function (l) { return l.ghost_result === 'win'; }).length; m.l = m.legs.length - m.w;
      m.need = (m.bestOf + 1) / 2; m.over = m.w >= m.need || m.l >= m.need; m.won = m.w >= m.need; return m;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function viewMatch(id) {
    var m = matches().filter(function (x) { return x.id === id; })[0];
    if (!m) { T.detail = null; return view501(); }
    var a = agg(m.legs), gd = 0, gn = 0; m.legs.forEach(function (l) { if (l.ghost_darts) { gd += l.ghost_darts; gn++; } });
    var gavg = gd ? gn * 501 / gd * 3 : null, w = MS().canWrite();
    var res = m.over ? (m.won ? '🏆 Перемога' : 'Поразка') : 'Матч перервано';
    var h = '<p><button type="button" class="ms-btn sec sm" data-tr="mback">‹ Назад до тренувань</button></p>' +
      '<div class="ms-card"><b>Матч із тінню · best of ' + m.bestOf + '</b><p class="sub" style="margin:2px 0 10px">' + new Date(m.date).toLocaleDateString('uk-UA') + ' · ' + res + '</p><div class="ms-stats">' +
      stt(m.w + ':' + m.l, 'рахунок у легах') + stt(f2(a.avg), 'ваш середній') + stt(gavg ? f2(gavg) : '—', 'середній тіні') + stt(a.best + ' дрот.', 'ваш найкращий лег') + '</div></div>';
    h += m.legs.map(function (l, i) {
      var s = legStats(l), win = l.ghost_result === 'win', gs = l.ghost_scores;
      return '<div class="ms-card"><div class="ms-row" style="justify-content:space-between"><b>Лег ' + (i + 1) + '</b><span style="font-weight:800;color:' + (win ? '#2ecc71' : '#ff8d8d') + '">' + (win ? '✓ перемога' : '✗ поразка') + '</span></div>' +
        '<div style="font-size:13px;margin-top:8px"><b>Ви:</b> ' + l.darts + ' дрот. · сер. ' + f2(s.avg) + ' · перші 9: ' + f2(s.f9) + '</div><div class="tr-last" style="justify-content:flex-start">' + l.scores.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
        (l.ghost_darts ? '<div style="font-size:13px;margin-top:6px"><b>Тінь:</b> ' + l.ghost_darts + ' дрот. · сер. ' + f2(501 / l.ghost_darts * 3) + '</div>' + (gs ? '<div class="tr-last" style="justify-content:flex-start">' + gs.map(function (x) { return '<span style="opacity:.8">' + x + '</span>'; }).join('') + '</div>' : '') : '') + '</div>';
    }).join('');
    if (w) h += '<p><button type="button" class="ms-btn sec sm" data-tr="mdel" data-mid="' + esc(m.id) + '">🗑 Видалити цей матч зі статистики</button></p>';
    return h;
  }
  function view501() {
    var legs = legsFor(), a = agg(legs), allN = T.legs.filter(function (l) { return l.finished !== false; }).length, w = MS().canWrite();
    var pend = queue().length, h = '';
    if (pend) h += '<div class="ms-warn">⏳ Чекають на синхронізацію: ' + pend + '. Відправиться, коли з\'явиться інтернет.</div>';
    h += '<div class="ms-card"><b>501DO · лічильник</b><p class="sub" style="margin:4px 0 10px">Рахуйте свої леги. Статистика накопичується автоматично.</p><div class="ms-row">' +
      '<button type="button" class="ms-btn" data-tr="start" ' + (w ? '' : 'disabled') + '>▶ Новий лег</button>' +
      '<button type="button" class="ms-btn sec" data-tr="ghost" ' + (w && allN >= 10 ? '' : 'disabled') + '>👻 Гра з тінню' + (allN >= 10 ? '' : ' · ' + allN + '/10') + '</button></div>' +
      (allN >= 10 ? '' : '<p class="sub" style="margin:8px 0 0">«Тінь» відкриється після 10 завершених легів: вона відтворює один із ваших останніх 50 легів.</p>') + '</div>';
    if (T.ghostPick && allN >= 10) {
      h += '<div class="ms-card"><b>👻 Гра з тінню</b><p class="sub" style="margin:4px 0 10px">Оберіть формат матчу. Best of N: перемагає той, хто першим виграє більшість легів. Для кожного лега тінню стає випадковий із ваших останніх 50 легів.</p><div class="tr-sg" style="grid-template-columns:repeat(3,1fr)">' +
        [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21].map(function (n) { return '<button type="button" data-tr="gbo" data-bo="' + n + '">Best of ' + n + '</button>'; }).join('') + '</div><p style="margin:10px 0 0"><button type="button" class="ms-btn sec sm" data-tr="gcancel">Скасувати</button></p></div>';
    }
    var ms = matches();
    if (ms.length) {
      h += '<div class="ms-card"><b>Історія ігор з тінню</b><p class="sub" style="margin:4px 0 6px">Натисніть на матч, щоб побачити деталі.</p>' + ms.slice(0, 15).map(function (m) {
        var st = m.over ? (m.won ? '<span style="color:#2ecc71;font-weight:800">перемога</span>' : '<span style="color:#ff8d8d;font-weight:800">поразка</span>') : '<span class="sub" style="margin:0">перервано</span>';
        return '<button type="button" class="tr-leg" style="width:100%;background:none;border:0;border-top:1px solid var(--line);color:var(--cream);text-align:left;cursor:pointer;font:13px Inter,sans-serif" data-tr="mdetail" data-mid="' + esc(m.id) + '"><span>' + new Date(m.date).toLocaleDateString('uk-UA') + ' · best of ' + m.bestOf + ' · <b>' + m.w + ':' + m.l + '</b></span><span>' + st + ' ›</span></button>';
      }).join('') + '</div>';
    }
    var years = {}; T.legs.forEach(function (l) { years[new Date(l.played_at).getFullYear()] = 1; });
    var ysel = '<select class="ms-in" data-trp style="width:auto"><option value="all"' + (T.period === 'all' ? ' selected' : '') + '>Увесь час</option>' + Object.keys(years).sort().reverse().map(function (y) { return '<option' + (String(T.period) === y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>';
    if (!a.n) return h + '<div class="ms-card"><div class="ms-row" style="justify-content:space-between"><b>Статистика</b>' + ysel + '</div><p class="sub">Зіграйте перший лег, і тут з\'явиться статистика.</p></div>';
    h += '<div class="ms-card"><div class="ms-row" style="justify-content:space-between"><b>Статистика · ' + a.n + ' легів</b>' + ysel + '</div><div class="ms-stats" style="margin-top:10px">' +
      stt(f2(a.avg), 'середній за 3 дротики') + stt(f2(a.f9), 'середній за перші 9') + stt(Math.round(a.chk) + '%', 'закриття (' + a.att + ' підходів)') + stt(a.best + ' дрот.', 'найкращий лег') + '</div></div>';
    h += '<div class="ms-card"><b>Усі підходи за величиною</b><div style="margin-top:10px">' + donut(a.cat) + '</div></div>';
    h += '<div class="ms-card"><b>Закриття легів по дротиках</b>' + bars(a.buckets) + '</div>';
    h += '<div class="ms-card"><b>Середній по місяцях</b><div style="margin-top:6px">' + line(a.months) + '</div></div>';
    h += '<div class="ms-card"><b>Останні леги</b>' + legs.slice(0, 10).map(function (l) {
      var s = legStats(l);
      return '<div class="tr-leg"><div>' + new Date(l.played_at).toLocaleDateString('uk-UA') + ' · ' + l.darts + ' дрот. · сер. ' + f2(s.avg) + (l.mode === 'ghost' ? ' · 👻 ' + (l.ghost_result === 'win' ? 'перемога' : 'поразка') : '') + '</div>' + (typeof l.id === 'number' && w ? '<button class="ms-x" type="button" data-tr="del" data-id="' + l.id + '">✕</button>' : '') + '</div>';
    }).join('') + '</div>';
    return h;
  }

  function viewTrain() {
    var saved = lget('ms_live'), pend = queue().length + dqueue().length, h = '';
    if (saved && saved.scores) h += '<div class="ms-warn">Є незавершена гра (' + saved.scores.length + ' візитів). <button type="button" class="ms-btn sm" data-tr="resume">Продовжити</button> <button type="button" class="ms-btn sec sm" data-tr="drop">Скасувати</button></div>';
    if (T.detail) return viewMatch(T.detail);
    var g = T.game, games = [['501', '501DO'], ['p171', '170+1'], ['m60', '60+10−1'], ['sector', 'Сектор']];
    h += '<div class="ms-tabs">' + games.map(function (x) { return '<button type="button" data-tr="game" data-g="' + x[0] + '" class="' + (g === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (pend && g !== '501') h += '<div class="ms-warn">⏳ Чекають на синхронізацію: ' + pend + '. Відправиться, коли з\'явиться інтернет.</div>';
    return h + (g === 'p171' ? viewP171Home() : g === 'm60' ? viewM60Home() : g === 'sector' ? viewSectorHome() : view501());
  }
  function viewLive() {
    if (!live) return null;
    if (live.kind === 'p171') return viewP171();
    if (live.done) {
      var s = { avg: 501 / darts() * 3, f9: sum(live.scores.slice(0, 3)) / Math.min(9, darts()) * 3 };
      var gs = ghostStatus();
      var mt = live.match, over = mt && (mt.w >= mt.need || mt.l >= mt.need), mwon = mt && mt.w >= mt.need;
      var btns = mt ? (over ? '<button type="button" class="ms-btn" data-tr="mdetail" data-mid="' + mt.id + '">Деталі матчу</button><button type="button" class="ms-btn sec" data-tr="again">Ще матч · best of ' + mt.bestOf + '</button><button type="button" class="ms-btn sec" data-tr="done">Готово</button>' : '<button type="button" class="ms-btn" data-tr="again">Наступний лег</button><button type="button" class="ms-btn sec" data-tr="done">Завершити матч</button>') : '<button type="button" class="ms-btn" data-tr="again">Ще лег</button><button type="button" class="ms-btn sec" data-tr="done">Готово</button>';
      var mhead = mt ? '<div class="tr-ghost ' + (over ? (mwon ? 'win' : 'lose') : '') + '"><span>' + (over ? (mwon ? '🏆 Матч виграно' : 'Матч програно') : 'Рахунок матчу') + ' · best of ' + mt.bestOf + '</span><b>' + mt.w + ':' + mt.l + '</b></div>' : '';
      return '<div class="tr-live"><h2>' + (over ? 'Матч завершено' : 'Лег закрито 🎯') + '</h2>' + mhead + (live.ghost ? '<div class="tr-ghost ' + (gs === 'win' ? 'win' : 'lose') + '"><span>' + (gs === 'win' ? '👻 Ви обіграли свою тінь!' : '👻 Тінь виявилась швидшою') + '</span></div>' : '') +
        '<div class="ms-stats" style="margin:10px 0">' + stt(darts(), 'дротиків') + stt(f2(s.avg), 'середній за лег') + stt(f2(s.f9), 'перші 9 дротиків') + stt(live.scores.length, 'візитів') + '</div>' +
        '<div class="tr-last">' + live.scores.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
        '<div class="ms-row" style="margin-top:12px">' + btns + '</div></div>';
    }
    var r = rem(), gs2 = ghostStatus(), gh = '';
    if (live.ghost) {
      var gr = ghostRem();
      gh = '<div class="tr-ghost ' + (gs2 === 'loss' ? 'lose' : '') + '"><span>👻 Тінь</span><b>' + (gs2 === 'loss' ? 'закрила' : gr) + '</b><span>' + (gs2 === 'loss' ? 'за ' + live.ghost.darts + ' дрот.' : 'візит ' + Math.min(live.scores.length, live.ghost.scores.length) + '/' + live.ghost.scores.length) + '</span></div>';
    }
    var n = live.scores.length, sc = sum(live.scores), avg = n ? sc / (3 * n) * 3 : 0;
    var body;
    if (live.pending != null) {
      body = '<p class="sub" style="text-align:center;margin:12px 0 0">Закриття ' + r + '. Яким дротиком закрили?</p>' + dartBtns(r) + '<p style="text-align:center"><button type="button" class="ms-btn sec sm" data-tr="undo">↶ Скасувати введення</button></p>';
    } else {
      body = '<div class="tr-ent" id="tr-ent">' + (live.entry || '<span style="color:var(--muted)">0</span>') + '</div>' +
        '<div class="tr-q">' + QUICK.map(function (q) { return '<button type="button" data-tr="q" data-n="' + q + '">' + q + '</button>'; }).join('') + '</div>' +
        '<div class="tr-kp">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (d) { return '<button type="button" data-tr="k" data-n="' + d + '">' + d + '</button>'; }).join('') +
        '<button type="button" data-tr="bs">⌫</button><button type="button" data-tr="k" data-n="0">0</button><button type="button" class="ok" data-tr="ok">OK</button></div>' +
        '<p style="text-align:center;margin:12px 0 0"><button type="button" class="ms-btn sec sm" data-tr="undo"' + (n ? '' : ' disabled') + '>↶ Скасувати візит</button></p><p class="sub kbhint" style="text-align:center;margin:8px 0 0">З клавіатури: цифри · Enter — ввести · Backspace — стерти · Delete — скасувати візит</p>';
    }
    return '<div class="tr-live"><div class="tr-top"><button type="button" class="ms-btn sec sm" data-tr="quit">✕ Вийти</button><span>' + (live.match ? 'Тінь · BO' + live.match.bestOf + ' · ' + live.match.w + ':' + live.match.l : 'Соло') + ' · візит ' + (n + 1) + '</span><span>сер. ' + (n ? f2(avg) : '—') + '</span></div>' +
      '<div class="tr-rem">' + r + '<small>залишилось</small></div>' + gh +
      '<div class="tr-last">' + live.scores.slice(-6).map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' + body + '</div>';
  }

  // ---------- події ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tr]'); if (!b || !b.closest('#my-space')) return;
    var a = b.getAttribute('data-tr');
    if (navigator.vibrate && (a === 'k' || a === 'q' || a === 'ok')) { try { navigator.vibrate(8); } catch (x) {} }
    if (a === 'game') { T.game = b.getAttribute('data-g'); MS().render(); }
    else if (a === 'ghost') { T.ghostPick = true; MS().render(); }
    else if (a === 'gcancel') { T.ghostPick = false; MS().render(); }
    else if (a === 'gbo') { T.ghostPick = false; startMatch(Number(b.getAttribute('data-bo'))); }
    else if (a === 'mdetail') { var mid = b.getAttribute('data-mid'); live = null; document.body.classList.remove('ms-live'); wakeOff(); lset('ms_live', null); T.game = '501'; T.detail = mid; window.scrollTo(0, 0); MS().render(); }
    else if (a === 'mback') { T.detail = null; MS().render(); }
    else if (a === 'mdel') { delMatch(b.getAttribute('data-mid')); }
    else if (a === 'p-start') startP171(Number(b.getAttribute("data-vv")));
    else if (a === 'm-start') mStart();
    else if (a === 'm-ok') mAnswer(true);
    else if (a === 'm-no') mAnswer(false);
    else if (a === 'm-undo') { if (ml && ml.att && ml.att.length) { var la = ml.att.pop(); ml.t = la.t; MS().render(); } }
    else if (a === 'm-end') mEnd(false);
    else if (a === 'm-quit') { if (!ml.att || !ml.att.length || confirm('Вийти без збереження?')) { ml = null; document.body.classList.remove('ms-live'); wakeOff(); MS().render(); } }
    else if (a === 'm-close') { ml = null; document.body.classList.remove('ms-live'); MS().render(); }
    else if (a === 's-start') { var sv2 = b.getAttribute('data-s'); sStart(sv2 === 'rnd' ? SECTORS[Math.floor(Math.random() * SECTORS.length)] : Number(sv2)); }
    else if (a === 's-d') sDart(Number(b.getAttribute('data-n')));
    else if (a === 's-undo') { if (sl && sl.darts && sl.darts.length) { sl.darts.pop(); MS().render(); } }
    else if (a === 's-quit') { if (!sl.darts || !sl.darts.length || confirm('Вийти без збереження?')) { sl = null; document.body.classList.remove('ms-live'); wakeOff(); MS().render(); } }
    else if (a === 's-close') { sl = null; document.body.classList.remove('ms-live'); MS().render(); }
    else if (a === 'dr-del') { var did = Number(b.getAttribute('data-id')); if (confirm('Видалити запис зі статистики?')) MS().sb().from('drills').delete().eq('id', did).then(function (r) { if (r.error) return MS().fail(r.error); T.drills = T.drills.filter(function (l) { return l.id !== did; }); MS().render(); }); }
    else if (a === 'start') start('solo');
    else if (a === 'resume') { var sv = lget('ms_live'); if (sv) setLive(sv); }
    else if (a === 'drop') { if (confirm('Скасувати незавершений лег?')) { lset('ms_live', null); MS().render(); } }
    else if (a === 'k') { if (live.entry.length < 3) { live.entry += b.getAttribute('data-n'); if (live.entry === '00') live.entry = '0'; } MS().render(); }
    else if (a === 'bs') { live.entry = live.entry.slice(0, -1); MS().render(); }
    else if (a === 'ok') { if (live.entry !== '') submit(Number(live.entry)); }
    else if (a === 'q') submit(Number(b.getAttribute('data-n')));
    else if (a === 'd') chooseDarts(Number(b.getAttribute('data-d')));
    else if (a === 'undo') undo();
    else if (a === 'quit') quit();
    else if (a === 'done') quit(true);
    else if (a === 'p-end') endP171Session();
    else if (a === 'again') again();
    else if (a === 'del') { var id = Number(b.getAttribute('data-id')); if (confirm('Видалити лег зі статистики?')) MS().sb().from('legs').delete().eq('id', id).then(function (r) { if (r.error) return MS().fail(r.error); T.legs = T.legs.filter(function (l) { return l.id !== id; }); MS().render(); }); }
  });
  // клавіатура на комп'ютері: цифри, Backspace, Enter, Ctrl+Z / Delete — скасувати візит
  document.addEventListener('keydown', function (e) {
    if (!live || e.ctrlKey && e.key.toLowerCase() !== 'z' || e.metaKey || e.altKey) return;
    var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (live.done) { if (e.key === 'Enter') { e.preventDefault(); again(); } return; }
    if (live.pending != null) {
      if (e.key === '1' || e.key === '2' || e.key === '3') { e.preventDefault(); if (Number(e.key) >= minDarts(rem())) chooseDarts(Number(e.key)); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); undo(); }
      return;
    }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); if (live.entry.length < 3) { live.entry += e.key; if (live.entry === '00') live.entry = '0'; } MS().render(); }
    else if (e.key === 'Backspace') { e.preventDefault(); if (live.entry) { live.entry = live.entry.slice(0, -1); MS().render(); } else undo(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (live.entry !== '') submit(Number(live.entry)); }
    else if (e.key === 'Delete' || (e.ctrlKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); undo(); }
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (sl && !sl.summary) { if (/^[0-3]$/.test(e.key)) { e.preventDefault(); sDart(Number(e.key)); } else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); if (sl.darts.length) { sl.darts.pop(); MS().render(); } } }
    else if (ml && !ml.summary) { if (e.key === '1' || e.key === 'Enter') { e.preventDefault(); mAnswer(true); } else if (e.key === '0') { e.preventDefault(); mAnswer(false); } else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); if (ml.att.length) { ml.t = ml.att.pop().t; MS().render(); } } }
  });
  document.addEventListener('change', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-trp') && e.target.closest('#my-space')) { T.period = e.target.value; MS().render(); } });

  window.__msExt = window.__msExt || [];
  window.__msExt.push({
    id: 'train', label: '🎯 Тренування', view: viewTrain, load: load,
    override: function () { return viewLive() || viewM60() || viewSector(); },
    exportSheets: function () {
      function d(x) { var t = new Date(x); return ('0' + t.getDate()).slice(-2) + '.' + ('0' + (t.getMonth() + 1)).slice(-2) + '.' + t.getFullYear(); }
      var out = [], legs = T.legs.filter(function (l) { return l.finished !== false; });
      out.push({ name: '501DO леги', rows: [['Дата', 'Режим', 'Дротиків', 'Середній за лег', 'Перші 9', 'Підходи', 'Результат проти тіні', 'Матч (best of)']].concat(legs.map(function (l) { var s = legStats(l); return [d(l.played_at), l.mode === 'ghost' ? 'з тінню' : 'соло', l.darts, Math.round(s.avg * 100) / 100, Math.round(s.f9 * 100) / 100, l.scores.join(' '), l.mode === 'ghost' ? (l.ghost_result === 'win' ? 'перемога' : 'поразка') : '', l.best_of || '']; })) });
      out.push({ name: 'Матчі з тінню', rows: [['Дата', 'Best of', 'Виграно легів', 'Програно легів', 'Підсумок']].concat(matches().map(function (m) { return [d(m.date), m.bestOf, m.w, m.l, m.over ? (m.won ? 'перемога' : 'поразка') : 'перервано']; })) });
      var dr = T.drills;
      out.push({ name: '170+1', rows: [['Дата', 'Підходів на ціль', 'Ціль', 'Закрито', 'Дротиків', 'Підходи']].concat(dr.filter(function (r) { return r.game === 'p171'; }).map(function (r) { return [d(r.played_at), r.param, r.target, r.success ? 'так' : 'ні', r.darts, r.scores.join(' ')]; })) });
      out.push({ name: '60+10-1', rows: [['Дата', 'Підходів', 'Закрито', 'Найвище закриття', 'Цілі по порядку']].concat(dr.filter(function (r) { return r.game === 'm60'; }).map(function (r) { var o = r.detail && r.detail.oks ? r.detail.oks : []; return [d(r.played_at), r.scores.length, o.reduce(function (a, b) { return a + b; }, 0), r.target, r.scores.map(function (t, i) { return t + (o[i] ? '✓' : '✗'); }).join(' ')]; })) });
      out.push({ name: 'Сектор', rows: [['Дата', 'Сектор', 'Очок', 'Дротики (0-3)']].concat(dr.filter(function (r) { return r.game === 'sector'; }).map(function (r) { return [d(r.played_at), r.target === 25 ? 'Bull' : r.target, r.detail && r.detail.points != null ? r.detail.points : r.scores.reduce(function (a, b) { return a + b; }, 0), r.scores.join(' ')]; })) });
      return out;
    },
    reset: function () { T.legs = []; T.drills = []; T.detail = null; T.ghostPick = false; ml = null; sl = null; live = null; document.body.classList.remove('ms-live'); wakeOff(); }
  });
})();

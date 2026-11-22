/* ВФД · «Мій простір» · етап 2 · тренування 501DO (лічильник, «тінь», статистика) */
(function () {
  'use strict';
  var SKIP = [159, 162, 163, 165, 166, 168, 169];
  var BADSCORE = [163, 166, 169, 172, 173, 175, 176, 178, 179];
  var QUICK = [26, 41, 45, 60, 85, 100, 140, 180];
  var T = { legs: [], period: 'all' };
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
    '.tr-bars{display:flex;align-items:flex-end;gap:5px;height:110px;margin-top:8px}.tr-bars div{flex:1;text-align:center;font-size:10px;color:var(--muted)}.tr-bars i{display:block;background:var(--royal-light);border-radius:4px 4px 0 0;min-height:2px;margin-bottom:3px}.tr-bars b{display:block;font-size:11px;color:var(--cream)}',
    '.kbhint{display:none}@media(hover:hover) and (pointer:fine){.kbhint{display:block}}',
    '.tr-leg{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:9px 0;font-size:13px}.tr-leg:first-child{border-top:0}'
  ].join('\n');
  document.head.appendChild(css);

  // ---------- дані ----------
  function nDarts(scores, finished, last) { return finished ? 3 * (scores.length - 1) + last : 3 * scores.length; }
  function load() {
    var sb = MS().sb(); if (!sb) return Promise.resolve();
    return sb.from('legs').select('id,client_id,played_at,mode,scores,darts,last_darts,finished,ghost_result').eq('finished', true).order('played_at', { ascending: false }).limit(3000)
      .then(function (r) { if (r.error) throw r.error; T.legs = merge(r.data || []); return flush(); });
  }
  function merge(rows) {
    var have = {}; rows.forEach(function (r) { have[r.client_id] = 1; });
    var extra = queue().filter(function (q) { return !have[q.client_id]; }).map(function (q) { return Object.assign({ id: 'local-' + q.client_id }, q); });
    return extra.concat(rows).sort(function (a, b) { return a.played_at < b.played_at ? 1 : -1; });
  }
  function queue() { return lget('ms_q') || []; }
  var flushing = false;
  function flush() {
    var sb = MS().sb(), q = queue(); if (!sb || !q.length || !MS().canWrite() || flushing) return Promise.resolve();
    flushing = true;
    return sb.from('legs').upsert(q, { onConflict: 'user_id,client_id', ignoreDuplicates: true }).then(function (r) {
      flushing = false;
      if (r.error) { console.warn('sync later', r.error.message); return; }
      lset('ms_q', queue().filter(function (x) { return !q.some(function (y) { return y.client_id === x.client_id; }); }));
      return sb.from('legs').select('id,client_id,played_at,mode,scores,darts,last_darts,finished,ghost_result').eq('finished', true).order('played_at', { ascending: false }).limit(3000)
        .then(function (r2) { if (!r2.error) T.legs = merge(r2.data || []); if (queue().length) return flush(); });
    }, function () { flushing = false; });
  }
  window.addEventListener('online', function () { flush(); });
  function saveLeg(row) {
    T.legs.unshift(Object.assign({ id: 'local-' + row.client_id }, row));
    var q = queue(); q.push(row); lset('ms_q', q); flush();
  }

  // ---------- логіка лега ----------
  function rem() { return 501 - sum(live.scores); }
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

  function pickGhost() {
    var pool = T.legs.filter(function (l) { return l.finished !== false && l.scores && l.scores.length; }).slice(0, 50);
    if (!pool.length) return null;
    var g = pool[Math.floor(Math.random() * pool.length)];
    return { id: typeof g.id === 'number' ? g.id : null, scores: g.scores, darts: g.darts };
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
    if (nr === 0 && r <= 170 && SKIP.indexOf(r) < 0) { live.pending = score; persist(); return MS().render(); }
    if (nr <= 1) { live.scores.push(0); MS().toast('Перебір: рахунок 0'); }
    else live.scores.push(score);
    persist(); MS().render();
  }
  function chooseDarts(d) {
    live.scores.push(live.pending); live.pending = null; live.finished = true; live.lastDarts = d;
    var row = { client_id: live.id, played_at: new Date().toISOString(), mode: live.mode, start_score: 501, scores: live.scores.slice(), darts: darts(), last_darts: d, finished: true,
      ghost_leg_id: live.ghost ? live.ghost.id : null, ghost_result: ghostStatus() };
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

  // ---------- статистика ----------
  function legsFor() {
    var y = T.period;
    return T.legs.filter(function (l) { return l.finished !== false && (y === 'all' || new Date(l.played_at).getFullYear() === Number(y)); });
  }
  function legStats(l) { return { avg: 501 / l.darts * 3, f9: sum(l.scores.slice(0, 3)) / Math.min(9, l.darts) * 3 }; }
  function agg(legs) {
    var sc = 0, dt = 0, f9s = 0, f9d = 0, cat = [0, 0, 0, 0], chk = 0, att = 0, best = null, buckets = {}, months = {};
    legs.forEach(function (l) {
      sc += 501; dt += l.darts; f9s += sum(l.scores.slice(0, 3)); f9d += Math.min(9, l.darts);
      if (best == null || l.darts < best) best = l.darts;
      var r = 501;
      l.scores.forEach(function (s, i) {
        if (s >= 180) cat[3]++; else if (s >= 140) cat[2]++; else if (s >= 100) cat[1]++; else if (s >= 60) cat[0]++;
        if (r <= 170 && SKIP.indexOf(r) < 0) { att++; if (i === l.scores.length - 1) chk++; }
        r -= s;
      });
      var b = Math.max(15, Math.min(36, Math.ceil(l.darts / 3) * 3)); buckets[b] = (buckets[b] || 0) + 1;
      var m = l.played_at.slice(0, 7); months[m] = months[m] || [0, 0]; months[m][0] += 501; months[m][1] += l.darts;
    });
    return { n: legs.length, avg: dt ? sc / dt * 3 : 0, f9: f9d ? f9s / f9d * 3 : 0, cat: cat, chk: att ? chk / att * 100 : 0, att: att, best: best, buckets: buckets, months: months };
  }
  function donut(cat) {
    var names = ['60–99', '100–139', '140–179', '180'], cols = ['#3a4fc4', '#2e8b57', '#fcc202', '#e8590c'], tot = sum(cat);
    if (!tot) return '<p class="sub">Поки немає даних.</p>';
    var C = 2 * Math.PI * 40, off = 0, arcs = '';
    cat.forEach(function (c, i) { if (!c) return; var len = c / tot * C; arcs += '<circle r="40" cx="60" cy="60" fill="none" stroke="' + cols[i] + '" stroke-width="22" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 60 60)"/>'; off += len; });
    return '<div class="ms-row" style="flex-wrap:nowrap;gap:14px"><svg viewBox="0 0 120 120" width="120" height="120" style="flex:none">' + arcs + '<text x="60" y="58" text-anchor="middle" fill="#eef1fb" font-size="18" font-weight="800">' + tot + '</text><text x="60" y="73" text-anchor="middle" fill="#8d96c4" font-size="9">підходів 60+</text></svg><div style="font-size:13px;line-height:1.9">' +
      names.map(function (n, i) { return '<div><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + cols[i] + ';margin-right:7px"></span>' + n + ': <b>' + cat[i] + '</b></div>'; }).join('') + '</div></div>';
  }
  function bars(b) {
    var keys = []; for (var k = 15; k <= 36; k += 3) keys.push(k);
    var mx = Math.max.apply(null, keys.map(function (k) { return b[k] || 0; })) || 1;
    return '<div class="tr-bars">' + keys.map(function (k) { var v = b[k] || 0; return '<div><b>' + (v || '') + '</b><i style="height:' + Math.round(v / mx * 80) + 'px"></i>' + (k === 15 ? '≤15' : k === 36 ? '36+' : k) + '</div>'; }).join('') + '</div><p class="sub" style="margin:6px 0 0">Леги за кількістю дротиків</p>';
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
  function viewHome() {
    var legs = legsFor(), a = agg(legs), allN = T.legs.filter(function (l) { return l.finished !== false; }).length, w = MS().canWrite();
    var saved = lget('ms_live'), pend = queue().length, h = '';
    if (saved && saved.scores) h += '<div class="ms-warn">Є незавершений лег (' + saved.scores.length + ' візитів). <button type="button" class="ms-btn sm" data-tr="resume">Продовжити</button> <button type="button" class="ms-btn sec sm" data-tr="drop">Скасувати</button></div>';
    if (pend) h += '<div class="ms-warn">⏳ Чекають на синхронізацію: ' + pend + '. Відправиться, коли з\'явиться інтернет.</div>';
    h += '<div class="ms-card"><b>501DO · лічильник</b><p class="sub" style="margin:4px 0 10px">Рахуйте свої леги. Статистика накопичується автоматично.</p><div class="ms-row">' +
      '<button type="button" class="ms-btn" data-tr="start" ' + (w ? '' : 'disabled') + '>▶ Новий лег</button>' +
      '<button type="button" class="ms-btn sec" data-tr="ghost" ' + (w && allN >= 10 ? '' : 'disabled') + '>👻 Гра з тінню' + (allN >= 10 ? '' : ' · ' + allN + '/10') + '</button></div>' +
      (allN >= 10 ? '' : '<p class="sub" style="margin:8px 0 0">«Тінь» відкриється після 10 завершених легів: вона відтворює один із ваших останніх 50 легів.</p>') + '</div>';
    var years = {}; T.legs.forEach(function (l) { years[new Date(l.played_at).getFullYear()] = 1; });
    var ysel = '<select class="ms-in" data-trp style="width:auto"><option value="all"' + (T.period === 'all' ? ' selected' : '') + '>Увесь час</option>' + Object.keys(years).sort().reverse().map(function (y) { return '<option' + (String(T.period) === y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>';
    if (!a.n) return h + '<div class="ms-card"><div class="ms-row" style="justify-content:space-between"><b>Статистика</b>' + ysel + '</div><p class="sub">Зіграйте перший лег, і тут з\'явиться статистика.</p></div>';
    h += '<div class="ms-card"><div class="ms-row" style="justify-content:space-between"><b>Статистика · ' + a.n + ' легів</b>' + ysel + '</div><div class="ms-stats" style="margin-top:10px">' +
      stt(f2(a.avg), 'середній за 3 дротики') + stt(f2(a.f9), 'середній за перші 9') + stt(Math.round(a.chk) + '%', 'закриття (' + a.att + ' підходів)') + stt(a.best + ' дрот.', 'найкращий лег') + '</div></div>';
    h += '<div class="ms-card"><b>Високі підходи</b><div style="margin-top:10px">' + donut(a.cat) + '</div></div>';
    h += '<div class="ms-card"><b>Закриття легів по дротиках</b>' + bars(a.buckets) + '</div>';
    h += '<div class="ms-card"><b>Середній по місяцях</b><div style="margin-top:6px">' + line(a.months) + '</div></div>';
    h += '<div class="ms-card"><b>Останні леги</b>' + legs.slice(0, 10).map(function (l) {
      var s = legStats(l);
      return '<div class="tr-leg"><div>' + new Date(l.played_at).toLocaleDateString('uk-UA') + ' · ' + l.darts + ' дрот. · сер. ' + f2(s.avg) + (l.mode === 'ghost' ? ' · 👻 ' + (l.ghost_result === 'win' ? 'виграв' : 'програв') : '') + '</div>' + (typeof l.id === 'number' && w ? '<button class="ms-x" type="button" data-tr="del" data-id="' + l.id + '">✕</button>' : '') + '</div>';
    }).join('') + '</div>';
    return h;
  }

  function viewLive() {
    if (!live) return null;
    if (live.done) {
      var s = { avg: 501 / darts() * 3, f9: sum(live.scores.slice(0, 3)) / Math.min(9, darts()) * 3 };
      var gs = ghostStatus();
      return '<div class="tr-live"><h2>Лег закрито 🎯</h2>' + (live.ghost ? '<div class="tr-ghost ' + (gs === 'win' ? 'win' : 'lose') + '"><span>' + (gs === 'win' ? '👻 Ви обіграли свою тінь!' : '👻 Тінь виявилась швидшою') + '</span></div>' : '') +
        '<div class="ms-stats" style="margin:10px 0">' + stt(darts(), 'дротиків') + stt(f2(s.avg), 'середній за лег') + stt(f2(s.f9), 'перші 9 дротиків') + stt(live.scores.length, 'візитів') + '</div>' +
        '<div class="tr-last">' + live.scores.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
        '<div class="ms-row" style="margin-top:12px"><button type="button" class="ms-btn" data-tr="again">Ще лег</button><button type="button" class="ms-btn sec" data-tr="done">Готово</button></div></div>';
    }
    var r = rem(), gs2 = ghostStatus(), gh = '';
    if (live.ghost) {
      var gr = ghostRem();
      gh = '<div class="tr-ghost ' + (gs2 === 'loss' ? 'lose' : '') + '"><span>👻 Тінь</span><b>' + (gs2 === 'loss' ? 'закрила' : gr) + '</b><span>' + (gs2 === 'loss' ? 'за ' + live.ghost.darts + ' дрот.' : 'візит ' + Math.min(live.scores.length, live.ghost.scores.length) + '/' + live.ghost.scores.length) + '</span></div>';
    }
    var n = live.scores.length, sc = sum(live.scores), avg = n ? sc / (3 * n) * 3 : 0;
    var body;
    if (live.pending != null) {
      body = '<p class="sub" style="text-align:center;margin:12px 0 0">Закриття ' + r + '. Яким дротиком закрили?</p><div class="tr-d"><button type="button" data-tr="d" data-d="1">1</button><button type="button" data-tr="d" data-d="2">2</button><button type="button" data-tr="d" data-d="3">3</button></div><p style="text-align:center"><button type="button" class="ms-btn sec sm" data-tr="undo">↶ Скасувати введення</button></p>';
    } else {
      body = '<div class="tr-ent" id="tr-ent">' + (live.entry || '<span style="color:var(--muted)">0</span>') + '</div>' +
        '<div class="tr-q">' + QUICK.map(function (q) { return '<button type="button" data-tr="q" data-n="' + q + '">' + q + '</button>'; }).join('') + '</div>' +
        '<div class="tr-kp">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (d) { return '<button type="button" data-tr="k" data-n="' + d + '">' + d + '</button>'; }).join('') +
        '<button type="button" data-tr="bs">⌫</button><button type="button" data-tr="k" data-n="0">0</button><button type="button" class="ok" data-tr="ok">OK</button></div>' +
        '<p style="text-align:center;margin:12px 0 0"><button type="button" class="ms-btn sec sm" data-tr="undo"' + (n ? '' : ' disabled') + '>↶ Скасувати візит</button></p><p class="sub kbhint" style="text-align:center;margin:8px 0 0">З клавіатури: цифри · Enter — ввести · Backspace — стерти · Delete — скасувати візит</p>';
    }
    return '<div class="tr-live"><div class="tr-top"><button type="button" class="ms-btn sec sm" data-tr="quit">✕ Вийти</button><span>' + (live.ghost ? 'З тінню' : 'Соло') + ' · візит ' + (n + 1) + '</span><span>сер. ' + (n ? f2(avg) : '—') + '</span></div>' +
      '<div class="tr-rem">' + r + '<small>залишилось</small></div>' + gh +
      '<div class="tr-last">' + live.scores.slice(-6).map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' + body + '</div>';
  }

  // ---------- події ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tr]'); if (!b || !b.closest('#my-space')) return;
    var a = b.getAttribute('data-tr');
    if (navigator.vibrate && (a === 'k' || a === 'q' || a === 'ok')) { try { navigator.vibrate(8); } catch (x) {} }
    if (a === 'start') start('solo');
    else if (a === 'ghost') start('ghost');
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
    else if (a === 'again') { var m = live.mode; live = null; start(m === 'ghost' && T.legs.length >= 10 ? 'ghost' : 'solo'); }
    else if (a === 'del') { var id = Number(b.getAttribute('data-id')); if (confirm('Видалити лег зі статистики?')) MS().sb().from('legs').delete().eq('id', id).then(function (r) { if (r.error) return MS().fail(r.error); T.legs = T.legs.filter(function (l) { return l.id !== id; }); MS().render(); }); }
  });
  // клавіатура на комп'ютері: цифри, Backspace, Enter, Ctrl+Z / Delete — скасувати візит
  document.addEventListener('keydown', function (e) {
    if (!live || e.ctrlKey && e.key.toLowerCase() !== 'z' || e.metaKey || e.altKey) return;
    var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (live.done) { if (e.key === 'Enter') { e.preventDefault(); var m = live.mode; live = null; start(m === 'ghost' && T.legs.length >= 10 ? 'ghost' : 'solo'); } return; }
    if (live.pending != null) {
      if (e.key === '1' || e.key === '2' || e.key === '3') { e.preventDefault(); chooseDarts(Number(e.key)); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); undo(); }
      return;
    }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); if (live.entry.length < 3) { live.entry += e.key; if (live.entry === '00') live.entry = '0'; } MS().render(); }
    else if (e.key === 'Backspace') { e.preventDefault(); if (live.entry) { live.entry = live.entry.slice(0, -1); MS().render(); } else undo(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (live.entry !== '') submit(Number(live.entry)); }
    else if (e.key === 'Delete' || (e.ctrlKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); undo(); }
  });
  document.addEventListener('change', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-trp') && e.target.closest('#my-space')) { T.period = e.target.value; MS().render(); } });

  window.__msExt = window.__msExt || [];
  window.__msExt.push({
    id: 'train', label: '🎯 Тренування', view: viewHome, load: load,
    override: function () { return viewLive(); },
    reset: function () { T.legs = []; live = null; document.body.classList.remove('ms-live'); wakeOff(); }
  });
})();

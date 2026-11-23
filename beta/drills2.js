/* ВФД · «Мій простір» · БЕТА · вправи: дабли, тріпли, скоринг + рекомендації */
(function () {
  'use strict';
  var GAMES = ['dbl', 'trp', 'score'];
  var X = { rows: [], s: null, game: 'dbl', summary: null };
  var SEL = 'id,client_id,played_at,game,param,target,success,darts,scores,detail';
  var IMPOSSIBLE = [163, 166, 169, 172, 173, 175, 176, 178, 179];
  function MS() { return window.__ms; }
  function esc(s) { return MS().esc(s); }
  function uuid() { try { return crypto.randomUUID(); } catch (e) { return 'x' + Date.now() + Math.random().toString(16).slice(2); } }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function f1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function lget(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function stt(v, l) { return '<div class="ms-stat"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }
  function dn(t) { return t === 25 ? 'Bull' : 'D' + t; }
  var wl = null;
  function wakeOn() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wl = l; }, function () {}); } catch (e) {} }
  function wakeOff() { try { if (wl) { wl.release(); wl = null; } } catch (e) {} }
  function live(on) { document.body.classList.toggle('ms-live', !!on); on ? wakeOn() : wakeOff(); }

  // ---------- дані ----------
  function queue() { return lget('ms_dq2') || []; }
  function merge(rows) {
    var have = {}; rows.forEach(function (r) { have[r.client_id] = 1; });
    var extra = queue().filter(function (q) { return !have[q.client_id]; }).map(function (q) { return Object.assign({ id: 'local-' + q.client_id }, q); });
    return extra.concat(rows).sort(function (a, b) { return a.played_at < b.played_at ? 1 : -1; });
  }
  function fetchRows() { return MS().sb().from('drills').select(SEL).in('game', GAMES).order('played_at', { ascending: false }).limit(3000); }
  var flushing = false;
  function flush() {
    var sb = MS().sb(), q = queue(); if (!sb || !q.length || !MS().canWrite() || flushing) return Promise.resolve();
    flushing = true;
    return sb.from('drills').upsert(q, { onConflict: 'user_id,client_id', ignoreDuplicates: true }).then(function (r) {
      flushing = false;
      if (r.error) { console.warn('drills2 sync later', r.error.message); return; }
      lset('ms_dq2', queue().filter(function (x) { return !q.some(function (y) { return y.client_id === x.client_id; }); }));
      return fetchRows().then(function (r2) { if (!r2.error) X.rows = merge(r2.data || []); });
    }, function () { flushing = false; });
  }
  window.addEventListener('online', function () { flush(); });
  function load() {
    var sb = MS().sb(); if (!sb) return Promise.resolve();
    return fetchRows().then(function (r) {
      if (r.error) { console.warn('drills2', r.error.message); X.rows = merge([]); return; }
      X.rows = merge(r.data || []); return flush();
    });
  }
  function save(row) {
    X.rows.unshift(Object.assign({ id: 'local-' + row.client_id }, row));
    var q = queue(); q.push(row); lset('ms_dq2', q); flush();
  }
  function by(g) { return X.rows.filter(function (r) { return r.game === g; }); }

  // ---------- аналітика ----------
  function dblStats() {
    var m = {};
    by('dbl').forEach(function (r) { var o = m[r.target] = m[r.target] || { darts: 0, hits: 0, n: 0 }; o.darts += r.scores.length * 3; o.hits += sum(r.scores); o.n++; });
    return m;
  }
  function trpStats() {
    var m = {};
    by('trp').forEach(function (r) { var o = m[r.target] = m[r.target] || { darts: 0, hits: 0, n: 0 }; o.darts += r.scores.length * 3; o.hits += sum(r.scores); o.n++; });
    return m;
  }
  function weakDouble() {
    var m = dblStats(), best = null, ts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];
    var untested = ts.filter(function (t) { return !m[t] || m[t].darts < 15; });
    if (untested.length) return { t: untested[Math.floor(Math.random() * untested.length)], fresh: true };
    ts.forEach(function (t) { var p = m[t].hits / m[t].darts; if (!best || p < best.p) best = { t: t, p: p }; });
    return best;
  }
  function recommend() {
    var out = [], wd = weakDouble();
    if (wd) out.push({ k: 'dbl', t: wd.t, text: wd.fresh ? 'Ще мало даних по ' + dn(wd.t) + ': спробуйте цей дабл.' : 'Ваш найслабший дабл: ' + dn(wd.t) + ' (' + Math.round(wd.p * 100) + '% влучань).' });
    var ts = trpStats(), worst = null;
    [20, 19, 18].forEach(function (t) { if (ts[t] && ts[t].darts >= 30) { var p = ts[t].hits / ts[t].darts; if (!worst || p < worst.p) worst = { t: t, p: p }; } });
    if (worst) out.push({ k: 'trp', t: worst.t, text: 'Найменше тріплів у ' + worst.t + ' (' + Math.round(worst.p * 100) + '% дротиків).' });
    else if (!by('trp').length) out.push({ k: 'trp', t: 20, text: 'Спробуйте тренування тріплів: почніть з 20.' });
    return out;
  }

  // ---------- сесії ----------
  function startS(kind, t) {
    X.summary = null;
    if (kind === 'dbl') X.s = { id: uuid(), kind: kind, t: t, v: [], N: 5 };
    else if (kind === 'trp') X.s = { id: uuid(), kind: kind, t: t, v: [], N: 10 };
    else X.s = { id: uuid(), kind: 'score', v: [], N: 10 };
    live(true); MS().render();
  }
  function finishS() {
    var s = X.s, row;
    if (!s.v.length) { X.s = null; live(false); return MS().render(); }
    var now = new Date().toISOString();
    if (s.kind === 'dbl' || s.kind === 'trp') row = { client_id: s.id, played_at: now, game: s.kind, param: null, target: s.t, success: true, darts: s.v.length * 3, scores: s.v.slice(), detail: { hits: sum(s.v) } };
    else if (s.kind === 'score') row = { client_id: s.id, played_at: now, game: 'score', param: null, target: null, success: true, darts: s.v.length * 3, scores: s.v.slice(), detail: { avg: sum(s.v) / s.v.length } };
    save(row);
    X.summary = { kind: s.kind, t: s.t, v: s.v.slice(), ok: row.success };
    X.s = null; live(false); MS().render();
  }
  function addV(n) {
    var s = X.s; s.v.push(n);
    var done = s.v.length >= s.N;
    if (done) finishS(); else MS().render();
  }

  // ---------- екрани ----------
  function viewLive() {
    var s = X.s; if (!s) return null;
    var vis = s.v.length, title, body, pts = sum(s.v);
    if (s.kind === 'dbl') { title = 'Дабл ' + dn(s.t) + ' · підхід ' + (vis + 1) + '/' + s.N; body = '<p class="sub" style="text-align:center;margin:14px 0 0">Скільки з 3 дротиків влучили в ' + dn(s.t) + '?</p><div class="tr-sec four" style="grid-template-columns:1fr 1fr">' + [0, 1, 2, 3].map(function (n) { return '<button type="button" class="' + (n === 0 ? 'no' : n === 3 ? 'yes' : '') + '" data-dx="v" data-n="' + n + '">' + n + '</button>'; }).join('') + '</div>'; }
    else if (s.kind === 'trp') { title = 'Тріпл ' + s.t + ' · підхід ' + (vis + 1) + '/' + s.N; body = '<p class="sub" style="text-align:center;margin:14px 0 0">Скільки з 3 дротиків влучили в тріпл ' + s.t + '?</p><div class="tr-sec four" style="grid-template-columns:1fr 1fr">' + [0, 1, 2, 3].map(function (n) { return '<button type="button" class="' + (n === 0 ? 'no' : n === 3 ? 'yes' : '') + '" data-dx="v" data-n="' + n + '">' + n + '</button>'; }).join('') + '</div>'; }
    else if (s.kind === 'score') {
      title = 'Скоринг · підхід ' + (vis + 1) + '/' + s.N;
      body = '<p class="sub" style="text-align:center;margin:14px 0 6px">Введіть суму за 3 дротики (у 20-ку чи по мішені, як вирішите).</p><form id="dx-sf" class="ms-row" style="justify-content:center"><input class="ms-in" id="dx-sin" type="number" inputmode="numeric" min="0" max="180" style="width:120px;font-size:22px;text-align:center" autofocus><button class="ms-btn" type="submit">OK</button></form>' +
        '<div class="tr-sg" style="grid-template-columns:repeat(4,1fr);margin-top:12px">' + [0, 26, 41, 45, 60, 85, 100, 140, 180].map(function (n) { return '<button type="button" data-dx="v" data-n="' + n + '">' + n + '</button>'; }).join('') + '</div>';
    }
    return '<div class="tr-live"><div class="tr-top"><button type="button" class="ms-btn sec sm" data-dx="quit">✕ Вийти</button><span>' + title + '</span><span>' + (s.kind === 'score' ? 'Σ ' + pts : pts + ' влуч.') + '</span></div>' + (window.__trProg ? window.__trProg(vis, s.N, 'Підхід') : '') + body +
      '<div class="tr-last">' + s.v.slice(-8).map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
      '<p style="text-align:center;margin:14px 0 0"><button type="button" class="ms-btn sec sm" data-dx="undo"' + (vis ? '' : ' disabled') + '>↶ Скасувати</button> ' + (s.kind === 'score' ? '<button type="button" class="ms-btn sec sm" data-dx="end"' + (vis ? '' : ' disabled') + '>Завершити</button>' : '') + '</p></div>';
  }
  function summary() {
    var m = X.summary, v = m.v, h, again = m.kind === 'dbl' || m.kind === 'trp' ? '<button type="button" class="ms-btn" data-dx="start" data-k="' + m.kind + '" data-tt="' + m.t + '">Ще раз</button>' : '<button type="button" class="ms-btn" data-dx="start" data-k="' + m.kind + '">Ще раз</button>';
    if (m.kind === 'dbl' || m.kind === 'trp') { var hits = sum(v); h = '<h2>' + (m.kind === 'dbl' ? dn(m.t) : 'Тріпл ' + m.t) + ': ' + hits + ' з ' + v.length * 3 + '</h2><div class="ms-stats" style="margin:10px 0">' + stt(Math.round(hits / (v.length * 3) * 100) + '%', 'влучань') + stt(Math.max.apply(null, v), 'найкращий підхід') + '</div>'; }
    else if (m.kind === 'score') h = '<h2>Скоринг завершено</h2><div class="ms-stats" style="margin:10px 0">' + stt(f2(sum(v) / v.length), 'середній за підхід') + stt(f2(sum(v) / v.length), '3-дротиковий середній') + stt(v.filter(function (x) { return x >= 100; }).length, 'підходів 100+') + stt(Math.max.apply(null, v), 'найкращий підхід') + '</div>';
    return '<div class="tr-live">' + h + '<div class="tr-last">' + v.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="ms-row" style="margin-top:12px">' + again + '<button type="button" class="ms-btn sec" data-dx="close">Готово</button></div></div>';
  }
  function heat(st, ts, name) {
    return '<div class="dx-heat">' + ts.map(function (t) {
      var o = st[t], p = o && o.darts ? o.hits / o.darts : null, col = p == null ? 'var(--bg)' : p >= 0.3 ? '#1c3b2a' : p >= 0.15 ? '#3a2a10' : '#3b1c1c';
      return '<button type="button" data-dx="start" data-k="' + (name === 'dbl' ? 'dbl' : 'trp') + '" data-tt="' + t + '" style="background:' + col + '"><b>' + (name === 'dbl' ? dn(t) : t) + '</b><small>' + (p == null ? '—' : Math.round(p * 100) + '%') + '</small></button>';
    }).join('') + '</div>';
  }
  function viewHome() {
    var w = MS().canWrite(), g = X.game, h = '';
    if (X.summary) return summary();
    var rec = recommend();
    if (rec.length && w) h += '<div class="ms-card" style="border-left:5px solid #2ecc71"><b>💡 Рекомендація на сьогодні</b>' + rec.map(function (r) { return '<div class="ms-row" style="justify-content:space-between;margin-top:8px;font-size:13px"><span style="flex:1">' + esc(r.text) + '</span><button type="button" class="ms-btn sm" data-dx="start" data-k="' + r.k + '" data-tt="' + r.t + '">Почати</button></div>'; }).join('') + '</div>';
    var games = [['dbl', 'Дабли'], ['trp', 'Тріпли'], ['score', 'Скоринг']];
    h += '<div class="ms-tabs">' + games.map(function (x) { return '<button type="button" data-dx="game" data-g="' + x[0] + '" class="' + (g === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var rows = by(g);
    if (g === 'dbl') {
      var st = dblStats(), ts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];
      h += '<div class="ms-card"><b>Дабли</b><p class="sub" style="margin:4px 0 10px">5 підходів по 3 дротики в один дабл (15 дротиків). Після кожного підходу вкажіть, скільки дротиків влучили. Натисніть на дабл, щоб почати.</p>' + heat(st, ts, 'dbl') +
        '<p class="sub" style="margin:8px 0">Колір: зелений від 30% влучань, жовтий 15–30%, червоний нижче. Сірий: ще немає даних.</p>' +
        '<div class="ms-row"><button type="button" class="ms-btn sec sm" data-dx="start" data-k="dbl" data-tt="rnd"' + (w ? '' : ' disabled') + '>🎲 Випадковий дабл</button><button type="button" class="ms-btn sec sm" data-dx="start" data-k="dbl" data-tt="weak"' + (w ? '' : ' disabled') + '>⚠ Мій слабкий дабл</button></div></div>';
      if (rows.length) { var d = 0, hh = 0; rows.forEach(function (r) { d += r.scores.length * 3; hh += sum(r.scores); }); h += '<div class="ms-card"><b>Статистика · ' + rows.length + ' вправ</b><div class="ms-stats" style="margin-top:10px">' + stt(Math.round(hh / d * 100) + '%', 'влучань у дабл') + stt(d, 'дротиків кинуто') + '</div></div>'; }
    } else if (g === 'trp') {
      var ts2 = trpStats();
      h += '<div class="ms-card"><b>Тріпли</b><p class="sub" style="margin:4px 0 10px">10 підходів по 3 дротики в тріпл обраного сектора (30 дротиків). Вкажіть, скільки дротиків влучили в тріпл.</p>' + heat(ts2, [20, 19, 18, 17, 16, 15], 'trp') + '</div>';
      if (rows.length) { var d2 = 0, h2 = 0, t3 = 0, nv = 0; rows.forEach(function (r) { d2 += r.scores.length * 3; h2 += sum(r.scores); r.scores.forEach(function (x) { nv++; if (x === 3) t3++; }); }); h += '<div class="ms-card"><b>Статистика · ' + rows.length + ' вправ</b><div class="ms-stats" style="margin-top:10px">' + stt(Math.round(h2 / d2 * 100) + '%', 'дротиків у тріпл') + stt(f2(h2 / nv), 'тріплів за підхід') + stt(t3, 'підходів «3 з 3»') + stt(d2, 'дротиків кинуто') + '</div></div>'; }
    } else if (g === 'score') {
      h += '<div class="ms-card"><b>Скоринг-раунди</b><p class="sub" style="margin:4px 0 10px">10 підходів по 3 дротики. Вносьте суму за кожен підхід. Це тренування стабільності набору.</p><button type="button" class="ms-btn" data-dx="start" data-k="score"' + (w ? '' : ' disabled') + '>▶ Почати раунд</button></div>';
      if (rows.length) { var all = []; rows.forEach(function (r) { all = all.concat(r.scores); }); h += '<div class="ms-card"><b>Статистика · ' + rows.length + ' раундів</b><div class="ms-stats" style="margin-top:10px">' + stt(f2(sum(all) / all.length), 'середній за підхід') + stt(Math.max.apply(null, rows.map(function (r) { return sum(r.scores) / r.scores.length; })).toFixed(2), 'найкращий раунд (сер.)') + stt(all.filter(function (x) { return x >= 100; }).length, 'підходів 100+') + stt(all.filter(function (x) { return x === 180; }).length, '180') + '</div></div>'; }
    }
    if (rows.length) h += '<div class="ms-card"><b>Останні</b>' + rows.slice(0, 8).map(function (r) {
      var lab = r.game === 'dbl' ? dn(r.target) + ': ' + sum(r.scores) + '/' + r.scores.length * 3 : r.game === 'trp' ? 'тріпл ' + r.target + ': ' + sum(r.scores) + '/' + r.scores.length * 3 : r.game === 'score' ? 'сер. ' + f2(sum(r.scores) / r.scores.length) : '';
      return '<div class="tr-leg"><div>' + new Date(r.played_at).toLocaleDateString('uk-UA') + ' · <b>' + lab + '</b></div>' + (typeof r.id === 'number' && w ? '<button class="ms-x" type="button" data-dx="del" data-id="' + r.id + '" title="Видалити цей запис">🗑</button>' : '') + '</div>';
    }).join('') + '</div>';
    return h;
  }

  // ---------- події ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dx]'); if (!b || !b.closest('#my-space')) return;
    var a = b.getAttribute('data-dx');
    if (a === 'game') { X.game = b.getAttribute('data-g'); X.summary = null; MS().render(); }
    else if (a === 'start') {
      var k = b.getAttribute('data-k'), t = b.getAttribute('data-tt'), n;
      if (k === 'dbl') { var ts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25]; n = t === 'rnd' ? ts[Math.floor(Math.random() * ts.length)] : t === 'weak' ? weakDouble().t : Number(t); }
      else n = Number(t);
      if (!MS().canWrite()) return;
      X.game = k; startS(k, n);
    }
    else if (a === 'v') { if (X.s) addV(Number(b.getAttribute('data-n'))); }
    else if (a === 'undo') { if (X.s && X.s.v.length) { X.s.v.pop(); MS().render(); } }
    else if (a === 'end') finishS();
    else if (a === 'quit') { if (!X.s.v.length || confirm('Вийти без збереження?')) { X.s = null; live(false); MS().render(); } }
    else if (a === 'close') { X.summary = null; MS().render(); }
    else if (a === 'del') { var id = Number(b.getAttribute('data-id')); if (confirm('Видалити запис?')) MS().sb().from('drills').delete().eq('id', id).then(function (r) { if (r.error) return MS().fail(r.error); X.rows = X.rows.filter(function (x) { return x.id !== id; }); MS().render(); }); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'dx-sf') return; e.preventDefault();
    var v = parseInt(document.getElementById('dx-sin').value, 10);
    if (!isFinite(v) || v < 0 || v > 180 || IMPOSSIBLE.indexOf(v) >= 0) return MS().toast('Такий набір неможливий (0–180)');
    if (X.s) addV(v);
  });

  var css = document.createElement('style');
  css.textContent = '.dx-heat{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.dx-heat button{border:1px solid var(--line);border-radius:10px;padding:9px 4px;color:var(--cream);cursor:pointer;font:600 12px Inter,sans-serif}.dx-heat b{display:block;font-size:15px}.dx-heat small{color:var(--muted)}';
  document.head.appendChild(css);

  window.__drillsApi = {
    recommend: recommend,
    start: function (k, t) { X.game = k; if (MS().canWrite()) startS(k, t); },
    rows: function () { return X.rows; }
  };

  window.__msExt = window.__msExt || [];
  window.__msExt.push({
    id: 'drills2', label: '🎯 Вправи', view: viewHome, load: load,
    override: function () { return viewLive(); },
    overview: function (year) {
      function iy(x) { return year === 'all' || new Date(x).getFullYear() === year; }
      var r = X.rows.filter(function (x) { return iy(x.played_at); }); if (!r.length) return '';
      var d = r.filter(function (x) { return x.game === 'dbl'; }), t = r.filter(function (x) { return x.game === 'trp'; }), s = r.filter(function (x) { return x.game === 'score'; });
      var cells = [];
      if (d.length) cells.push(stt(Math.round(sum(d.map(function (x) { return sum(x.scores); })) / sum(d.map(function (x) { return x.scores.length * 3; })) * 100) + '%', 'влучань у дабли'));
      if (t.length) cells.push(stt(Math.round(sum(t.map(function (x) { return sum(x.scores); })) / sum(t.map(function (x) { return x.scores.length * 3; })) * 100) + '%', 'дротиків у тріпл'));
      if (s.length) { var all = []; s.forEach(function (x) { all = all.concat(x.scores); }); cells.push(stt(f2(sum(all) / all.length), 'скоринг: середній за підхід')); }
      return '<div class="ms-stats" style="margin-top:8px">' + cells.join('') + '</div><p style="margin:12px 0 0"><button type="button" class="ms-btn sec sm" data-t="drills2">До вправ ›</button></p>';
    },
    exportSheets: function () {
      function d(x) { var t = new Date(x); return ('0' + t.getDate()).slice(-2) + '.' + ('0' + (t.getMonth() + 1)).slice(-2) + '.' + t.getFullYear(); }
      return [
        { name: 'Дабли', rows: [['Дата', 'Дабл', 'Влучань', 'Дротиків', 'Підходи (влучань)']].concat(by('dbl').map(function (r) { return [d(r.played_at), dn(r.target), sum(r.scores), r.scores.length * 3, r.scores.join(' ')]; })) },
        { name: 'Тріпли', rows: [['Дата', 'Сектор', 'Влучань', 'Дротиків', 'Підходи (влучань)']].concat(by('trp').map(function (r) { return [d(r.played_at), r.target, sum(r.scores), r.scores.length * 3, r.scores.join(' ')]; })) },
        { name: 'Скоринг', rows: [['Дата', 'Середній за підхід', 'Підходи']].concat(by('score').map(function (r) { return [d(r.played_at), Math.round(sum(r.scores) / r.scores.length * 100) / 100, r.scores.join(' ')]; })) }
      ];
    },
    reset: function () { X.rows = []; X.s = null; X.summary = null; live(false); }
  });
})();

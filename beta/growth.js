/* ВФД · «Мій простір» · БЕТА · розвиток: цілі, серії, бейджі, план, рефлексії, порівняння, стрічка */
(function () {
  'use strict';
  var G = { sub: 'goals', goal: null, plan: null, refl: [], old: false, mood: 0 };
  var EXERCISES = ['Лічильник 501DO', 'Гра з тінню', 'Дабли', 'Тріпли', 'Скоринг', '170+1', '60+10−1', 'Сектор', 'Закриття (таблиця)', 'Матч / турнір', 'Відпочинок'];
  var DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];
  function MS() { return window.__ms; }
  function esc(s) { return MS().esc(s); }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function stt(v, l) { return '<div class="ms-stat"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }
  function uuid() { try { return crypto.randomUUID(); } catch (e) { return 'x' + Date.now() + Math.random().toString(16).slice(2); } }
  function pad(n) { return ('0' + n).slice(-2); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayOf(x) { return iso(new Date(x)); }
  function today() { return iso(new Date()); }
  function fmt(s) { var p = String(s).slice(0, 10).split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
  function mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

  // ---------- збір даних ----------
  function T() { return (window.__trainData ? window.__trainData() : { legs: [], drills: [] }); }
  function drills() { return T().drills.concat(window.__drillsApi ? window.__drillsApi.rows() : []); }
  function legs() { return T().legs.filter(function (l) { return l.finished !== false; }); }
  function trainDays() {
    var s = {}; legs().forEach(function (l) { s[dayOf(l.played_at)] = 1; }); drills().forEach(function (r) { s[dayOf(r.played_at)] = 1; }); return s;
  }
  function activeDays() {
    var s = trainDays(), D = MS().data();
    D.checkouts.forEach(function (c) { if (c.achieved_at) s[dayOf(c.achieved_at)] = 1; });
    D.events.forEach(function (e) { s[String(e.event_date).slice(0, 10)] = 1; });
    return s;
  }
  function streaks() {
    var s = activeDays(), keys = Object.keys(s).sort(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var d = new Date(k + 'T12:00:00');
      if (prev && Math.round((d - prev) / 864e5) === 1) run++; else run = 1;
      if (run > best) best = run; prev = d;
    });
    var cur = 0, d = new Date(); d.setHours(12);
    if (!s[iso(d)]) d.setDate(d.getDate() - 1);
    while (s[iso(d)]) { cur++; d.setDate(d.getDate() - 1); }
    return { cur: cur, best: best };
  }
  function legAvg(l) { return sum(l.scores || [501]) / l.darts * 3; }
  // зважені середні (сума очок / сума дротиків), так само як у статистиці тренувань 501DO
  function wAvg(a) { var sc = 0, dt = 0; a.forEach(function (l) { sc += sum(l.scores || [501]); dt += l.darts; }); return dt ? sc / dt * 3 : null; }
  function wF9(a) { var sc = 0, dt = 0; a.forEach(function (l) { sc += sum((l.scores || []).slice(0, 3)); dt += Math.min(9, l.darts); }); return dt ? sc / dt * 3 : null; }
  function legF9(l) { var sc = (l.scores || []).slice(0, 3); return sum(sc) / Math.min(9, l.darts) * 3; }

  // ---------- збереження ----------
  function upsert(clientId, kind, data) {
    var sb = MS().sb();
    return sb.from('dev').upsert({ client_id: clientId, kind: kind, data: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id,client_id' }).select().then(function (r) {
      if (r.error) { MS().fail(r.error); return false; } return true;
    });
  }
  function load() {
    var sb = MS().sb(); if (!sb) return Promise.resolve();
    return sb.from('dev').select('id,client_id,kind,data,created_at').order('created_at', { ascending: false }).limit(500).then(function (r) {
      if (r.error) { G.old = true; return; }
      G.old = false; G.refl = []; G.goal = null; G.plan = null;
      (r.data || []).forEach(function (x) {
        if (x.kind === 'goal') G.goal = x.data; else if (x.kind === 'plan') G.plan = x.data;
        else if (x.kind === 'reflect') G.refl.push(Object.assign({ id: x.id, cid: x.client_id, created: x.created_at }, x.data));
      });
    });
  }

  // ---------- бейджі (багаторазові: лічильник ×N) ----------
  function weeksGoalMet() {
    var td = trainDays(), goal = (G.goal && G.goal.weekly) || 3, w = {};
    Object.keys(td).forEach(function (k) { var m = iso(mondayOf(new Date(k + 'T12:00:00'))); w[m] = (w[m] || 0) + 1; });
    return Object.keys(w).filter(function (k) { return w[k] >= goal; }).length;
  }
  function weekStreaks() {
    var s = activeDays(), keys = Object.keys(s).sort(), run = 0, prev = null, total = 0;
    keys.forEach(function (k) { var d = new Date(k + 'T12:00:00'); if (prev && Math.round((d - prev) / 864e5) === 1) run++; else { total += Math.floor(run / 7); run = 1; } prev = d; });
    return total + Math.floor(run / 7);
  }
  function badges() {
    var L = legs(), Dr = drills(), D = MS().data(), P = MS().profile(), out = [];
    // step: скільки потрібно для одного отримання (лічильник росте безкінечно); step=0: разова подія
    function b(icon, name, desc, cur, step) { var cnt = step ? Math.floor(cur / step) : (cur ? 1 : 0); out.push({ i: icon, n: name, d: desc, cnt: cnt, step: step, prog: step ? cur % step : 0 }); }
    function cnt(g) { return Dr.filter(function (r) { return r.game === g; }).length; }
    // перемоги над тінню: рахуємо ІГРИ (матчі), а не леги; одиночний лег із тінню (без матчу) - це теж гра
    var gm = {};
    L.forEach(function (l) { if (l.mode !== 'ghost') return; var k = l.match_id || l.client_id; (gm[k] = gm[k] || { bo: l.best_of || 1, w: 0, n: 0 }); gm[k].n++; if (l.ghost_result === 'win') gm[k].w++; });
    var ghostWins = Object.keys(gm).filter(function (k) { return gm[k].w >= (gm[k].bo + 1) / 2; }).length;
    // закриття 100+ у тренувальних іграх 501DO: останній візит завершеного лега, який закрив саме гравець
    var co100 = 0, co170 = 0;
    L.forEach(function (l) {
      if (!l.scores || !l.scores.length || sum(l.scores) !== 501) return;
      if ((l.mode === 'ghost' || l.mode === 'duel') && l.ghost_result !== 'win') return;
      var last = l.scores[l.scores.length - 1]; if (last >= 100) co100++; if (last === 170) co170++;
    });
    // 170+1: один результат = повний прохід 170 → 180
    var passes = Dr.filter(function (r) { return r.game === 'p171' && r.success && r.target >= 180; }).length;
    var ds = {}, dblMasters = 0;
    Dr.filter(function (r) { return r.game === 'dbl'; }).forEach(function (r) { var o = ds[r.target] = ds[r.target] || { d: 0, h: 0 }; o.d += r.scores.length * 3; o.h += sum(r.scores); });
    Object.keys(ds).forEach(function (k) { if (ds[k].d >= 30 && ds[k].h / ds[k].d >= 0.4) dblMasters++; });
    b('🎯', 'Леги', 'кожні 10 завершених легів', L.length, 10);
    b('👻', 'Перемоги над тінню', 'кожна виграна гра (матч) із тінню', ghostWins, 1);
    b('⚡', 'Тиждень поспіль', 'кожні 7 днів активності підряд', weekStreaks(), 1);
    b('📅', 'Тижні з виконаною ціллю', 'кожен тиждень, коли виконано ціль тренувальних днів', weeksGoalMet(), 1);
    b('💥', 'Закриття 100+', 'кожне закриття від 100 у іграх 501DO в тренуваннях', co100, 1);
    b('👑', 'Закриття 170', 'кожне закриття 170 у іграх 501DO в тренуваннях', co170, 1);
    b('🎪', 'Дабл-майстер', 'кожен дабл із 40%+ влучань (від 30 дротиків)', dblMasters, 1);
    b('🔺', 'Тріпл-практика', 'кожні 10 вправ на тріпли', cnt('trp'), 10);
    b('🎲', 'Скоринг-раунди', 'кожні 5 раундів скорингу', cnt('score'), 5);
    b('📈', '170+1', 'кожен повний прохід від 170 до 180', passes, 1);
    b('🎯', 'Сектор', 'кожні 5 тренувань сектора', cnt('sector'), 5);
    b('📓', 'Опановані навички', 'кожна закрита ціль у щоденнику', D.skills.filter(function (k) { return k.status === 'done'; }).length, 1);
    b('📝', 'Рефлексії', 'кожні 3 записи «після гри»', G.refl.length, 3);
    b('🪪', 'Профіль заповнено', 'фото та «про мене» (одноразово)', (P.photo && P.bio) ? 1 : 0, 0);
    return out;
  }

  // ---------- графіки ----------
  function bars(labels, vals, fmtv, color) {
    var mx = Math.max.apply(null, vals.filter(function (v) { return v != null; }).concat([0.0001]));
    return '<div style="display:flex;gap:6px;align-items:flex-end;height:110px;margin-top:8px">' + vals.map(function (v, i) {
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:10px;color:var(--muted)"><span>' + (v == null ? '' : fmtv(v)) + '</span><div style="width:100%;background:' + (v == null ? 'transparent' : color) + ';border-radius:5px 5px 0 0;height:' + (v == null ? 0 : Math.max(3, Math.round(v / mx * 80))) + 'px"></div><span>' + labels[i] + '</span></div>';
    }).join('') + '</div>';
  }
  function months(n) {
    var out = [], d = new Date(); d.setDate(1);
    for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ key: x.getFullYear() + '-' + pad(x.getMonth() + 1), lab: pad(x.getMonth() + 1) + '.' + String(x.getFullYear()).slice(2) }); }
    return out;
  }

  // ---------- екрани ----------
  function subTabs() {
    var t = [['goals', 'Цілі'], ['badges', 'Бейджі'], ['plan', 'План'], ['refl', 'Після гри'], ['cmp', 'Прогрес'], ['feed', 'Стрічка']];
    return '<div class="ms-tabs">' + t.map(function (x) { return '<button type="button" data-gx="sub" data-s="' + x[0] + '" class="' + (G.sub === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function viewGoals() {
    var st = streaks(), g = G.goal || { weekly: 3, avg: null }, td = trainDays(), mon = mondayOf(new Date()), n = 0, dots = '';
    for (var i = 0; i < 7; i++) { var d = new Date(mon); d.setDate(mon.getDate() + i); var k = iso(d), on = !!td[k], isT = k === today(); if (on) n++; dots += '<div style="flex:1;text-align:center;font-size:11px;color:var(--muted)"><div style="height:30px;border-radius:9px;margin-bottom:4px;display:flex;align-items:center;justify-content:center;background:' + (on ? '#1c3b2a' : 'var(--bg)') + ';border:1px solid ' + (isT ? 'var(--gold)' : 'var(--line)') + '">' + (on ? '✓' : '') + '</div>' + DAYS[i] + '</div>'; }
    var pct = Math.min(100, Math.round(n / (g.weekly || 3) * 100));
    var L = legs().filter(function (l) { return Date.now() - new Date(l.played_at) < 30 * 864e5; }), cur = L.length ? wAvg(L) : null;
    var h = '<div class="ms-card"><div class="ms-stats">' + stt('🔥 ' + st.cur, 'днів активності поспіль') + stt(st.best, 'найкраща серія') + '</div></div>';
    h += '<div class="ms-card"><b>Тиждень: ' + n + ' з ' + (g.weekly || 3) + ' тренувальних днів</b><div class="ms-bar" style="margin:10px 0"><div style="width:' + pct + '%"></div></div><div style="display:flex;gap:5px">' + dots + '</div>' +
      (n >= (g.weekly || 3) ? '<p class="sub" style="margin:10px 0 0;color:#8fe3b0">Ціль тижня виконано. Відмінна робота!</p>' : '<p class="sub" style="margin:10px 0 0">Лишилось ' + ((g.weekly || 3) - n) + '. Без поспіху: регулярність важливіша за обсяг.</p>') + '</div>';
    h += '<form id="gx-gf" class="ms-card"><b>Мої цілі</b><label class="sub" style="display:block;margin:10px 0 4px">Тренувальних днів на тиждень</label><select class="ms-in" name="weekly">' + [1, 2, 3, 4, 5, 6, 7].map(function (x) { return '<option' + (x === (g.weekly || 3) ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
      '<label class="sub" style="display:block;margin:10px 0 4px">Ціль: середній за 3 дротики у 501DO (необов\'язково)</label><input class="ms-in" name="avg" type="number" step="0.1" min="0" max="180" value="' + (g.avg || '') + '" placeholder="наприклад 55">' +
      (g.avg && cur != null ? '<p class="sub" style="margin:8px 0 0">Останні 30 днів: <b>' + f2(cur) + '</b> з ' + g.avg + ' (' + Math.min(100, Math.round(cur / g.avg * 100)) + '%)</p>' : '') +
      '<p style="margin:12px 0 0"><button class="ms-btn" type="submit"' + (MS().canWrite() ? '' : ' disabled') + '>Зберегти цілі</button></p></form>';
    var rec = window.__drillsApi ? window.__drillsApi.recommend() : [];
    if (rec.length) h += '<div class="ms-card" style="border-left:5px solid #2ecc71"><b>💡 Що потренувати</b>' + rec.map(function (r) { return '<div class="ms-row" style="justify-content:space-between;margin-top:8px;font-size:13px"><span style="flex:1">' + esc(r.text) + '</span><button type="button" class="ms-btn sm" data-gx="go" data-k="' + r.k + '" data-tt="' + r.t + '">Почати</button></div>'; }).join('') + '</div>';
    return h;
  }
  function viewBadges() {
    var bs = badges(), total = bs.reduce(function (a, b) { return a + b.cnt; }, 0), types = bs.filter(function (b) { return b.cnt > 0; }).length;
    return '<div class="ms-card"><b>Бейджі · ' + types + ' з ' + bs.length + ' · всього ×' + total + '</b><p class="sub" style="margin:4px 0 10px">Бейджі багаторазові: лічильник ×N росте безкінечно. Це лише ваш прогрес, без порівняння з іншими.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + bs.map(function (b) {
      var ok = b.cnt > 0;
      return '<div style="border:1px solid ' + (ok ? 'var(--gold)' : 'var(--line)') + ';border-radius:12px;padding:10px;background:var(--bg);position:relative"><div style="font-size:26px;filter:' + (ok ? 'none' : 'grayscale(1)') + ';opacity:' + (ok ? 1 : 0.5) + '">' + b.i + '</div>' +
        (ok && b.step !== 0 ? '<span style="position:absolute;top:8px;right:10px;background:var(--gold);color:#101535;font:800 13px Inter,sans-serif;border-radius:999px;padding:2px 9px">×' + b.cnt + '</span>' : ok ? '<span style="position:absolute;top:8px;right:10px;color:#8fe3b0;font-weight:800">✓</span>' : '') +
        '<b style="font-size:13px">' + esc(b.n) + '</b><div class="sub" style="margin:2px 0 0;font-size:11px">' + esc(b.d) + '</div>' +
        (b.step > 1 ? '<div class="ms-bar" style="margin:8px 0 2px"><div style="width:' + Math.round(b.prog / b.step * 100) + '%"></div></div><div class="sub" style="margin:0;font-size:10px">до наступного: ' + (b.step - b.prog) + '</div>' : '') + '</div>';
    }).join('') + '</div></div>';
  }
  function viewPlan() {
    var P = G.plan || { days: {}, done: {} }, mon = mondayOf(new Date()), td = trainDays(), w = MS().canWrite();
    var h = '<div class="ms-card"><b>План на тиждень</b><p class="sub" style="margin:4px 0 10px">Оберіть вправу на кожен день і відмічайте виконане. Шаблон повторюється щотижня.</p>';
    for (var i = 0; i < 7; i++) {
      var d = new Date(mon); d.setDate(mon.getDate() + i); var k = iso(d), ex = (P.days || {})[i] || '', dn = (P.done || {})[k], auto = !!td[k] && ex && ex !== 'Відпочинок';
      h += '<div class="ms-row" style="align-items:center;margin-bottom:8px;flex-wrap:nowrap"><div style="width:44px;font-size:12px;color:' + (k === today() ? 'var(--gold)' : 'var(--muted)') + ';font-weight:700">' + DAYS[i] + '<br><small>' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '</small></div>' +
        '<select class="ms-in" data-gx="pday" data-i="' + i + '" style="flex:1"' + (w ? '' : ' disabled') + '><option value="">—</option>' + EXERCISES.map(function (x) { return '<option' + (x === ex ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="ms-btn sm ' + (dn || auto ? 'ok' : 'sec') + '" data-gx="pdone" data-k="' + k + '"' + (ex && ex !== 'Відпочинок' && w ? '' : ' disabled') + '>' + (dn || auto ? '✓' : '○') + '</button></div>';
    }
    return h + '<p class="sub" style="margin:8px 0 0">✓ ставиться автоматично, якщо цього дня є тренування в кабінеті. Також можна відмітити вручну.</p></div>';
  }
  function viewRefl() {
    var w = MS().canWrite(), moods = ['😞', '😕', '😐', '🙂', '😄'], h = '';
    h += '<form id="gx-rf" class="ms-card"><b>Після гри</b><p class="sub" style="margin:4px 0 8px">Три швидкі питання. Через час видно, як стан впливає на результат.</p>' +
      '<label class="sub" style="display:block;margin:6px 0 4px">Дата</label><input class="ms-in" type="date" name="date" value="' + today() + '">' +
      '<label class="sub" style="display:block;margin:10px 0 4px">Настрій / самопочуття</label><div class="ms-row">' + moods.map(function (m, i) { return '<button type="button" class="ms-btn sm ' + (G.mood === i + 1 ? '' : 'sec') + '" data-gx="mood" data-m="' + (i + 1) + '" style="font-size:20px;padding:6px 12px">' + m + '</button>'; }).join('') + '</div>' +
      '<label class="sub" style="display:block;margin:10px 0 4px">Що вийшло добре?</label><textarea class="ms-in" name="good" rows="2" maxlength="400"></textarea>' +
      '<label class="sub" style="display:block;margin:10px 0 4px">Що не вийшло?</label><textarea class="ms-in" name="bad" rows="2" maxlength="400"></textarea>' +
      '<label class="sub" style="display:block;margin:10px 0 4px">Над чим працюю далі?</label><textarea class="ms-in" name="next" rows="2" maxlength="400"></textarea>' +
      '<p style="margin:12px 0 0"><button class="ms-btn" type="submit"' + (w ? '' : ' disabled') + '>Зберегти</button></p></form>';
    // настрій ↔ середній
    var ev = {}; MS().data().events.forEach(function (e) { if (e.avg_game != null) ev[String(e.event_date).slice(0, 10)] = Number(e.avg_game); });
    var hi = [], lo = []; G.refl.forEach(function (r) { var a = ev[r.date]; if (a == null) return; (r.mood >= 4 ? hi : lo).push(a); });
    if (hi.length && lo.length) h += '<div class="ms-card"><b>Настрій і результат</b><div class="ms-stats" style="margin-top:10px">' + stt(f2(sum(hi) / hi.length), 'сер. за гру при настрої 4–5 (' + hi.length + ')') + stt(f2(sum(lo) / lo.length), 'сер. за гру при настрої 1–3 (' + lo.length + ')') + '</div></div>';
    else if (G.refl.length) h += '<p class="sub">Щоб побачити зв\'язок настрою з результатом, додайте рефлексії на дати ігор із середнім у журналі.</p>';
    if (G.refl.length) h += '<div class="ms-card"><b>Записи</b>' + G.refl.slice(0, 15).map(function (r) {
      return '<div style="border-top:1px solid var(--line);padding:10px 0;font-size:13px"><div class="ms-row" style="justify-content:space-between"><b>' + fmt(r.date) + ' ' + (moods[(r.mood || 3) - 1] || '') + '</b>' + (w ? '<button class="ms-x" type="button" data-gx="rdel" data-id="' + r.id + '" title="Видалити цей запис">🗑</button>' : '') + '</div>' +
        (r.good ? '<div>👍 ' + esc(r.good) + '</div>' : '') + (r.bad ? '<div>👎 ' + esc(r.bad) + '</div>' : '') + (r.next ? '<div>➡ ' + esc(r.next) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    return h;
  }
  function viewCmp() {
    var ms = months(6), L = legs(), D = MS().data(), td = trainDays(), h = '';
    function m(l) { return dayOf(l.played_at).slice(0, 7); }
    var av = ms.map(function (x) { var a = L.filter(function (l) { return m(l) === x.key; }); return wAvg(a); });
    var f9 = ms.map(function (x) { var a = L.filter(function (l) { return m(l) === x.key; }); return wF9(a); });
    var gm = ms.map(function (x) { var a = D.events.filter(function (e) { return String(e.event_date).slice(0, 7) === x.key && e.avg_game != null; }); return a.length ? sum(a.map(function (e) { return Number(e.avg_game); })) / a.length : null; });
    var vol = ms.map(function (x) { return Object.keys(td).filter(function (k) { return k.slice(0, 7) === x.key; }).length; });
    var lab = ms.map(function (x) { return x.lab; });
    function delta(arr) { var v = arr.filter(function (x) { return x != null; }); if (v.length < 2) return ''; var d = v[v.length - 1] - v[0]; return '<p class="sub" style="margin:6px 0 0">Зміна від першого до останнього місяця з даними: <b style="color:' + (d >= 0 ? '#8fe3b0' : '#ff9d9d') + '">' + (d >= 0 ? '+' : '') + f2(d) + '</b></p>'; }
    h += '<div class="ms-card"><b>501DO · середній за 3 дротики</b>' + bars(lab, av, f2, 'var(--gold)') + delta(av) + '</div>';
    h += '<div class="ms-card"><b>501DO · середній за перші 9</b>' + bars(lab, f9, f2, '#4a64e8') + delta(f9) + '</div>';
    h += '<div class="ms-card"><b>Ігри (журнал) · середній за гру</b>' + bars(lab, gm, f2, '#fcc202') + delta(gm) + '</div>';
    h += '<div class="ms-card"><b>Тренувальних днів за місяць</b>' + bars(lab, vol, function (v) { return v; }, '#2ecc71') + '</div>';
    return h;
  }
  function viewFeed() {
    var ev = [], D = MS().data(), name = MS().siteName();
    try { (nakkaPlayerStats || []).forEach(function (r) { if (r.name !== name || r.isUDL) return; var p = String(r.date).split('.'); if (p.length !== 3) return; ev.push({ d: p[2] + '-' + p[1] + '-' + p[0], i: '🏛', t: r.tournament + (r.rank ? ' · ' + r.rank + ' місце' : '') + (r.avg ? ' · сер. ' + f2(r.avg) : ''), s: 'site' }); }); } catch (e) {}
    D.events.forEach(function (e) { ev.push({ d: String(e.event_date).slice(0, 10), i: '🏆', t: e.title + (e.avg_game ? ' · сер. ' + f2(e.avg_game) : ''), s: 'loc' }); });
    var byDay = {};
    legs().forEach(function (l) { var k = dayOf(l.played_at); (byDay[k] = byDay[k] || { l: 0, x: 0 }).l++; });
    drills().forEach(function (r) { var k = dayOf(r.played_at); (byDay[k] = byDay[k] || { l: 0, x: 0 }).x++; });
    Object.keys(byDay).forEach(function (k) { var o = byDay[k]; ev.push({ d: k, i: '🎯', t: 'Тренування: ' + [o.l ? o.l + ' лег.' : '', o.x ? o.x + ' вправ' : ''].filter(Boolean).join(', '), s: 'tr' }); });
    var co = {}; D.checkouts.forEach(function (c) { var k = dayOf(c.achieved_at); (co[k] = co[k] || []).push(c.value); });
    Object.keys(co).forEach(function (k) { ev.push({ d: k, i: '🎯', t: 'Закриття: ' + co[k].join(', '), s: 'loc' }); });
    D.skills.forEach(function (k) { if (k.status === 'done' && k.done_at) ev.push({ d: dayOf(k.done_at), i: '✅', t: 'Опановано: ' + k.title, s: 'loc' }); });
    G.refl.forEach(function (r) { ev.push({ d: r.date, i: '📝', t: 'Рефлексія', s: 'loc' }); });
    ev.sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    if (!ev.length) return '<div class="ms-card"><p class="sub">Тут з\'явиться єдина стрічка: турніри з сайту, ваші ігри, тренування.</p></div>';
    var col = { site: '#4a64e8', loc: '#fcc202', tr: '#2ecc71' };
    return '<div class="ms-card"><b>Єдина стрічка</b><p class="sub" style="margin:4px 0 8px"><span style="color:#4a64e8">●</span> сайт &nbsp;<span style="color:#fcc202">●</span> ваші записи &nbsp;<span style="color:#2ecc71">●</span> тренування</p>' + ev.slice(0, 50).map(function (e) {
      return '<div style="display:flex;gap:10px;border-left:3px solid ' + col[e.s] + ';padding:6px 0 6px 10px;margin-bottom:4px;font-size:13px"><span style="color:var(--muted);flex:none;width:76px">' + fmt(e.d) + '</span><span>' + e.i + ' ' + esc(e.t) + '</span></div>';
    }).join('') + '</div>';
  }
  function view() {
    var h = '';
    if (G.old) h += '<div class="ms-warn">Для цього розділу потрібне оновлення бази (schema5.sql). Поки що цілі, план і рефлексії не зберігаються, але серії, бейджі, прогрес і стрічка працюють.</div>';
    h += subTabs();
    var s = G.sub;
    return h + (s === 'badges' ? viewBadges() : s === 'plan' ? viewPlan() : s === 'refl' ? viewRefl() : s === 'cmp' ? viewCmp() : s === 'feed' ? viewFeed() : viewGoals());
  }

  // ---------- події ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gx]'); if (!b || !b.closest('#my-space')) return;
    var a = b.getAttribute('data-gx');
    if (a === 'sub') { G.sub = b.getAttribute('data-s'); MS().render(); }
    else if (a === 'go') { var k = b.getAttribute('data-k'); MS().setTab('drills2'); window.__drillsApi.start(k, Number(b.getAttribute('data-tt'))); }
    else if (a === 'mood') { G.mood = Number(b.getAttribute('data-m')); var f = document.getElementById('gx-rf'); G.draft = f ? { good: f.elements.good.value, bad: f.elements.bad.value, next: f.elements.next.value, date: f.elements.date.value } : null; MS().render(); if (G.draft) { var f2e = document.getElementById('gx-rf'); ['good', 'bad', 'next', 'date'].forEach(function (n) { f2e.elements[n].value = G.draft[n]; }); } }
    else if (a === 'pdone') {
      var P = G.plan || { days: {}, done: {} }; P.done = P.done || {}; var key = b.getAttribute('data-k'); P.done[key] = !P.done[key]; G.plan = P;
      upsert('plan', 'plan', P).then(function () { MS().render(); });
    }
    else if (a === 'rdel') { var id = Number(b.getAttribute('data-id')); if (confirm('Видалити запис?')) MS().sb().from('dev').delete().eq('id', id).then(function (r) { if (r.error) return MS().fail(r.error); G.refl = G.refl.filter(function (x) { return x.id !== id; }); MS().render(); }); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#my-space') || t.getAttribute('data-gx') !== 'pday') return;
    var P = G.plan || { days: {}, done: {} }; P.days = P.days || {}; if (t.value) P.days[t.getAttribute('data-i')] = t.value; else delete P.days[t.getAttribute('data-i')]; G.plan = P;
    upsert('plan', 'plan', P).then(function () { MS().render(); });
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'gx-gf') { e.preventDefault(); var g = { weekly: Number(f.elements.weekly.value), avg: f.elements.avg.value ? Number(f.elements.avg.value) : null }; upsert('goal', 'goal', g).then(function (ok) { if (ok) { G.goal = g; MS().toast('Цілі збережено'); MS().render(); } }); }
    else if (f.id === 'gx-rf') {
      e.preventDefault();
      if (!G.mood) return MS().toast('Оберіть настрій');
      var d = { date: f.elements.date.value || today(), mood: G.mood, good: f.elements.good.value.trim(), bad: f.elements.bad.value.trim(), next: f.elements.next.value.trim() }, cid = uuid();
      upsert(cid, 'reflect', d).then(function (ok) { if (!ok) return; G.mood = 0; MS().toast('Збережено'); load().then(function () { MS().render(); }); });
    }
  });

  window.__msExt = window.__msExt || [];
  window.__msExt.push({
    id: 'growth', label: '📈 Розвиток', view: view, load: load,
    overview: function () {
      var st = streaks(), g = G.goal || { weekly: 3 }, td = trainDays(), mon = mondayOf(new Date()), n = 0;
      for (var i = 0; i < 7; i++) { var d = new Date(mon); d.setDate(mon.getDate() + i); if (td[iso(d)]) n++; }
      return '<div class="ms-stats" style="margin-top:10px">' + stt('🔥 ' + st.cur, 'днів поспіль') + stt(n + ' / ' + (g.weekly || 3), 'тренувальних днів цього тижня') + stt('×' + badges().reduce(function (a, b) { return a + b.cnt; }, 0), 'отримано бейджів') + '</div><p style="margin:12px 0 0"><button type="button" class="ms-btn sec sm" data-t="growth">До розвитку ›</button></p>';
    },
    exportSheets: function () {
      return [{ name: 'Рефлексії', rows: [['Дата', 'Настрій (1-5)', 'Добре', 'Не вийшло', 'Далі']].concat(G.refl.map(function (r) { return [fmt(r.date), r.mood, r.good, r.bad, r.next]; })) }];
    },
    reset: function () { G.goal = null; G.plan = null; G.refl = []; G.mood = 0; }
  });
})();

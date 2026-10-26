/* Реєстрація на турніри (тестова, прихована).
 * Дані зберігає Google Apps Script (див. registration_apps_script.gs). Телефон на сайт НЕ повертається.
 * Увімкнути для себе: 5 швидких тапів по логотипу у шапці або посилання з #reg-test. Вимкнути: #reg-off.
 * Для всіх одразу: REG_PUBLIC = true. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- налаштування
  var REG_API_URL = 'https://script.google.com/macros/s/AKfycbxdYScExVIag7w8ZSHCRh-0oPpMXaUOBkHKDxPUDblcQO7UQPEFmbBIMDcK0EbiOfmQxA/exec';          // <-- сюди вставте адресу веб-застосунку Apps Script (закінчується на /exec)
  var REG_PUBLIC = false;        // true - секція видима всім; false - лише після таємного входу
  var REG_TOURNAMENTS = [
    { id: 'chu501m', title: 'ЧУ 501 Чоловіки', date: '', place: '', gender: 'men', open: true }
  ];

  var REGIONS = ['Вінницька', 'Волинська', 'Дніпропетровська', 'Донецька', 'Житомирська', 'Закарпатська', 'Запорізька',
    'Івано-Франківська', 'Київська', 'Кіровоградська', 'Луганська', 'Львівська', 'Миколаївська', 'Одеська', 'Полтавська',
    'Рівненська', 'Сумська', 'Тернопільська', 'Харківська', 'Херсонська', 'Хмельницька', 'Черкаська', 'Чернівецька',
    'Чернігівська', 'АР Крим', 'м. Київ', 'м. Севастополь'];
  // Головні міста по регіонах (решта - через "Інше")
  var CITIES = {
    'Вінницька': ['Вінниця', 'Жмеринка', 'Могилів-Подільський', 'Хмільник', 'Козятин', 'Ладижин', 'Гайсин', 'Бар', 'Тульчин', 'Немирів', 'Калинівка', 'Крижопіль', 'Ямпіль'],
    'Волинська': ['Луцьк', 'Ковель', 'Нововолинськ', 'Володимир', 'Камінь-Каширський', 'Ківерці', 'Любомль', 'Рожище', 'Маневичі', 'Горохів'],
    'Дніпропетровська': ['Дніпро', 'Кривий Ріг', 'Кам\'янське', 'Нікополь', 'Павлоград', 'Новомосковськ', 'Марганець', 'Покров', 'Синельникове', 'Жовті Води', 'Вільногірськ', 'Тернівка', 'Верхньодніпровськ', 'Апостолове'],
    'Донецька': ['Донецьк', 'Маріуполь', 'Краматорськ', 'Слов\'янськ', 'Бахмут', 'Костянтинівка', 'Покровськ', 'Дружківка', 'Горлівка', 'Макіївка', 'Єнакієве', 'Мирноград', 'Лиман', 'Святогірськ', 'Волноваха', 'Селидове', 'Добропілля', 'Мелекіне'],
    'Житомирська': ['Житомир', 'Бердичів', 'Коростень', 'Новоград-Волинський', 'Малин', 'Овруч', 'Коростишів', 'Радомишль', 'Баранівка', 'Романів'],
    'Закарпатська': ['Ужгород', 'Мукачево', 'Хуст', 'Берегове', 'Виноградів', 'Тячів', 'Рахів', 'Чоп', 'Іршава', 'Перечин', 'Свалява'],
    'Запорізька': ['Запоріжжя', 'Мелітополь', 'Бердянськ', 'Енергодар', 'Токмак', 'Кам\'янка-Дніпровська', 'Оріхів', 'Пологи', 'Вільнянськ', 'Гуляйполе'],
    'Івано-Франківська': ['Івано-Франківськ', 'Калуш', 'Коломия', 'Надвірна', 'Долина', 'Болехів', 'Яремче', 'Косів', 'Тлумач', 'Снятин', 'Бурштин', 'Городенка'],
    'Київська': ['Біла Церква', 'Бровари', 'Бориспіль', 'Ірпінь', 'Буча', 'Вишневе', 'Фастів', 'Вишгород', 'Обухів', 'Васильків', 'Бородянка', 'Українка', 'Переяслав', 'Березань', 'Яготин', 'Славутич', 'Сквира', 'Тетіїв', 'Богуслав', 'Боярка'],
    'Кіровоградська': ['Кропивницький', 'Олександрія', 'Знам\'янка', 'Світловодськ', 'Гайворон', 'Мала Виска', 'Новоукраїнка', 'Долинська', 'Бобринець'],
    'Луганська': ['Луганськ', 'Сєвєродонецьк', 'Лисичанськ', 'Алчевськ', 'Кадіївка', 'Стаханов', 'Рубіжне', 'Первомайськ', 'Свердловськ', 'Старобільськ', 'Краснодон', 'Ровеньки'],
    'Львівська': ['Львів', 'Дрогобич', 'Стрий', 'Червоноград', 'Борислав', 'Самбір', 'Новий Розділ', 'Трускавець', 'Жовква', 'Золочів', 'Броди', 'Сокаль', 'Мостиська', 'Городок', 'Яворів'],
    'Миколаївська': ['Миколаїв', 'Первомайськ', 'Вознесенськ', 'Южноукраїнськ', 'Нова Одеса', 'Баштанка', 'Очаків', 'Снігурівка', 'Новий Буг'],
    'Одеська': ['Одеса', 'Ізмаїл', 'Чорноморськ', 'Білгород-Дністровський', 'Подільськ', 'Южне', 'Роздільна', 'Болград', 'Рені', 'Кілія', 'Балта', 'Овідіополь', 'Татарбунари', 'Ананьїв', 'Біляївка'],
    'Полтавська': ['Полтава', 'Кременчук', 'Горішні Плавні', 'Лубни', 'Миргород', 'Гадяч', 'Хорол', 'Пирятин', 'Зіньків', 'Карлівка', 'Лохвиця', 'Гребінка', 'Решетилівка'],
    'Рівненська': ['Рівне', 'Дубно', 'Костопіль', 'Сарни', 'Острог', 'Здолбунів', 'Березне', 'Вараш', 'Радивилів'],
    'Сумська': ['Суми', 'Конотоп', 'Шостка', 'Охтирка', 'Ромни', 'Глухів', 'Лебедин', 'Тростянець', 'Кролевець', 'Путивль', 'Буринь'],
    'Тернопільська': ['Тернопіль', 'Чортків', 'Кременець', 'Бережани', 'Борщів', 'Заліщики', 'Збараж', 'Теребовля', 'Бучач', 'Підгайці', 'Шумськ', 'Зборів'],
    'Харківська': ['Харків', 'Лозова', 'Ізюм', 'Куп\'янськ', 'Чугуїв', 'Первомайський', 'Мерефа', 'Дергачі', 'Балаклія', 'Люботин', 'Богодухів', 'Зміїв', 'Красноград', 'Валки'],
    'Херсонська': ['Херсон', 'Нова Каховка', 'Каховка', 'Скадовськ', 'Гола Пристань', 'Генічеськ', 'Олешки', 'Берислав'],
    'Хмельницька': ['Хмельницький', 'Кам\'янець-Подільський', 'Шепетівка', 'Старокостянтинів', 'Нетішин', 'Славута', 'Волочиськ', 'Дунаївці', 'Красилів', 'Ізяслав'],
    'Черкаська': ['Черкаси', 'Умань', 'Сміла', 'Золотоноша', 'Канів', 'Ватутіне', 'Корсунь-Шевченківський', 'Звенигородка', 'Монастирище', 'Жашків', 'Тальне'],
    'Чернівецька': ['Чернівці', 'Вижниця', 'Новоселиця', 'Сторожинець', 'Хотин', 'Заставна', 'Кіцмань', 'Глибока'],
    'Чернігівська': ['Чернігів', 'Ніжин', 'Прилуки', 'Бахмач', 'Новгород-Сіверський', 'Мена', 'Корюківка', 'Бобровиця', 'Носівка', 'Козелець', 'Городня'],
    'АР Крим': ['Сімферополь', 'Керч', 'Євпаторія', 'Ялта', 'Феодосія', 'Джанкой', 'Алушта', 'Бахчисарай', 'Красноперекопськ', 'Саки', 'Армянськ', 'Судак'],
    'м. Київ': ['Київ'],
    'м. Севастополь': ['Севастополь']
  };
  var CARDS = [
    { v: 'Маю', label: 'Маю тур-карту 2026' },
    { v: 'Не маю', label: 'Не маю тур-карти' },
    { v: 'Не маю, але хочу оформити', label: 'Не маю, але хочу оформити' }
  ];
  var OTHER_CITY = 'Інше (вписати)';

  // ---------------------------------------------------------------- допоміжні
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function norm(s) { return String(s || '').toLowerCase().replace(/[’ʼ`]/g, "'").replace(/\s+/g, ' ').trim(); }

  // ---------------------------------------------------------------- список гравців
  var NAME_RE = /^[А-ЯІЇЄҐ][А-Яа-яІіЇїЄєҐґ'’ʼ-]+ [А-ЯІЇЄҐ][А-Яа-яІіЇїЄєҐґ'’ʼ.-]+$/;
  function playerList(gender) {
    var all = [];
    try { all = (typeof curatedPlayerNames !== 'undefined' && curatedPlayerNames) ? curatedPlayerNames : []; } catch (e) { all = []; }
    var women = {};
    try {
      (typeof leaderboardWomen !== 'undefined' ? leaderboardWomen : []).forEach(function (p) { women[p.name] = 1; });
      (typeof nakkaPlayerStats !== 'undefined' ? nakkaPlayerStats : []).forEach(function (p) { if (p.gender === 'women') women[p.name] = 1; });
      Object.keys(typeof ratingsData !== 'undefined' ? ratingsData : {}).forEach(function (k) {
        if (k.indexOf('women_') === 0) (ratingsData[k].rows || []).forEach(function (r) { women[r.name] = 1; });
      });
      (typeof tournaments !== 'undefined' ? tournaments : []).forEach(function (t) {
        var m = t.nakkaMedalsWomen || t.medalsWomen;
        if (m) [m.gold, m.silver].concat(m.bronze || []).forEach(function (n) { if (n) women[n] = 1; });
      });
    } catch (e) { /* дані ще не завантажились */ }
    var men = {};
    try {
      (typeof leaderboard !== 'undefined' ? leaderboard : []).forEach(function (p) { men[p.name] = 1; });
      (typeof nakkaPlayerStats !== 'undefined' ? nakkaPlayerStats : []).forEach(function (p) { if (p.gender === 'men') men[p.name] = 1; });
    } catch (e) { }
    return all.filter(function (n) { return NAME_RE.test(n); }).filter(function (n) {
      if (gender === 'men') return !women[n] || men[n];
      if (gender === 'women') return !!women[n];
      return true;
    }).sort(function (a, b) { return a.localeCompare(b, 'uk'); });
  }

  // ---------------------------------------------------------------- API
  function apiGet(tid) {
    if (!REG_API_URL) return Promise.reject(new Error('no-api'));
    return fetch(REG_API_URL + (REG_API_URL.indexOf('?') < 0 ? '?' : '&') + 'action=list&t=' + encodeURIComponent(tid) + '&_=' + Date.now())
      .then(function (r) { return r.json(); });
  }
  function apiPost(payload) {
    if (!REG_API_URL) return Promise.reject(new Error('no-api'));
    // text/plain - щоб браузер не робив preflight (Apps Script його не обробляє)
    return fetch(REG_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); });
  }

  // ---------------------------------------------------------------- стилі
  var CSS = '' +
    '#registration{display:none}#registration.reg-on{display:block}' +
    '.reg-card{border:1px solid var(--line);border-radius:14px;background:linear-gradient(135deg,var(--royal-dark),#10173f);padding:20px 22px;margin-bottom:18px;display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;justify-content:space-between}' +
    '.reg-card h3{margin:0 0 4px;font-size:20px}.reg-meta{color:var(--muted);font-size:14px}' +
    '.reg-btn{background:linear-gradient(90deg,var(--gold-2),var(--gold));color:#141c56;border:0;border-radius:10px;padding:12px 22px;font:600 15px Inter,sans-serif;cursor:pointer}' +
    '.reg-btn[disabled]{opacity:.55;cursor:default}.reg-btn.ghost{background:transparent;color:var(--cream);border:1px solid var(--line)}' +
    '.reg-badge{display:inline-block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;border:1px dashed var(--gold);color:var(--gold);border-radius:6px;padding:2px 8px;margin-left:8px;vertical-align:middle}' +
    '.reg-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}' +
    '.reg-table{width:100%;border-collapse:collapse;font-size:14px}.reg-table th,.reg-table td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}' +
    '.reg-table th{color:var(--muted);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.06em;background:rgba(255,255,255,.03)}' +
    '.reg-table tr:last-child td{border-bottom:0}.reg-table td.n{color:var(--muted);font-family:"JetBrains Mono",monospace;width:44px}' +
    '.reg-table tr.reg-marked td{background:rgba(252,194,2,.16)}.reg-table tr.reg-marked td.nm{color:var(--gold);font-weight:600}' +
    '.reg-pill{display:inline-block;border-radius:20px;padding:2px 10px;font-size:12px;border:1px solid var(--line)}' +
    '.reg-pill.y{border-color:#3fbf7f;color:#7be0ae}.reg-pill.w{border-color:var(--gold);color:var(--gold)}.reg-pill.n{color:var(--muted)}' +
    '.reg-note{color:var(--muted);font-size:13px;margin:10px 2px}' +
    '.reg-empty{padding:26px;text-align:center;color:var(--muted)}' +
    '.reg-overlay{position:fixed;inset:0;background:rgba(5,8,25,.78);z-index:1000;display:none;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 14px}' +
    '.reg-overlay.open{display:flex}' +
    '.reg-modal{width:100%;max-width:520px;background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:22px 22px 24px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.reg-modal h3{margin:0 28px 4px 0;font-size:20px}.reg-x{position:absolute;right:12px;top:10px;background:none;border:0;color:var(--muted);font-size:26px;cursor:pointer;line-height:1}' +
    '.reg-f{margin-top:16px;position:relative}.reg-f>label{display:block;font-size:13px;color:var(--muted);margin-bottom:6px}' +
    '.reg-f input[type=text],.reg-f input[type=tel],.reg-f select{width:100%;box-sizing:border-box;background:#0a0f2a;border:1px solid var(--line);color:var(--cream);border-radius:10px;padding:12px 13px;font:15px Inter,sans-serif}' +
    '.reg-f input:focus,.reg-f select:focus{outline:2px solid var(--gold);border-color:transparent}' +
    '.reg-f.bad input,.reg-f.bad select,.reg-f.bad .reg-cards{border-color:#ff6b6b}.reg-err{display:none;color:#ff8c8c;font-size:12.5px;margin-top:5px}.reg-f.bad .reg-err{display:block}' +
    '.reg-list{position:absolute;left:0;right:0;top:100%;z-index:5;background:#0a0f2a;border:1px solid var(--line);border-radius:10px;margin:4px 0 0;padding:4px;list-style:none;max-height:240px;overflow-y:auto;display:none}' +
    '.reg-list.open{display:block}.reg-list li{padding:10px 11px;border-radius:7px;cursor:pointer;font-size:14.5px}.reg-list li:hover,.reg-list li.hl{background:var(--royal)}' +
    '.reg-list li.add{color:var(--gold);border-top:1px solid var(--line);margin-top:3px}.reg-list li.none{color:var(--muted);cursor:default}' +
    '.reg-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.reg-cards{display:grid;gap:8px;border:1px solid transparent;border-radius:10px}' +
    '.reg-cards label{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:11px 13px;cursor:pointer;font-size:14.5px;color:var(--cream);margin:0}' +
    '.reg-cards input{accent-color:#fcc202}.reg-cards label.sel{border-color:var(--gold);background:rgba(252,194,2,.08)}' +
    '.reg-consent{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--muted);margin-top:16px}.reg-consent input{margin-top:3px;accent-color:#fcc202}' +
    '.reg-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.reg-status{margin-top:14px;font-size:14px}.reg-status.err{color:#ff8c8c}.reg-status.ok{color:#7be0ae}' +
    '.reg-chosen{display:inline-flex;gap:8px;align-items:center;margin-top:6px;font-size:13px;color:var(--gold)}.reg-link{background:none;border:0;color:var(--gold);cursor:pointer;padding:0;font:13px Inter,sans-serif;text-decoration:underline}' +
    '.reg-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--royal);border:1px solid var(--gold);color:var(--cream);padding:11px 18px;border-radius:10px;z-index:1100;font-size:14px}';

  // ---------------------------------------------------------------- секція
  var cur = REG_TOURNAMENTS[0];
  var state = { rows: [], loaded: false, timer: null };

  function buildSection() {
    if ($('#registration')) return;
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    var sec = el('section', { id: 'registration', 'data-i18n-skip': '' });
    sec.innerHTML =
      '<h2><span class="idx">★</span> Реєстрація на турнір <span class="reg-badge" id="reg-badge">тест</span></h2>' +
      '<p class="section-sub">Оберіть себе зі списку, вкажіть регіон, населений пункт і телефон. Телефон бачить лише організатор.</p>' +
      '<div class="reg-card"><div><h3 id="reg-title"></h3><div class="reg-meta" id="reg-meta"></div></div>' +
      '<button type="button" class="reg-btn" id="reg-open">Зареєструватись</button></div>' +
      '<div class="reg-table-wrap"><table class="reg-table"><thead><tr><th>№</th><th>Гравець</th><th>Регіон</th><th>Населений пункт</th><th>Тур-карта</th></tr></thead><tbody id="reg-body"></tbody></table></div>' +
      '<div class="reg-note" id="reg-note"></div>';
    var anchor = $('#history');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor); else document.body.appendChild(sec);
    $('#reg-title').textContent = cur.title;
    $('#reg-meta').textContent = [cur.date ? '📅 ' + cur.date : '📅 Дата уточнюється', cur.place ? '📍 ' + cur.place : '📍 Місце уточнюється'].join('   ·   ');
    $('#reg-open').addEventListener('click', openForm);
    $('#reg-badge').style.display = REG_PUBLIC ? 'none' : '';
    // посилання в меню
    var nav = $('nav');
    if (nav && !$('#reg-nav')) { var a = el('a', { href: '#registration', id: 'reg-nav', 'data-i18n-skip': '' }, 'Реєстрація'); nav.insertBefore(a, nav.firstChild); }
  }

  function renderTable() {
    var body = $('#reg-body'); if (!body) return;
    var note = $('#reg-note');
    if (!REG_API_URL) { body.innerHTML = '<tr><td colspan="5" class="reg-empty">Реєстрацію ще не підключено (немає адреси Apps Script).</td></tr>'; note.textContent = ''; return; }
    if (!state.loaded) { body.innerHTML = '<tr><td colspan="5" class="reg-empty">Завантаження…</td></tr>'; return; }
    if (!state.rows.length) { body.innerHTML = '<tr><td colspan="5" class="reg-empty">Поки ніхто не зареєструвався.</td></tr>'; note.textContent = ''; return; }
    body.innerHTML = state.rows.map(function (r, i) {
      var cls = r.card === 'Маю' ? 'y' : (r.card === 'Не маю' ? 'n' : 'w');
      var txt = r.card === 'Маю' ? 'Є' : (r.card === 'Не маю' ? 'Немає' : 'Оформлює');
      return '<tr class="' + (r.marked ? 'reg-marked' : '') + '"><td class="n">' + (i + 1) + '</td><td class="nm">' + (r.marked ? '★ ' : '') + esc(r.name) +
        '</td><td>' + esc(r.region) + '</td><td>' + esc(r.city) + '</td><td><span class="reg-pill ' + cls + '">' + txt + '</span></td></tr>';
    }).join('');
    var marked = state.rows.filter(function (r) { return r.marked; }).length;
    note.textContent = 'Зареєстровано: ' + state.rows.length + (marked ? ' · виділені жовтим — відмічені організатором: ' + marked : '');
  }

  function loadTable() {
    if (!REG_API_URL) { renderTable(); return; }
    apiGet(cur.id).then(function (d) {
      if (d && d.ok) { state.rows = d.rows || []; state.loaded = true; renderTable(); }
    }).catch(function () { if (!state.loaded) { $('#reg-body').innerHTML = '<tr><td colspan="5" class="reg-empty">Не вдалося завантажити список. Спробуйте пізніше.</td></tr>'; } });
  }

  function toast(msg) {
    var t = el('div', { class: 'reg-toast', 'data-i18n-skip': '' }, esc(msg)); document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  // ---------------------------------------------------------------- форма
  var overlay = null;
  function openForm() {
    if (!overlay) buildForm();
    resetForm();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    openedAt = Date.now();
  }
  function closeForm() { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  var openedAt = 0, form = {};

  function buildForm() {
    overlay = el('div', { class: 'reg-overlay', role: 'dialog', 'aria-modal': 'true', 'data-i18n-skip': '' });
    overlay.innerHTML =
      '<div class="reg-modal"><button type="button" class="reg-x" aria-label="Закрити">×</button>' +
      '<h3>Реєстрація: ' + esc(cur.title) + '</h3><div class="reg-meta">Усі поля обов\'язкові</div>' +
      '<form id="reg-form" novalidate autocomplete="off">' +
      // гравець
      '<div class="reg-f" id="f-name"><label>Гравець</label>' +
      '<div id="name-pick"><input type="text" id="name-input" placeholder="Почніть вводити прізвище…" autocomplete="off"><ul class="reg-list" id="name-list"></ul></div>' +
      '<div id="name-manual" style="display:none"><div class="reg-row2"><input type="text" id="nm-last" placeholder="Прізвище"><input type="text" id="nm-first" placeholder="Ім\'я"></div>' +
      '<button type="button" class="reg-link" id="name-back" style="margin-top:6px">← вибрати зі списку</button></div>' +
      '<div class="reg-err" id="e-name">Оберіть себе зі списку або впишіть прізвище й ім\'я</div></div>' +
      // регіон + місто
      '<div class="reg-row2"><div class="reg-f" id="f-region"><label>Регіон</label><select id="region"><option value="">Оберіть…</option>' +
      REGIONS.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select><div class="reg-err">Оберіть регіон</div></div>' +
      '<div class="reg-f" id="f-city"><label>Населений пункт</label><select id="city" disabled><option value="">Спочатку регіон</option></select><div class="reg-err">Оберіть населений пункт</div></div></div>' +
      '<div class="reg-f" id="f-city2" style="display:none"><label>Назва населеного пункту</label><input type="text" id="city2" placeholder="Напр.: Вараш"><div class="reg-err">Впишіть населений пункт</div></div>' +
      // телефон
      '<div class="reg-f" id="f-phone"><label>Телефон</label><input type="tel" id="phone" inputmode="numeric" placeholder="+380XXXXXXXXX"><div class="reg-err">Формат: +380 і ще 9 цифр</div></div>' +
      // тур-карта
      '<div class="reg-f" id="f-card"><label>Тур-карта на 2026 рік</label><div class="reg-cards">' +
      CARDS.map(function (c, i) { return '<label><input type="radio" name="card" value="' + esc(c.v) + '"> ' + esc(c.label) + '</label>'; }).join('') +
      '</div><div class="reg-err">Оберіть варіант</div></div>' +
      '<div class="reg-f" id="f-consent"><label class="reg-consent"><input type="checkbox" id="consent"> <span>Погоджуюсь на обробку моїх даних для організації турніру. Телефон бачить лише організатор і не публікується на сайті.</span></label><div class="reg-err">Потрібна згода</div></div>' +
      '<div class="reg-hp"><label>Не заповнювати <input type="text" id="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="reg-status" id="reg-status"></div>' +
      '<div style="display:flex;gap:10px;margin-top:18px"><button type="submit" class="reg-btn" id="reg-submit">Надіслати</button><button type="button" class="reg-btn ghost" id="reg-cancel">Скасувати</button></div>' +
      '</form></div>';
    document.body.appendChild(overlay);

    $('.reg-x', overlay).addEventListener('click', closeForm);
    $('#reg-cancel', overlay).addEventListener('click', closeForm);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeForm(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) closeForm(); });

    // --- автопідказка гравців
    var inp = $('#name-input', overlay), list = $('#name-list', overlay), hl = -1, shown = [];
    function showList() {
      var q = norm(inp.value), items;
      var names = form.names || (form.names = playerList(cur.gender));
      items = q ? names.filter(function (n) { return norm(n).indexOf(q) >= 0; }) : names;
      items.sort(function (a, b) { return (norm(a).indexOf(q) === 0 ? 0 : 1) - (norm(b).indexOf(q) === 0 ? 0 : 1); });
      shown = items.slice(0, 40); hl = -1;
      var html = shown.map(function (n, i) { return '<li data-i="' + i + '">' + esc(n) + '</li>'; }).join('');
      if (!shown.length) html = '<li class="none">Нікого не знайдено</li>';
      html += '<li class="add" data-add="1">➕ Мене немає в списку</li>';
      list.innerHTML = html; list.classList.add('open');
    }
    function pick(n) { form.name = n; form.isNew = false; inp.value = n; list.classList.remove('open'); clearBad('f-name'); }
    inp.addEventListener('input', function () { form.name = ''; showList(); });
    inp.addEventListener('focus', showList);
    inp.addEventListener('keydown', function (e) {
      var lis = list.querySelectorAll('li[data-i]');
      if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(lis.length - 1, hl + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, hl - 1); }
      else if (e.key === 'Enter' && hl >= 0) { e.preventDefault(); pick(shown[hl]); return; }
      else return;
      lis.forEach(function (l, i) { l.classList.toggle('hl', i === hl); if (i === hl) l.scrollIntoView({ block: 'nearest' }); });
    });
    list.addEventListener('mousedown', function (e) {
      var li = e.target.closest('li'); if (!li) return; e.preventDefault();
      if (li.getAttribute('data-add')) { switchManual(true); }
      else if (li.getAttribute('data-i') != null) pick(shown[+li.getAttribute('data-i')]);
    });
    document.addEventListener('mousedown', function (e) { if (!e.target.closest('#name-pick')) list.classList.remove('open'); });
    function switchManual(on) {
      $('#name-pick', overlay).style.display = on ? 'none' : ''; $('#name-manual', overlay).style.display = on ? '' : 'none';
      form.isNew = on; form.name = ''; list.classList.remove('open');
      if (on) $('#nm-last', overlay).focus(); else { inp.value = ''; inp.focus(); }
    }
    $('#name-back', overlay).addEventListener('click', function () { switchManual(false); });

    // --- регіон / місто
    $('#region', overlay).addEventListener('change', function () {
      var r = this.value, cs = $('#city', overlay);
      clearBad('f-region');
      if (!r) { cs.disabled = true; cs.innerHTML = '<option value="">Спочатку регіон</option>'; return; }
      cs.disabled = false;
      cs.innerHTML = '<option value="">Оберіть…</option>' + (CITIES[r] || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '<option>' + OTHER_CITY + '</option>';
      $('#f-city2', overlay).style.display = 'none';
    });
    $('#city', overlay).addEventListener('change', function () {
      clearBad('f-city');
      var other = this.value === OTHER_CITY;
      $('#f-city2', overlay).style.display = other ? '' : 'none';
      if (other) $('#city2', overlay).focus();
    });

    // --- телефон: маска +380 і 9 цифр
    var ph = $('#phone', overlay);
    function fmtPhone() {
      var d = ph.value.replace(/\D/g, '');
      if (d.indexOf('380') === 0) d = d.slice(3); else if (d.indexOf('80') === 0) d = d.slice(2); else if (d.indexOf('0') === 0 && d.length > 9) d = d.slice(1);
      if (d.length > 9 && d.charAt(0) === '0') d = d.slice(1);      // людина дописала "0501234567" після "+380"
      d = d.slice(0, 9); ph.value = d ? '+380' + d : '';
      clearBad('f-phone');
    }
    ph.addEventListener('input', fmtPhone);
    ph.addEventListener('focus', function () { if (!ph.value) ph.value = '+380'; });
    ph.addEventListener('blur', function () { if (ph.value === '+380') ph.value = ''; });

    overlay.addEventListener('change', function (e) {
      if (e.target.name === 'card') {
        overlay.querySelectorAll('.reg-cards label').forEach(function (l) { l.classList.toggle('sel', l.querySelector('input').checked); });
        clearBad('f-card');
      }
      if (e.target.id === 'consent') clearBad('f-consent');
    });
    ['nm-last', 'nm-first', 'city2'].forEach(function (id) { $('#' + id, overlay).addEventListener('input', function () { clearBad(id === 'city2' ? 'f-city2' : 'f-name'); }); });
    $('#reg-form', overlay).addEventListener('submit', submit);
  }

  function clearBad(id) { var f = document.getElementById(id); if (f) f.classList.remove('bad'); }
  function bad(id) { var f = document.getElementById(id); if (f) f.classList.add('bad'); }

  function resetForm() {
    form = { names: null, name: '', isNew: false };
    var f = $('#reg-form', overlay); f.reset();
    $('#name-pick', overlay).style.display = ''; $('#name-manual', overlay).style.display = 'none';
    $('#city', overlay).disabled = true; $('#city', overlay).innerHTML = '<option value="">Спочатку регіон</option>';
    $('#f-city2', overlay).style.display = 'none';
    overlay.querySelectorAll('.reg-f.bad').forEach(function (x) { x.classList.remove('bad'); });
    overlay.querySelectorAll('.reg-cards label').forEach(function (l) { l.classList.remove('sel'); });
    var s = $('#reg-status', overlay); s.textContent = ''; s.className = 'reg-status';
    $('#reg-submit', overlay).disabled = false;
  }

  function cleanWord(s) {
    s = String(s || '').trim().replace(/\s+/g, ' ');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function submit(e) {
    e.preventDefault();
    var status = $('#reg-status', overlay), ok = true;
    var name = form.name;
    if (form.isNew) {
      var ln = cleanWord($('#nm-last', overlay).value), fn = cleanWord($('#nm-first', overlay).value);
      name = (ln && fn && /^[A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ.-]+$/.test(ln.replace(/ /g, '')) && /^[A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ.-]+$/.test(fn.replace(/ /g, ''))) ? ln + ' ' + fn : '';
    }
    if (!name) { bad('f-name'); ok = false; }
    var region = $('#region', overlay).value; if (!region) { bad('f-region'); ok = false; }
    var city = $('#city', overlay).value;
    if (city === OTHER_CITY) city = cleanWord($('#city2', overlay).value);
    if (!city) { bad(document.getElementById('city').value === OTHER_CITY ? 'f-city2' : 'f-city'); ok = false; }
    var phone = $('#phone', overlay).value; if (!/^\+380\d{9}$/.test(phone)) { bad('f-phone'); ok = false; }
    var cardEl = overlay.querySelector('input[name=card]:checked'); if (!cardEl) { bad('f-card'); ok = false; }
    if (!$('#consent', overlay).checked) { bad('f-consent'); ok = false; }
    if (!ok) { status.className = 'reg-status err'; status.textContent = 'Заповніть усі поля, позначені червоним.'; var b = overlay.querySelector('.reg-f.bad'); if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    var dup = state.rows.some(function (r) { return norm(r.name) === norm(name); });
    if (dup) { status.className = 'reg-status err'; status.textContent = 'Цей гравець уже є у списку реєстрації.'; return; }
    if (!REG_API_URL) { status.className = 'reg-status err'; status.textContent = 'Реєстрацію ще не підключено: не вказано адресу Apps Script.'; return; }
    var btn = $('#reg-submit', overlay); btn.disabled = true; status.className = 'reg-status'; status.textContent = 'Надсилаю…';
    apiPost({ t: cur.id, name: name, isNew: !!form.isNew, region: region, city: city, phone: phone, card: cardEl.value,
      consent: true, hp: $('#website', overlay).value, ms: Date.now() - openedAt })
      .then(function (d) {
        if (d && d.ok) {
          status.className = 'reg-status ok'; status.textContent = '✔ Готово! Ви зареєстровані.';
          loadTable();
          setTimeout(function () { closeForm(); toast('Реєстрацію збережено'); }, 1100);
        } else {
          btn.disabled = false; status.className = 'reg-status err'; status.textContent = (d && d.error) || 'Не вдалося зберегти. Спробуйте ще раз.';
        }
      }).catch(function () { btn.disabled = false; status.className = 'reg-status err'; status.textContent = 'Немає зв\'язку із сервером. Спробуйте ще раз.'; });
  }

  // ---------------------------------------------------------------- запуск / таємний вхід
  function show(on) {
    buildSection();
    var s = $('#registration'); if (s) s.classList.toggle('reg-on', !!on);
    var n = $('#reg-nav'); if (n) n.style.display = on ? '' : 'none';
    if (on) { loadTable(); if (!state.timer) state.timer = setInterval(function () { if (!document.hidden) loadTable(); }, 60000); }
    else if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }
  function unlocked() { return REG_PUBLIC || store('udfRegUnlock') === '1'; }

  function init() {
    if (location.hash === '#reg-test') { store('udfRegUnlock', '1'); }
    if (location.hash === '#reg-off') { store('udfRegUnlock', null); }
    if (unlocked()) show(true);
    // 5 тапів по логотипу за 4 секунди
    var logo = document.querySelector('.hero-logo'), taps = [];
    if (logo) logo.addEventListener('click', function () {
      var now = Date.now(); taps = taps.filter(function (t) { return now - t < 4000; }); taps.push(now);
      if (taps.length >= 5) {
        taps = [];
        var on = store('udfRegUnlock') !== '1';
        store('udfRegUnlock', on ? '1' : null);
        show(on || REG_PUBLIC);
        toast(on ? 'Реєстрація (тест) увімкнена' : 'Реєстрація (тест) вимкнена');
        if (on) { var s = $('#registration'); if (s) s.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
  }
  window.udfRegistration = { show: show };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

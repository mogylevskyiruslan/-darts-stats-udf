/* Реєстрація на турніри (тестова, прихована).
 * Дані зберігає Google Apps Script (див. registration_apps_script.gs). Телефон на сайт НЕ повертається.
 * Увімкнути для себе: 5 швидких тапів по логотипу у шапці або посилання з #reg-test. Вимкнути: #reg-off.
 * Для всіх одразу: REG_PUBLIC = true. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- налаштування
  var REG_API_URL = 'https://script.google.com/macros/s/AKfycbxdYScExVIag7w8ZSHCRh-0oPpMXaUOBkHKDxPUDblcQO7UQPEFmbBIMDcK0EbiOfmQxA/exec';          // <-- сюди вставте адресу веб-застосунку Apps Script (закінчується на /exec)
  var REG_PUBLIC = false;        // true - секція видима всім; false - лише після таємного входу
  // Подія: 12-13 грудня 2026, Вижниця. Посилання на документи вставте пізніше ('' = "незабаром")
  var REG_EVENT = {
    place: 'Вижниця', region: 'Чернівецька область', dates: '12–13 грудня 2026',
    docs: { regulations: '', judges: '' }
  };
  var REG_TOURNAMENTS = [
    { id: 'chu501m', short: 'ЧУ · чоловіки', title: 'Чемпіонат України серед чоловіків', day: '12 грудня 2026', gender: 'men', open: true },
    { id: 'chu501w', short: 'ЧУ · жінки', title: 'Чемпіонат України серед жінок', day: '12 грудня 2026', gender: 'women', open: true },
    { id: 'chu501j', short: 'ЧУ · юнаки', title: 'Чемпіонат України серед юнаків', day: '13 грудня 2026', gender: 'all', open: true },
    { id: 'kufm', short: 'Фінал КУ · чоловіки', title: 'Фінал Кубку України серед чоловіків', day: '13 грудня 2026', gender: 'men', open: true },
    { id: 'kufw', short: 'Фінал КУ · жінки', title: 'Фінал Кубку України серед жінок', day: '13 грудня 2026', gender: 'women', open: true }
  ];
  var DISCIPLINE = 'особистий розряд, 501 DO';

  var REGIONS = ['Вінницька', 'Волинська', 'Дніпропетровська', 'Донецька', 'Житомирська', 'Закарпатська', 'Запорізька',
    'Івано-Франківська', 'Київська', 'Кіровоградська', 'Луганська', 'Львівська', 'Миколаївська', 'Одеська', 'Полтавська',
    'Рівненська', 'Сумська', 'Тернопільська', 'Харківська', 'Херсонська', 'Хмельницька', 'Черкаська', 'Чернівецька',
    'Чернігівська', 'АР Крим', 'м. Київ', 'м. Севастополь'];
  // Головні міста по регіонах (решта - через "Інше")
  var CITIES = {
    'Вінницька': ['Вінниця', 'Жмеринка', 'Могилів-Подільський', 'Хмільник', 'Козятин', 'Ладижин', 'Гайсин', 'Бар', 'Тульчин', 'Немирів', 'Калинівка', 'Крижопіль', 'Ямпіль'],
    'Волинська': ['Луцьк', 'Ковель', 'Нововолинськ', 'Володимир', 'Камінь-Каширський', 'Ківерці', 'Любомль', 'Рожище', 'Маневичі', 'Горохів'],
    'Дніпропетровська': ['Дніпро', 'Кривий Ріг', 'Кам\'янське', 'Нікополь', 'Павлоград', 'Новомосковськ', 'Марганець', 'Покров', 'Синельникове', 'Жовті Води', 'Вільногірськ', 'Тернівка', 'Верхньодніпровськ', 'Апостолове', 'Царичанка'],
    'Донецька': ['Донецьк', 'Маріуполь', 'Краматорськ', 'Слов\'янськ', 'Бахмут', 'Костянтинівка', 'Покровськ', 'Дружківка', 'Горлівка', 'Макіївка', 'Єнакієве', 'Мирноград', 'Лиман', 'Святогірськ', 'Волноваха', 'Селидове', 'Добропілля', 'Мелекіне', 'Авдіївка', 'Кальчицька ТГ', 'Мангушська ТГ'],
    'Житомирська': ['Житомир', 'Бердичів', 'Коростень', 'Новоград-Волинський', 'Малин', 'Овруч', 'Коростишів', 'Радомишль', 'Баранівка', 'Романів'],
    'Закарпатська': ['Ужгород', 'Мукачево', 'Хуст', 'Берегове', 'Виноградів', 'Тячів', 'Рахів', 'Чоп', 'Іршава', 'Перечин', 'Свалява'],
    'Запорізька': ['Запоріжжя', 'Мелітополь', 'Бердянськ', 'Енергодар', 'Токмак', 'Кам\'янка-Дніпровська', 'Оріхів', 'Пологи', 'Вільнянськ', 'Гуляйполе'],
    'Івано-Франківська': ['Івано-Франківськ', 'Калуш', 'Коломия', 'Надвірна', 'Долина', 'Болехів', 'Яремче', 'Косів', 'Тлумач', 'Снятин', 'Бурштин', 'Городенка', 'Татарів'],
    'Київська': ['Біла Церква', 'Бровари', 'Бориспіль', 'Ірпінь', 'Буча', 'Вишневе', 'Фастів', 'Вишгород', 'Обухів', 'Васильків', 'Бородянка', 'Українка', 'Переяслав', 'Березань', 'Яготин', 'Славутич', 'Сквира', 'Тетіїв', 'Богуслав', 'Боярка', 'Петропавлівська Борщагівка'],
    'Кіровоградська': ['Кропивницький', 'Олександрія', 'Знам\'янка', 'Світловодськ', 'Гайворон', 'Мала Виска', 'Новоукраїнка', 'Долинська', 'Бобринець'],
    'Луганська': ['Луганськ', 'Сєвєродонецьк', 'Лисичанськ', 'Алчевськ', 'Кадіївка', 'Стаханов', 'Рубіжне', 'Первомайськ', 'Свердловськ', 'Старобільськ', 'Краснодон', 'Ровеньки'],
    'Львівська': ['Львів', 'Дрогобич', 'Стрий', 'Червоноград', 'Борислав', 'Самбір', 'Новий Розділ', 'Трускавець', 'Жовква', 'Золочів', 'Броди', 'Сокаль', 'Мостиська', 'Городок', 'Яворів'],
    'Миколаївська': ['Миколаїв', 'Первомайськ', 'Вознесенськ', 'Південноукраїнськ', 'Нова Одеса', 'Баштанка', 'Очаків', 'Снігурівка', 'Новий Буг'],
    'Одеська': ['Одеса', 'Ізмаїл', 'Чорноморськ', 'Білгород-Дністровський', 'Подільськ', 'Південне', 'Роздільна', 'Болград', 'Рені', 'Кілія', 'Балта', 'Овідіополь', 'Татарбунари', 'Ананьїв', 'Біляївка'],
    'Полтавська': ['Полтава', 'Кременчук', 'Горішні Плавні', 'Лубни', 'Миргород', 'Гадяч', 'Хорол', 'Пирятин', 'Зіньків', 'Карлівка', 'Лохвиця', 'Гребінка', 'Решетилівка', 'Диканька', 'Котельва', 'Лазірки', 'Щербані', 'Розсошенці', 'Білики'],
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


  // ---------------------------------------------------------------- рейтинг (поточний, 2026)
  function ratingMap(gender) {
    var out = {};
    function take(r) { if (r && r.rows) r.rows.forEach(function (x) { if (x && x.name && typeof x.total === 'number') out[x.name] = x.total; }); }
    try {
      if (gender !== 'women' && typeof currentRatingMen !== 'undefined') take(currentRatingMen);
      if (gender !== 'men' && typeof currentRatingWomen !== 'undefined') take(currentRatingWomen);
    } catch (e) { }
    return out;
  }
  function fmtRating(v) { return (typeof v === 'number') ? (Math.round(v * 10) / 10).toString().replace('.', ',') : '—'; }

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
    '.reg-table td.rt{font-family:"JetBrains Mono",monospace;color:var(--gold)}.reg-pill{display:inline-block;border-radius:20px;padding:2px 10px;font-size:12px;border:1px solid var(--line)}' +
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
    '.reg-banner{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:18px;margin-bottom:22px;background:#0b1236}' +
    '.reg-banner svg.bg{position:absolute;inset:0;width:100%;height:100%}' +
    '.reg-banner .in{position:relative;padding:34px 30px 150px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px 34px}' +
    '.reg-banner h3{margin:0 0 6px;font-size:clamp(22px,3.4vw,32px);line-height:1.15}.reg-banner .kick{color:var(--gold);font-size:12px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px}' +
    '.reg-banner .where{display:flex;flex-wrap:wrap;gap:8px 18px;margin:12px 0 16px;font-size:15px}.reg-banner .where b{color:var(--gold)}' +
    '.reg-day{background:rgba(10,15,42,.72);backdrop-filter:blur(3px);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:10px}' +
    '.reg-day .d{color:var(--gold);font-weight:600;font-size:13px;margin-bottom:6px}' +
    '.reg-day button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--cream);font:14.5px Inter,sans-serif;padding:6px 2px;cursor:pointer;border-radius:6px}' +
    '.reg-day button:hover{background:rgba(255,255,255,.06)}.reg-day button small{color:var(--muted);margin-left:6px}' +
    '.reg-docs{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}' +
    '.reg-doc{display:inline-flex;gap:8px;align-items:center;border:1px solid var(--gold);color:var(--gold);border-radius:10px;padding:10px 16px;font:600 14px Inter,sans-serif;text-decoration:none;background:rgba(10,15,42,.6)}' +
    '.reg-doc.soon{border-style:dashed;color:var(--muted);border-color:var(--line);cursor:default}' +
    '@media(max-width:760px){.reg-banner .in{grid-template-columns:1fr;padding:24px 18px 130px}}' +
    '.reg-tabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}' +
    '.reg-tab{text-align:left;background:var(--royal-dark);border:1px solid var(--line);color:var(--cream);border-radius:12px;padding:11px 13px;cursor:pointer;font:14px Inter,sans-serif}' +
    '.reg-tab .t{font-weight:600}.reg-tab .m{color:var(--muted);font-size:12px;margin-top:3px}.reg-tab.on{border-color:var(--gold);background:rgba(252,194,2,.1)}' +
    '.reg-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--royal);border:1px solid var(--gold);color:var(--cream);padding:11px 18px;border-radius:10px;z-index:1100;font-size:14px}';

  // ---------------------------------------------------------------- секція
  var cur = REG_TOURNAMENTS[0];
  var state = { timer: null };
  var data = {};
  REG_TOURNAMENTS.forEach(function (t) { data[t.id] = { rows: [], loaded: false }; });
  function S() { return data[cur.id]; }

  function bannerSvg() {
    return '<svg class="bg" viewBox="0 0 900 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<defs><linearGradient id="rg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1236"/><stop offset=".55" stop-color="#23357f"/><stop offset="1" stop-color="#f08a3c"/></linearGradient>' +
      '<linearGradient id="rg-riv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a5fb4"/><stop offset="1" stop-color="#6fb1e8"/></linearGradient></defs>' +
      '<rect width="900" height="360" fill="url(#rg-sky)"/>' +
      '<g fill="#fff" opacity=".7"><circle cx="90" cy="40" r="1.6"/><circle cx="210" cy="70" r="1.2"/><circle cx="340" cy="30" r="1.6"/><circle cx="470" cy="60" r="1.2"/><circle cx="560" cy="25" r="1.5"/><circle cx="690" cy="55" r="1.2"/><circle cx="820" cy="35" r="1.6"/></g>' +
      // гори
      '<path d="M0 250 L90 170 L150 215 L250 120 L340 210 L420 150 L520 235 L600 180 L700 240 L800 175 L900 230 L900 360 L0 360Z" fill="#2c3f8f" opacity=".75"/>' +
      '<path d="M0 285 L70 225 L140 262 L240 190 L330 255 L430 205 L530 268 L640 215 L740 270 L830 225 L900 262 L900 360 L0 360Z" fill="#1b2a6e"/>' +
      // мішень-сонце
      '<g transform="translate(300 222) scale(.62)"><circle r="78" fill="#fcc202" opacity=".18"/><circle r="62" fill="#141c56" stroke="#fcc202" stroke-width="3"/><circle r="48" fill="#fff" opacity=".92"/><circle r="38" fill="#c8102e"/><circle r="26" fill="#fff" opacity=".92"/><circle r="17" fill="#1a8f4a"/><circle r="7" fill="#c8102e"/></g>' +
      '<path d="M0 318 L110 270 L210 305 L330 255 L450 308 L580 262 L700 310 L820 272 L900 300 L900 360 L0 360Z" fill="#0f1a4d"/>' +
      // сосни
      '<g fill="#0a1238"><path d="M40 330 l14 -46 l14 46z M62 330 l12 -38 l12 38z M110 335 l12 -40 l12 40z M770 335 l14 -46 l14 46z M800 335 l12 -38 l12 38z M840 332 l14 -42 l14 42z"/></g>' +
      // Черемош
      '<path d="M-10 345 C150 318 260 352 420 332 S700 318 910 342 L910 365 L-10 365Z" fill="url(#rg-riv)" opacity=".9"/>' +
      '<path d="M40 350 C180 336 260 356 400 344 M470 340 C600 328 700 346 860 338" stroke="#fff" stroke-opacity=".45" fill="none" stroke-width="1.5"/>' +
      '</svg>';
  }

  function buildBanner() {
    var days = {};
    REG_TOURNAMENTS.forEach(function (t) { (days[t.day] = days[t.day] || []).push(t); });
    var daysHtml = Object.keys(days).map(function (d) {
      return '<div class="reg-day"><div class="d">📅 ' + esc(d) + '</div>' + days[d].map(function (t) {
        return '<button type="button" data-go="' + esc(t.id) + '">🎯 ' + esc(t.title) + '<small>' + esc(DISCIPLINE) + '</small></button>';
      }).join('') + '</div>';
    }).join('');
    function doc(label, url) {
      return url ? '<a class="reg-doc" target="_blank" rel="noopener" href="' + esc(url) + '">📄 ' + label + '</a>'
                 : '<span class="reg-doc soon" title="Документ буде опубліковано пізніше">📄 ' + label + ' <small>(незабаром)</small></span>';
    }
    return '<div class="reg-banner">' + bannerSvg() + '<div class="in"><div>' +
      '<div class="kick">Українська федерація дартсу</div>' +
      '<h3>Запрошуємо взяти участь у змаганнях!</h3>' +
      '<div class="where"><span>📅 <b>' + esc(REG_EVENT.dates) + '</b></span><span>📍 <b>' + esc(REG_EVENT.place) + '</b>, ' + esc(REG_EVENT.region) + '</span></div>' +
      '<div class="reg-note" style="margin:0 0 12px;color:var(--cream)">Чемпіонат України та фінал Кубку України — в карпатській Вижниці, на березі Черемошу.</div>' +
      '<div class="reg-docs">' + doc('Регламент', REG_EVENT.docs.regulations) + doc('Список суддів', REG_EVENT.docs.judges) + '</div>' +
      '</div><div>' + daysHtml + '</div></div></div>';
  }

  function buildSection() {
    if ($('#registration')) return;
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    var sec = el('section', { id: 'registration', 'data-i18n-skip': '' });
    sec.innerHTML =
      '<h2><span class="idx">★</span> Реєстрація на турніри <span class="reg-badge" id="reg-badge">тест</span></h2>' +
      buildBanner() +
      '<p class="section-sub">Оберіть турнір, потім себе зі списку, вкажіть регіон, населений пункт і телефон. Список упорядковано за поточним рейтингом. Телефон бачить лише організатор.</p>' +
      '<div class="reg-tabs" id="reg-tabs"></div>' +
      '<div class="reg-card"><div><h3 id="reg-title"></h3><div class="reg-meta" id="reg-meta"></div></div>' +
      '<button type="button" class="reg-btn" id="reg-open">Зареєструватись</button></div>' +
      '<div class="reg-table-wrap"><table class="reg-table"><thead><tr><th>№</th><th>Гравець</th><th>Рейтинг</th><th>Регіон</th><th>Населений пункт</th><th>Тур-карта</th></tr></thead><tbody id="reg-body"></tbody></table></div>' +
      '<div class="reg-note" id="reg-note"></div>';
    var anchor = $('#history');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor); else document.body.appendChild(sec);
    $('#reg-open').addEventListener('click', openForm);
    $('#reg-badge').style.display = REG_PUBLIC ? 'none' : '';
    sec.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go],[data-tab]'); if (!b) return;
      var id = b.getAttribute('data-go') || b.getAttribute('data-tab');
      select(id);
      if (b.getAttribute('data-go')) $('#reg-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    select(cur.id);
    var nav = $('nav');
    if (nav && !$('#reg-nav')) { var a = el('a', { href: '#registration', id: 'reg-nav', 'data-i18n-skip': '' }, 'Реєстрація'); nav.insertBefore(a, nav.firstChild); }
  }

  function select(id) {
    var t = REG_TOURNAMENTS.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    cur = t;
    $('#reg-tabs').innerHTML = REG_TOURNAMENTS.map(function (x) {
      var n = data[x.id].loaded ? data[x.id].rows.length + ' зареєстр.' : x.day.replace(' 2026', '');
      return '<button type="button" class="reg-tab' + (x.id === cur.id ? ' on' : '') + '" data-tab="' + esc(x.id) + '"><div class="t">' + esc(x.short) + '</div><div class="m">' + esc(n) + '</div></button>';
    }).join('');
    $('#reg-title').textContent = cur.title;
    $('#reg-meta').textContent = '📅 ' + cur.day + '   ·   📍 ' + REG_EVENT.place + ', ' + REG_EVENT.region + '   ·   🎯 ' + DISCIPLINE;
    $('#reg-open').disabled = !cur.open;
    renderTable(); loadTable();
  }

  function renderTable() {
    var body = $('#reg-body'); if (!body) return;
    var note = $('#reg-note');
    if (!REG_API_URL) { body.innerHTML = '<tr><td colspan="6" class="reg-empty">Реєстрацію ще не підключено (немає адреси Apps Script).</td></tr>'; note.textContent = ''; return; }
    if (!S().loaded) { body.innerHTML = '<tr><td colspan="6" class="reg-empty">Завантаження…</td></tr>'; return; }
    if (!S().rows.length) { body.innerHTML = '<tr><td colspan="6" class="reg-empty">Поки ніхто не зареєструвався.</td></tr>'; note.textContent = ''; return; }
    var rm = ratingMap(cur.gender);
    var rows = S().rows.map(function (r, i) {
      var live = rm[r.name];
      return { r: r, i: i, rt: (typeof live === 'number') ? live : (typeof r.rating === 'number' ? r.rating : null) };
    }).sort(function (a, b) {
      if (a.rt === null && b.rt === null) return a.i - b.i;
      if (a.rt === null) return 1; if (b.rt === null) return -1;
      return (b.rt - a.rt) || (a.i - b.i);
    });
    body.innerHTML = rows.map(function (o, k) {
      var r = o.r;
      var cls = r.card === 'Маю' ? 'y' : (r.card === 'Не маю' ? 'n' : 'w');
      var txt = r.card === 'Маю' ? 'Є' : (r.card === 'Не маю' ? 'Немає' : 'Оформлює');
      return '<tr class="' + (r.marked ? 'reg-marked' : '') + '"><td class="n">' + (k + 1) + '</td><td class="nm">' + (r.marked ? '★ ' : '') + esc(r.name) +
        '</td><td class="rt">' + fmtRating(o.rt) + '</td><td>' + esc(r.region) + '</td><td>' + esc(r.city) + '</td><td><span class="reg-pill ' + cls + '">' + txt + '</span></td></tr>';
    }).join('');
    var marked = S().rows.filter(function (r) { return r.marked; }).length;
    note.textContent = 'Зареєстровано: ' + S().rows.length + (marked ? ' · виділені жовтим — відмічені організатором: ' + marked : '');
  }

  function loadTable() {
    if (!REG_API_URL) { renderTable(); return; }
    var id = cur.id;
    apiGet(id).then(function (d) {
      if (d && d.ok) { data[id].rows = d.rows || []; data[id].loaded = true; if (cur.id === id) renderTable(); updateTabs(); }
    }).catch(function () { if (cur.id === id && !data[id].loaded) { $('#reg-body').innerHTML = '<tr><td colspan="6" class="reg-empty">Не вдалося завантажити список. Спробуйте пізніше.</td></tr>'; } });
  }
  function updateTabs() {
    document.querySelectorAll('#reg-tabs .reg-tab').forEach(function (b) {
      var id = b.getAttribute('data-tab'); if (data[id] && data[id].loaded) b.querySelector('.m').textContent = data[id].rows.length + ' зареєстр.';
    });
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
    $('#form-title', overlay).textContent = 'Реєстрація: ' + cur.title;
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
      '<h3 id="form-title"></h3><div class="reg-meta">Усі поля обов\'язкові</div>' +
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
    var dup = S().rows.some(function (r) { return norm(r.name) === norm(name); });
    if (dup) { status.className = 'reg-status err'; status.textContent = 'Цей гравець уже є у списку реєстрації.'; return; }
    if (!REG_API_URL) { status.className = 'reg-status err'; status.textContent = 'Реєстрацію ще не підключено: не вказано адресу Apps Script.'; return; }
    var btn = $('#reg-submit', overlay); btn.disabled = true; status.className = 'reg-status'; status.textContent = 'Надсилаю…';
    apiPost({ t: cur.id, name: name, rating: (typeof ratingMap(cur.gender)[name] === 'number') ? ratingMap(cur.gender)[name] : null, isNew: !!form.isNew, region: region, city: city, phone: phone, card: cardEl.value,
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

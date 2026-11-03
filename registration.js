/* Реєстрація на турніри (тестова, прихована).
 * Дані зберігає Google Apps Script (див. registration_apps_script.gs). Телефон на сайт НЕ повертається.
 * Увімкнути для себе: 5 швидких тапів по логотипу у шапці або посилання з #reg-test. Вимкнути: #reg-off.
 * Для всіх одразу: REG_PUBLIC = true. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- налаштування
  var REG_API_URL = 'https://script.google.com/macros/s/AKfycbyAn1ESRAZPRSmJJ74JdyW4awfczqGs5yR_yhC475MWhOWeh24t6JYp1qxSkdqKJnpkAg/exec';          // <-- сюди вставте адресу веб-застосунку Apps Script (закінчується на /exec)
  var REG_PUBLIC = false;        // true - секція видима всім; false - лише після таємного входу
  // Подія: 11-13 грудня 2026, Вижниця. Посилання на документи вставте пізніше ('' = "незабаром")
  var REG_EVENT = {
    place: 'Вижниця', region: 'Чернівецька область', dates: '11–13 грудня 2026',
    mapUrl: 'https://maps.google.com/?cid=4936380032326911263&g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAMYASAF',
    bg: '',            // шлях до фото (напр. 'vyzhnytsia.jpg'); порожньо = намальована панорама Карпат
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
    '.reg-org{display:flex;align-items:center;gap:14px;margin-bottom:14px}.reg-org .kick{margin:0;font-size:13px}' +
    '.reg-logo{height:92px;width:auto;background:#fff;border-radius:14px;padding:8px 10px;box-shadow:0 6px 20px rgba(0,0,0,.4)}' +
    '.reg-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-bottom:14px}' +
    '.reg-live{display:inline-flex;align-items:center;gap:7px;background:#e5173f;color:#fff;border-radius:999px;padding:5px 13px;font:700 12px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase}' +
    '.reg-live i{width:8px;height:8px;border-radius:50%;background:#fff;animation:regpulse 1.4s infinite}' +
    '@keyframes regpulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.8)}100%{box-shadow:0 0 0 9px rgba(255,255,255,0)}}' +
    '.reg-banner{position:relative;overflow:hidden;border:2px solid var(--gold);border-radius:20px;margin-bottom:24px;background:#0b1236;box-shadow:0 0 0 4px rgba(252,194,2,.14),0 18px 50px rgba(252,194,2,.16),0 10px 40px rgba(0,0,0,.45)}' +
    '.reg-banner svg.bg,.reg-banner .photo{position:absolute;inset:0;width:100%;height:100%}.reg-banner .photo{background-size:cover;background-position:center}' +
    '.reg-banner .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,12,38,.88) 0%,rgba(8,12,38,.55) 55%,rgba(8,12,38,.25) 100%)}' +
    '.reg-banner .in{position:relative;padding:34px 30px 230px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px 34px}' +
    '.reg-banner h3{margin:0 0 8px;font-size:clamp(26px,4vw,40px);line-height:1.1;text-shadow:0 2px 14px rgba(0,0,0,.5)}.reg-banner .kick{color:var(--gold);font-size:12px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px;font-weight:600}' +
    '.reg-banner .where{display:flex;flex-wrap:wrap;gap:8px 12px;margin:14px 0 14px;font-size:16px}' +
    '.reg-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(10,15,42,.7);border:1px solid var(--line);border-radius:999px;padding:7px 14px;color:var(--cream);text-decoration:none}.reg-chip b{color:var(--gold)}' +
    'a.reg-chip{border-color:var(--gold);transition:.15s}a.reg-chip:hover{background:var(--gold);color:#141c56}a.reg-chip:hover b{color:#141c56}' +
    '.reg-banner .lead{margin:0 0 14px;color:var(--cream);font-size:15.5px;text-shadow:0 1px 8px rgba(0,0,0,.6)}' +
    '.reg-day{background:rgba(10,15,42,.8);backdrop-filter:blur(3px);border:1px solid var(--line);border-radius:14px;padding:12px 12px 8px;margin-bottom:12px}' +
    '.reg-day .d{color:var(--gold);font-weight:700;font-size:13px;margin-bottom:8px;letter-spacing:.04em}' +
    '.reg-day button{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--cream);font:600 14.5px Inter,sans-serif;padding:10px 12px;margin-bottom:6px;cursor:pointer;border-radius:10px;transition:.15s}' +
    '.reg-day button:hover{background:rgba(252,194,2,.16);border-color:var(--gold);transform:translateX(3px)}' +
    '.reg-day button small{display:block;color:var(--muted);font-weight:400;font-size:12px;margin-top:2px}' +
    '.reg-day button .go{flex:none;background:linear-gradient(90deg,var(--gold-2),var(--gold));color:#141c56;border-radius:8px;padding:6px 11px;font:700 12px Inter,sans-serif;white-space:nowrap}' +
    '.reg-docs{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}' +
    '.reg-doc{display:inline-flex;gap:8px;align-items:center;background:linear-gradient(90deg,var(--gold-2),var(--gold));color:#141c56;border-radius:10px;padding:11px 18px;font:700 14px Inter,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(252,194,2,.3);transition:.15s}' +
    'a.reg-doc:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(252,194,2,.45)}' +
    '.reg-doc.soon{background:rgba(10,15,42,.7);color:var(--muted);border:1px dashed var(--muted);box-shadow:none;cursor:default}' +
    '.reg-board{position:absolute;left:34px;bottom:26px;width:190px;height:190px;filter:drop-shadow(0 10px 18px rgba(0,0,0,.55))}' +
    '.reg-cta{position:absolute;left:250px;bottom:70px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}' +
    '.reg-cta .t{font:700 20px Inter,sans-serif;text-shadow:0 2px 10px rgba(0,0,0,.7)}.reg-cta .reg-btn{font-size:16px;padding:14px 26px;box-shadow:0 6px 20px rgba(252,194,2,.4)}' +
    '@media(max-width:760px){.reg-banner .in{grid-template-columns:1fr;padding:24px 16px 250px}.reg-board{left:50%;margin-left:-95px;bottom:84px}.reg-cta{left:16px;right:16px;bottom:20px;align-items:center;text-align:center}}' +
    '.reg-chk{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#1a8f4a;color:#fff;font-size:14px;font-weight:700}' +
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

  var DART_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  function dartboardSvg() {
    var R = 100, rad = Math.PI / 180;
    function pt(r, a) { return (r * Math.sin(a * rad)).toFixed(2) + ' ' + (-r * Math.cos(a * rad)).toFixed(2); }
    function wedge(r1, r2, a1, a2, fill) {
      return '<path d="M' + pt(r2, a1) + ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + pt(r2, a2) + ' L' + pt(r1, a2) + ' A' + r1 + ' ' + r1 + ' 0 0 0 ' + pt(r1, a1) + 'Z" fill="' + fill + '" stroke="#b9bec9" stroke-width=".35"/>';
    }
    var o = '<svg class="reg-board" viewBox="-118 -118 236 236" aria-hidden="true"><circle r="116" fill="#16181d"/><circle r="113" fill="#0d0e12" stroke="#2b2e37" stroke-width="1.5"/>';
    for (var i = 0; i < 20; i++) {
      var a1 = i * 18 - 9, a2 = i * 18 + 9, dark = i % 2 === 0;
      var single = dark ? '#15171c' : '#efe3c2', ring = dark ? '#d3213b' : '#1f9d57';
      o += wedge(R * .094, R * .582, a1, a2, single) + wedge(R * .582, R * .629, a1, a2, ring) + wedge(R * .629, R * .953, a1, a2, single) + wedge(R * .953, R, a1, a2, ring);
      var am = i * 18, tx = (108 * Math.sin(am * rad)).toFixed(1), ty = (-108 * Math.cos(am * rad) + 3.6).toFixed(1);
      o += '<text x="' + tx + '" y="' + ty + '" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="9.5" fill="#f4f4f4">' + DART_ORDER[i] + '</text>';
    }
    o += '<circle r="' + (R * .094) + '" fill="#1f9d57" stroke="#b9bec9" stroke-width=".35"/><circle r="' + (R * .037) + '" fill="#d3213b" stroke="#b9bec9" stroke-width=".35"/>';
    o += '<g transform="translate(34 -52) rotate(28)"><path d="M0 0 L-1.5 -20 L1.5 -20Z" fill="#c9ccd4"/><rect x="-2.2" y="-46" width="4.4" height="26" rx="2" fill="#fcc202"/><path d="M-2.2 -46 L-9 -62 L-2 -55Z M2.2 -46 L9 -62 L2 -55Z" fill="#e5173f"/></g>';
    return o + '</svg>';
  }

  function bannerSvg() {
    function pines(x, y, k) {
      var o = '';
      for (var i = 0; i < k; i++) { var px = x + i * 17, h = 38 + ((i * 7) % 4) * 8; o += '<path d="M' + px + ' ' + y + ' l9 -' + h + ' l9 ' + h + 'z M' + (px + 2) + ' ' + (y - 14) + ' l7 -' + (h - 6) + ' l7 ' + (h - 6) + 'z"/>'; }
      return o;
    }
    return '<svg class="bg" viewBox="0 0 900 380" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<defs><linearGradient id="rg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101a52"/><stop offset=".45" stop-color="#3a3f99"/><stop offset=".75" stop-color="#e0749a"/><stop offset="1" stop-color="#ffb347"/></linearGradient>' +
      '<radialGradient id="rg-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3b0" stop-opacity=".95"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="rg-riv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f5fae"/><stop offset=".5" stop-color="#58a6e6"/><stop offset="1" stop-color="#2a6fbf"/></linearGradient></defs>' +
      '<rect width="900" height="380" fill="url(#rg-sky)"/>' +
      '<circle cx="640" cy="235" r="150" fill="url(#rg-sun)"/><circle cx="640" cy="240" r="34" fill="#fff0a8"/>' +
      '<g fill="#fff" opacity=".8"><circle cx="90" cy="40" r="1.6"/><circle cx="210" cy="70" r="1.2"/><circle cx="340" cy="30" r="1.6"/><circle cx="470" cy="62" r="1.2"/><circle cx="560" cy="25" r="1.5"/><circle cx="690" cy="50" r="1.2"/><circle cx="820" cy="35" r="1.6"/></g>' +
      '<path d="M0 262 L80 190 L140 232 L250 130 L345 222 L430 160 L520 240 L610 195 L700 248 L790 185 L900 238 L900 380 L0 380Z" fill="#6a5fb0" opacity=".85"/>' +
      '<path d="M250 130 L225 152 L243 148 L252 160 L262 148 L278 154Z M430 160 L411 178 L426 175 L433 184 L442 174 L456 180Z M790 185 L772 202 L786 199 L793 208 L802 198 L815 203Z" fill="#fff" opacity=".9"/>' +
      '<path d="M0 300 L70 238 L150 282 L250 205 L340 275 L440 222 L540 285 L650 232 L750 288 L840 240 L900 272 L900 380 L0 380Z" fill="#3b3f8f"/>' +
      '<path d="M0 335 C120 285 230 300 330 318 S560 292 700 312 S850 296 900 305 L900 380 L0 380Z" fill="#1f6b4a"/>' +
      '<path d="M0 352 C150 322 270 346 420 330 S700 318 900 340 L900 380 L0 380Z" fill="#17553a"/>' +
      '<g fill="#0c2a22">' + pines(18, 350, 4) + pines(760, 352, 5) + pines(430, 342, 3) + '</g>' +
      '<g transform="translate(560 318)"><path d="M0 0 h30 v-16 l-15 -12 l-15 12z" fill="#7a4a2a"/><rect x="10" y="-12" width="9" height="12" fill="#ffd36b"/></g>' +
      '<path d="M-10 362 C140 342 250 368 410 352 S690 340 910 360 L910 385 L-10 385Z" fill="url(#rg-riv)"/>' +
      '<path d="M40 368 C180 355 260 372 400 362 M470 358 C600 346 700 364 860 356" stroke="#fff" stroke-opacity=".5" fill="none" stroke-width="1.5"/>' +
      '</svg>';
  }

  function buildBanner() {
    var days = {};
    REG_TOURNAMENTS.forEach(function (t) { (days[t.day] = days[t.day] || []).push(t); });
    var daysHtml = Object.keys(days).map(function (d) {
      return '<div class="reg-day"><div class="d">📅 ' + esc(d) + '</div>' + days[d].map(function (t) {
        return '<button type="button" data-go="' + esc(t.id) + '"><span>🎯 ' + esc(t.title) + '<small>' + esc(DISCIPLINE) + '</small></span><span class="go">Реєстрація →</span></button>';
      }).join('') + '</div>';
    }).join('');
    function doc(label, url) {
      return url ? '<a class="reg-doc" target="_blank" rel="noopener" href="' + esc(url) + '">📄 ' + label + ' <span>↗</span></a>'
                 : '<span class="reg-doc soon" title="Документ буде опубліковано пізніше">📄 ' + label + ' <small>(незабаром)</small></span>';
    }
    var bg = REG_EVENT.bg ? '<div class="photo" style="background-image:url(\'' + esc(REG_EVENT.bg) + '\')"></div><div class="shade"></div>' : bannerSvg();
    return '<div class="reg-banner">' + bg + '<div class="in"><div>' +
      '<div class="reg-org"><img class="reg-logo" src="vfd-logo.svg" alt="ВФД"><div class="kick">Всеукраїнська Федерація Дартсу</div></div>' +
      '<h3>Запрошуємо взяти участь у змаганнях!</h3>' +
      '<div class="where"><span class="reg-chip">📅 <b>' + esc(REG_EVENT.dates) + '</b></span>' +
      '<a class="reg-chip" target="_blank" rel="noopener" href="' + esc(REG_EVENT.mapUrl) + '" title="Відкрити на Google Maps">📍 <b>' + esc(REG_EVENT.place) + '</b>, ' + esc(REG_EVENT.region) + ' <span>↗</span></a></div>' +
      '<p class="lead">В Вижниці, в серці Карпат на березі Черемошу</p>' +
      '<div class="reg-docs">' + doc('Регламент', REG_EVENT.docs.regulations) + doc('Список суддів', REG_EVENT.docs.judges) + '</div>' +
      '</div><div>' + daysHtml + '</div></div>' + dartboardSvg() +
      '<div class="reg-cta"><div class="t">Реєстрація відкрита!</div><button type="button" class="reg-btn" data-go="' + esc(REG_TOURNAMENTS[0].id) + '">Зареєструватись ↓</button></div></div>';
  }

  function buildSection() {
    if ($('#registration')) return;
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    var sec = el('section', { id: 'registration', 'data-i18n-skip': '' });
    sec.innerHTML =
      '<h2><span class="idx">★</span> Реєстрація на турніри <span class="reg-badge" id="reg-badge">тест</span></h2>' +
      '<div class="reg-head"><span class="reg-live"><i></i>Реєстрація відкрита</span><span class="reg-meta">Чемпіонат України і фінал Кубку України · 11–13 грудня 2026</span></div>' +
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
      var txt = r.card === 'Маю' ? '' : (r.card === 'Не маю' ? 'Немає' : 'Оформлює');
      return '<tr class="' + (r.marked ? 'reg-marked' : '') + '"><td class="n">' + (k + 1) + '</td><td class="nm">' + (r.marked ? '★ ' : '') + esc(r.name) +
        '</td><td class="rt">' + fmtRating(o.rt) + '</td><td>' + esc(r.region) + '</td><td>' + esc(r.city) + '</td><td>' + (r.card === 'Маю' ? '<span class="reg-chk" title="Є тур-карта">✔</span>' : '<span class="reg-pill ' + cls + '">' + txt + '</span>') + '</td></tr>';
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

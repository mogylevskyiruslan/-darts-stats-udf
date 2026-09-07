#!/usr/bin/env python3
"""
Синхронізатор статистики ВФД.

Читає дві опубліковані Google-таблиці (CSV, без авторизації) і збирає
єдиний data.json для сайту:
  1. "UA darts stat (учасники)" — турніри, учасники, посилання (Nakka/протоколи)
  2. "Призери етапів кубків ВФД" — призери по роках/етапах + підсумковий залік

Запускається щодня через GitHub Actions (.github/workflows/sync.yml).
"""

import csv
import io
import json
import re
import time
import urllib.request
from datetime import datetime, timezone

TOURNAMENTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZxNlB-yHQDjWX3Y_n4GCUL_4sY5oLcLeW9rR_MI5zlm2p0YqZmHUUXw07bLw1YTiUg4Ar6bRbn_Dd/pub?output=csv&gid=0"
PRIZES_MEN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5IoUV8U550qzdDKkLxenpx2LUYMQ8Uccqf9ZdkyP7ruIqdoPt_tX-hQWKhQOnTGc6HG6jiPQmQEuA/pub?output=csv&gid=0"
PRIZES_WOMEN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5IoUV8U550qzdDKkLxenpx2LUYMQ8Uccqf9ZdkyP7ruIqdoPt_tX-hQWKhQOnTGc6HG6jiPQmQEuA/pub?output=csv&gid=109502045"
RATINGS_SOURCES_PATH = "ratings_sources.json"
NAKKA_API_BASE = "https://push.n01darts.com/api/v1"
YOUTUBE_CHANNEL_ID = "UClyHuQB21ETTD7Q6V0cKmXQ"  # Ukrainian Darts Federation
TELEGRAM_CHANNEL = "fullbull"  # інформаційний партнер ВФД

OUTPUT_PATH = "data.json"


def fetch_csv(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (vfd-darts-sync)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8-sig")
    return list(csv.reader(io.StringIO(raw)))


def parse_num(s):
    s = (s or "").strip()
    if s in ("", "-"):
        return None
    s = s.replace(",", ".")
    try:
        return float(s) if "." in s else int(s)
    except ValueError:
        return None


def classify_link(url):
    if not url:
        return None
    if "n01darts.com" in url:
        return "nakka"
    if "docs.google.com/document" in url:
        return "protocol_doc"
    if "docs.google.com/spreadsheets" in url:
        return "protocol_sheet"
    if "open.udf.in.ua" in url:
        return "udf_online"
    return "other"


# ---------------------------------------------------------------------------
# 1) "UA darts stat (учасники)"
#    Колонки: A total, B men, C menAvg, D women, E womenAvg, F name, G org,
#    H format, I date, J city, (K пусто), L..P — посилання (додані Apps Script)
# ---------------------------------------------------------------------------
def parse_tournaments(rows):
    tournaments = []
    for row in rows:
        if not row or len(row) < 10:
            continue
        row = row + [""] * (16 - len(row))
        total, men, men_avg, women, women_avg, name, org, fmt, date, city = row[:10]
        link_men, link_menavg, link_women, link_womenavg, link_tour = row[11:16]

        name = name.strip()
        date = date.strip()
        # skip header / blank rows: a real row always has a name and a dd.mm.yyyy date
        if not name or not re.match(r"^\d{2}\.\d{2}\.\d{4}$", date):
            continue

        org = org.strip()
        is_udl = org in ("УДЛ", "ЗУДЛ")
        org_norm = "УДЛ/ЗУДЛ" if is_udl else org

        def link_obj(u):
            u = (u or "").strip()
            return {"url": u, "type": classify_link(u)} if u else None

        tournaments.append({
            "total": parse_num(total), "men": parse_num(men), "menAvg": parse_num(men_avg),
            "women": parse_num(women), "womenAvg": parse_num(women_avg),
            "name": name, "org": org_norm, "format": fmt.strip(),
            "date": date, "city": city.strip(), "isUDL": is_udl,
            "links": {
                "men": link_obj(link_men),
                "menAvg": link_obj(link_menavg),
                "women": link_obj(link_women),
                "womenAvg": link_obj(link_womenavg),
                "tournament": link_obj(link_tour),
            },
            "medals": None,
        })
    return tournaments


# ---------------------------------------------------------------------------
# 2) "Призери етапів кубків ВФД"
#    Рядок 1 (індекс 0): глобальні підписи колонок B..M = "1".."11","ЧУ"
#    Далі йдуть блоки по роках: рядок з роком у колонці A + містами по
#    колонках, потім 3-4 рядки призерів (1-ше, 2-ге, 3-тє... місце).
#    Внизу — підсумкова таблиця медального заліку (шапка "Гравець").
# ---------------------------------------------------------------------------
def parse_prizes(rows):
    if not rows:
        return {}, []

    header = rows[0]
    stage_labels = {}
    for idx, label in enumerate(header):
        if idx == 0:
            continue
        label = label.strip()
        if label:
            stage_labels[idx] = label  # "1".."11" or "ЧУ"

    year_data = {}
    aggregate = []
    in_aggregate = False

    i = 1
    n = len(rows)
    while i < n:
        row = rows[i]
        if not row or not any(c.strip() for c in row):
            i += 1
            continue

        col_a = row[0].strip() if len(row) > 0 else ""
        col_b = row[1].strip() if len(row) > 1 else ""

        if col_b == "Гравець":
            in_aggregate = True
            i += 1
            continue

        if in_aggregate:
            if col_a and len(row) > 6:
                try:
                    rank = int(col_a)
                except ValueError:
                    rank = None
                name = row[1].strip()

                def gi(x):
                    x = (x or "").strip()
                    return int(x) if x.isdigit() else 0

                if name:
                    aggregate.append({
                        "rank": rank, "name": name,
                        "gold": gi(row[2]), "silver": gi(row[3]), "bronze": gi(row[4]),
                        "champUA": gi(row[5]), "total": gi(row[6]),
                    })
            i += 1
            continue

        if re.match(r"^\d{4}$", col_a):
            year = int(col_a)
            year_data.setdefault(year, {})
            city_row = row

            podium_rows = []
            j = i + 1
            while j < n:
                nrow = rows[j]
                if not nrow or not any(c.strip() for c in nrow):
                    break
                ncol_a = nrow[0].strip() if len(nrow) > 0 else ""
                ncol_b = nrow[1].strip() if len(nrow) > 1 else ""
                if re.match(r"^\d{4}$", ncol_a) or ncol_b == "Гравець":
                    break
                podium_rows.append(nrow)
                j += 1

            for col_idx, stage_label in stage_labels.items():
                city = city_row[col_idx].strip() if col_idx < len(city_row) else ""
                if not city:
                    continue
                names = []
                for prow in podium_rows:
                    val = prow[col_idx].strip() if col_idx < len(prow) else ""
                    names.append(val or None)
                while names and names[-1] is None:
                    names.pop()
                if names:
                    year_data[year][stage_label] = {"city": city, "podium": names}
            i = j
            continue

        i += 1

    return year_data, aggregate


def build_leaderboard_from_podiums(year_data):
    """Рахує медальний залік самостійно з даних подіумів (а не з таблиці,
    яку користувач вручну підбивав в Excel і де можливі помилки).
    Бронза рахується для КОЖНОГО імені в podium[2:] — тобто за 2013–2024,
    де обидва півфіналісти вважались призерами, це дає по 2 бронзи за етап."""
    from collections import defaultdict

    totals = defaultdict(lambda: {"gold": 0, "silver": 0, "bronze": 0, "champUA": 0})
    for stages in year_data.values():
        for key, entry in stages.items():
            podium = entry.get("podium", [])
            is_chu = key == "ЧУ"
            if len(podium) > 0 and podium[0]:
                totals[podium[0]]["gold"] += 1
                if is_chu:
                    totals[podium[0]]["champUA"] += 1
            if len(podium) > 1 and podium[1]:
                totals[podium[1]]["silver"] += 1
            for name in podium[2:]:
                if name:
                    totals[name]["bronze"] += 1

    rows = []
    for name, t in totals.items():
        total = t["gold"] + t["silver"] + t["bronze"]
        rows.append({
            "name": name, "gold": t["gold"], "silver": t["silver"],
            "bronze": t["bronze"], "champUA": t["champUA"], "total": total,
        })
    rows.sort(key=lambda r: (-r["gold"], -r["silver"], -r["bronze"], r["name"]))
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return rows


# У таблиці "Призери" міста часто скорочені інакше, ніж у таблиці турнірів
# ("КР" замість "Кривий Ріг" тощо) — без цього зіставлення по місту не
# спрацьовує, і турнір лишається без призерів, хоча дані насправді є.
CITY_ALIASES = {
    "КР": "Кривий Ріг",
    "Волинь": "Луцьк",
    "Київ опен": "Київ",
    "Kyiv Masters": "Київ",
    "Київ Мастерз": "Київ",
    "Київ мастерз": "Київ",
    "UA Open": "Одеса",
}


def normalize_city(city):
    return CITY_ALIASES.get(city, city)


def extract_stage(fmt):
    m = re.search(r"(\d+)\s*етап", fmt)
    if m:
        return m.group(1)
    if "Фінал" in fmt:
        return "FINAL"
    return None


# ---------------------------------------------------------------------------
# "Кубок України" — рейтинги за сезон (15+ вкладок, одна на рік+стать).
# Структура колонок різна з року в рік (інколи є "Місто"/"Регіон", інколи
# немає; кількість етапів різна) — тому визначаємо колонки-з-очками
# автоматично: якщо більшість заповнених клітинок колонки — числа, це
# етап/рейтинг, інакше — описова колонка (Місто, Регіон), яку пропускаємо.
# ---------------------------------------------------------------------------
NAME_SUFFIX_RE = re.compile(r"\s+[+\-=]\d*\s*$")


def clean_player_name(raw):
    """Деякі роки мають доклеєний до імені індикатор зміни місця
    ('Залевський Володимир =', 'Мелашенко Владислав +2') — прибираємо його."""
    return NAME_SUFFIX_RE.sub("", raw.strip()).strip()


def is_mostly_numeric(values):
    # "-" означає "не брав участі в цьому етапі" — це так само "порожньо",
    # як і справжня порожня клітинка, а не текстове значення.
    non_empty = [v for v in values if v.strip() and v.strip() != "-"]
    if not non_empty:
        return False
    numeric = sum(1 for v in non_empty if parse_num(v) is not None)
    return numeric / len(non_empty) >= 0.6


def parse_ratings_sheet(rows):
    """Розбирає одну вкладку рейтингу. Повертає {"columns": [...], "rows": [...]}
    або None, якщо структура не розпізнана (наприклад, порожня вкладка)."""
    header_idx = None
    for i, row in enumerate(rows):
        if len(row) > 1 and row[1].strip() in ("Гравець", "Name"):
            header_idx = i
            break
    if header_idx is None:
        return None

    header = rows[header_idx]
    data_rows = rows[header_idx + 1:]

    ncols = len(header)
    score_cols = []
    total_col = None
    for c in range(2, ncols):
        col_values = [r[c] if c < len(r) else "" for r in data_rows]
        if not is_mostly_numeric(col_values):
            continue
        label = header[c].split("\n")[0].strip() if header[c].strip() else f"Колонка {c}"
        is_total = bool(re.search(r"рейтинг|сума", header[c], re.IGNORECASE))
        if is_total and total_col is None:
            total_col = c
        else:
            score_cols.append((c, label))

    if total_col is None and score_cols:
        # немає явного підпису "рейтинг"/"сума" — беремо останню числову колонку
        total_col = score_cols[-1][0]
        score_cols = score_cols[:-1]

    if total_col is None:
        return None

    out_rows = []
    for r in data_rows:
        if len(r) < 2 or not r[1].strip():
            continue
        rank_raw = r[0].strip() if len(r) > 0 else ""
        name_raw = r[1].strip()
        if not name_raw:
            continue
        name = clean_player_name(name_raw)
        scores = [parse_num(r[c] if c < len(r) else "") for c, _ in score_cols]
        total = parse_num(r[total_col] if total_col < len(r) else "")
        out_rows.append({"rank": rank_raw, "name": name, "scores": scores, "total": total})

    # сортуємо за рейтингом на випадок, якщо вихідні рядки йшли не по порядку
    out_rows.sort(key=lambda x: -(x["total"] or 0))

    return {"columns": [label for _, label in score_cols], "rows": out_rows}


def build_ratings(sources_path, name_index=None, canonical_names=None):
    try:
        with open(sources_path, encoding="utf-8") as f:
            config = json.load(f)
    except FileNotFoundError:
        print(f"  WARNING: {sources_path} not found, skipping ratings")
        return {}

    ratings = {}
    for sheet in config["sheets"]:
        gid, label = sheet["gid"], sheet["label"]
        year_match = re.search(r"\d{4}", label)
        year = year_match.group(0) if year_match else "0000"
        gender = "women" if "Жін" in label else "men"
        key = f"{gender}_{year}"

        csv_url = f"https://docs.google.com/spreadsheets/d/{config['spreadsheetId']}/export?format=csv&gid={gid}"
        try:
            rows = fetch_csv(csv_url)
            parsed = parse_ratings_sheet(rows)
            if parsed:
                if name_index is not None:
                    for row in parsed["rows"]:
                        row["name"] = resolve_name(row["name"], name_index, canonical_names)
                parsed["label"] = label
                parsed["year"] = year
                parsed["gender"] = gender
                ratings[key] = parsed
                print(f"  {label}: {len(parsed['rows'])} players, {len(parsed['columns'])} stages")
            else:
                print(f"  {label}: could not parse (unrecognised structure), skipping")
        except Exception as e:
            print(f"  {label}: fetch failed ({e}), skipping")
    return ratings


# ---------------------------------------------------------------------------
# Nakka (n01darts.com) — реальна статистика й призери напряму з офіційного
# публічного API (без авторизації, без оплати — тільки читання):
# https://push.n01darts.com/api/v1/n01_api_manual_en.html
# ---------------------------------------------------------------------------
NAKKA_TDID_RE = re.compile(r"[?&]id=([a-zA-Z0-9_]+)")


def extract_tdid(url):
    """Дістає tdid (наприклад 't_NtXd_3172') з посилання на n01darts.com."""
    if not url or "n01darts.com" not in url:
        return None
    m = NAKKA_TDID_RE.search(url)
    return m.group(1) if m else None


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (vfd-darts-sync)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def player_avg(stat):
    darts = stat.get("darts") or 0
    score = stat.get("score") or 0
    if darts <= 0:
        return None
    return round(score / darts * 3, 2)


def fetch_nakka_tournament(tdid, cache):
    """Тягне список учасників (tpid->ім'я) і статистику для одного tdid.
    Кешується, бо той самий tdid іноді трапляється в кількох колонках."""
    if tdid in cache:
        return cache[tdid]

    result = None
    try:
        get_resp = fetch_json(f"{NAKKA_API_BASE}/tournament/get?tdid={tdid}&entry=1")
        time.sleep(0.05)
        stats_resp = fetch_json(f"{NAKKA_API_BASE}/tournament/stats?tdid={tdid}&kind=stats_list")
        time.sleep(0.05)

        if get_resp.get("result") == 0 and stats_resp.get("result") == 0:
            entries = {
                e["tpid"]: e["name"]
                for e in get_resp.get("tournament", {}).get("entry_list", [])
                if "tpid" in e and "name" in e
            }
            result = {"entries": entries, "stats": stats_resp.get("stats", {})}
    except Exception as e:
        print(f"    Nakka API fetch failed for {tdid}: {e}")

    cache[tdid] = result
    return result


def build_name_index(*name_lists):
    """Будує словник 'Прізвище' -> 'Прізвище Ім'я' з усіх наших джерел
    (медальний залік, рейтинги), де імена завжди повні. Використовується,
    щоб добудувати ім'я там, де Nakka зберігає тільки прізвище гравця."""
    from collections import Counter
    by_surname = {}
    for names in name_lists:
        for name in names:
            if not name:
                continue
            parts = name.strip().split()
            if len(parts) < 2:
                continue
            surname = parts[0]
            by_surname.setdefault(surname, Counter())[name.strip()] += 1
    return {surname: counter.most_common(1)[0][0] for surname, counter in by_surname.items()}


def build_canonical_names(*name_lists):
    """Повний список канонічних імен (для нечіткого зіставлення) —
    беремо з найнадійнішого джерела: самостійно порахований медальний залік
    (він завжди українською, завжди "Прізвище Ім'я")."""
    from collections import Counter
    counter = Counter()
    for names in name_lists:
        for name in names:
            if name and len(name.strip().split()) >= 2:
                counter[name.strip()] += 1
    # найчастіші написання йдуть першими — при однаковій схожості обирається популярніший варіант
    return [name for name, _ in counter.most_common()]


def resolve_name(name, name_index, canonical_names=None, fuzzy_cutoff=0.84):
    """Уніфікує ім'я гравця під наш канонічний формат "Прізвище Ім'я":
    - одне слово (тільки прізвище) → шукає повне ім'я за прізвищем;
    - два слова у зворотному порядку ("Тетяна Харченко" замість
      "Харченко Тетяна") → розпізнає за другим словом і розвертає;
    - одруківки й українська/російська різниця в написанні
      ("Мгилевський"/"Могилевський", "Александр"/"Олександр") →
      нечітке зіставлення з повним списком відомих імен;
    - вже правильний формат → просто нормалізує."""
    if not name:
        return name
    parts = name.strip().split()

    if len(parts) == 1:
        full = name_index.get(parts[0])
        if full:
            return full

    if len(parts) == 2:
        first_word, second_word = parts
        if first_word in name_index:
            return name_index[first_word]
        if second_word in name_index:
            # Схоже на "Ім'я Прізвище" замість "Прізвище Ім'я" — але
            # перевіряємо, що ім'я справді збігається з відомим, а не
            # просто зливаємо різних людей з однаковим прізвищем.
            canonical = name_index[second_word]
            canon_parts = canonical.split()
            canon_first = canon_parts[1] if len(canon_parts) > 1 else ""
            if first_word == canon_first:
                return canonical
            if canonical_names:
                import difflib
                if difflib.SequenceMatcher(None, first_word, canon_first).ratio() >= fuzzy_cutoff:
                    return canonical

    candidate = name.strip()

    if canonical_names:
        import difflib
        best = difflib.get_close_matches(candidate, canonical_names, n=1, cutoff=fuzzy_cutoff)
        if best:
            return best[0]
        if len(parts) == 2:
            reversed_candidate = f"{parts[1]} {parts[0]}"
            best_rev = difflib.get_close_matches(reversed_candidate, canonical_names, n=1, cutoff=fuzzy_cutoff)
            if best_rev:
                return best_rev[0]

    return candidate




def extract_podium_tpids(stats):
    """Повертає {1: tpid, 2: tpid, 3: tpid}. Спершу пробує поле rank (працює
    для турнірів на вибування). Якщо rank ніде не проставлено (типово для
    групових/round-robin турнірів — часто трапляється в командних форматах),
    інферимо місця самі: за перемогами в матчах, потім у сетах, потім у легах."""
    podium = {}
    for tpid, stat in stats.items():
        rank = stat.get("rank")
        if rank in (1, 2, 3):
            podium[rank] = tpid
    if podium:
        return podium

    ranked = sorted(
        stats.items(),
        key=lambda kv: (kv[1].get("winMatch", 0), kv[1].get("winSet", 0), kv[1].get("winLeg", 0)),
        reverse=True,
    )
    return {i + 1: tpid for i, (tpid, _) in enumerate(ranked[:3])}


def split_medals_by_gender(nakka_data, name_index, canonical_names, known_women, default_gender):
    """Визначає стать КОЖНОГО призера окремо за відомим списком імен, а не
    за тим, з якої колонки (Men/Women) прийшло посилання. Це критично для
    Мікст/Пар/Команд, де Nakka часто веде ОДНУ спільну сітку на обидві
    статі — раніше такі турніри показували лише "чоловічих" призерів,
    бо посилання лежало в колонці Men."""
    if not nakka_data:
        return None, None
    entries, stats = nakka_data["entries"], nakka_data["stats"]
    podium_tpids = extract_podium_tpids(stats)
    podium_men, podium_women = {}, {}
    for rank, tpid in podium_tpids.items():
        name = resolve_name(entries.get(tpid, tpid), name_index, canonical_names)
        if name in known_women:
            podium_women[rank] = name
        elif default_gender == "women":
            podium_women[rank] = name
        else:
            podium_men[rank] = name

    def to_medal(podium):
        if not podium:
            return None
        return {"gold": podium.get(1), "silver": podium.get(2), "bronze": [podium[3]] if podium.get(3) else []}

    return to_medal(podium_men), to_medal(podium_women)


def enrich_with_nakka(tournaments, name_index, canonical_names=None, known_women=None):
    """Проходить по всіх турнірах, тягне Nakka tdid з посилань, і додає
    t['nakkaMedals'] / t['nakkaMedalsWomen'] (надійні призери напряму з API)
    плюс повертає плаский список усіх гравець-турнір записів статистики
    (сировина для секції "Рекорди" — топ по середньому, 180-ках тощо)."""
    cache = {}
    player_records = []
    fetched = 0
    known_women = known_women or set()

    for t in tournaments:
        links = t.get("links", {})

        def link_tdid(*keys):
            for k in keys:
                link = links.get(k)
                if link and link.get("type") == "nakka":
                    tdid = extract_tdid(link["url"])
                    if tdid:
                        return tdid
            return None

        men_tdid = link_tdid("men", "menAvg")
        women_tdid = link_tdid("women", "womenAvg")
        other_tdid = None
        if not men_tdid and not women_tdid:
            other_tdid = link_tdid("tournament")

        t["nakkaMedals"] = None
        t["nakkaMedalsWomen"] = None

        for tdid, default_gender in (
            (men_tdid, "men"),
            (women_tdid, "women"),
            (other_tdid, "men"),
        ):
            if not tdid:
                continue
            data = fetch_nakka_tournament(tdid, cache)
            fetched += 1
            if not data:
                continue

            medals_men, medals_women = split_medals_by_gender(
                data, name_index, canonical_names, known_women, default_gender
            )
            if medals_men and not t["nakkaMedals"]:
                t["nakkaMedals"] = medals_men
            if medals_women and not t["nakkaMedalsWomen"]:
                t["nakkaMedalsWomen"] = medals_women

            for tpid, stat in data["stats"].items():
                avg = player_avg(stat)
                if avg is None:
                    continue  # гравець не зіграв жодного дротика — пропускаємо
                name = resolve_name(data["entries"].get(tpid, tpid), name_index, canonical_names)
                gender = "women" if name in known_women else default_gender
                player_records.append({
                    "name": name,
                    "gender": gender,
                    "isUDL": t["isUDL"],
                    "date": t["date"],
                    "tournament": t["name"],
                    "city": t["city"],
                    "avg": avg,
                    "ton80": stat.get("ton80", 0),
                    "highOutCount": stat.get("highOutCount", 0),
                    "highOut": stat.get("highOut", 0),
                    "rank": stat.get("rank", 0),
                    "match": stat.get("match", 0),
                    "winMatch": stat.get("winMatch", 0),
                })


    print(f"  Fetched {fetched} Nakka tournament records ({len(cache)} unique tdid, "
          f"{sum(1 for v in cache.values() if v)} succeeded)")
    return player_records


# ---------------------------------------------------------------------------
# Для турнірів до появи Nakka в Україні (немає посилання-сітки) єдине
# джерело призерів — протокол (Google Docs). Повний текст документа нам не
# потрібен: Google сам генерує короткий опис (og:description) із перших
# рядків файлу, а туди зазвичай виносять саме підсумкову таблицю місць,
# на кшталт "1 Усик Артем (Київ)2 Мамика Олександр (Кривий Ріг)3 ...".
# ---------------------------------------------------------------------------
import html as _html_module

PROTOCOL_ENTRY_RE = re.compile(r"(\d+)\s*([^\d()]+?)\s*\(([^)]+)\)")


def parse_protocol_description(desc):
    """Читає рядки "1 Ім'я (Місто)2 Ім'я (Місто)..." з опису документа.
    Зупиняється, як тільки порядок рангів переривається (наприклад "5-8") —
    це означає, що далі йде групове місце, а не персональний подіум."""
    podium = []
    expected = 1
    for rank_str, name, _city in PROTOCOL_ENTRY_RE.findall(desc):
        if rank_str != str(expected):
            break
        podium.append(name.strip())
        expected += 1
        if expected > 4:  # більше нам і не треба (золото/срібло/2×бронза)
            break
    return podium


def fetch_protocol_podium(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (vfd-darts-sync)"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"    protocol fetch failed for {url}: {e}")
        return None

    m = re.search(r'<meta property="og:description" content="([^"]*)"', content)
    if not m:
        return None
    desc = _html_module.unescape(m.group(1))
    podium = parse_protocol_description(desc)
    return podium or None


def fill_protocol_medals(tournaments):
    """Для турнірів, де досі немає жодних призерів (ні з Nakka, ні з таблиці
    Google Sheets), пробує дістати їх з протоколу (Google Docs), якщо він
    прив'язаний як посилання на цей турнір."""
    filled = 0
    cache = {}
    for t in tournaments:
        if t.get("nakkaMedals"):
            continue  # вже є призери з Nakka — не чіпаємо

        protocol_url = None
        for key in ("tournament", "men", "menAvg", "women", "womenAvg"):
            link = t.get("links", {}).get(key)
            if link and link.get("type") == "protocol_doc":
                protocol_url = link["url"]
                break
        if not protocol_url:
            continue

        if protocol_url not in cache:
            cache[protocol_url] = fetch_protocol_podium(protocol_url)
            time.sleep(0.05)
        podium = cache[protocol_url]
        if not podium:
            continue

        t["medals"] = {
            "gold": podium[0] if len(podium) > 0 else None,
            "silver": podium[1] if len(podium) > 1 else None,
            "bronze": [n for n in podium[2:] if n],
        }
        filled += 1
    return filled


# ---------------------------------------------------------------------------
# YouTube — останні відео каналу федерації через публічну RSS-стрічку
# (не потребує API-ключа; сторінка каналу/videos блокує ботів, а цей
# фід — ні).
# ---------------------------------------------------------------------------
def fetch_latest_youtube_videos(count=4):
    import xml.etree.ElementTree as ET

    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL_ID}"
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "yt": "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/",
    }
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (vfd-darts-sync)"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            xml_text = resp.read().decode("utf-8")
        root = ET.fromstring(xml_text)
        videos = []
        for entry in root.findall("atom:entry", ns)[:count]:
            video_id_el = entry.find("yt:videoId", ns)
            title_el = entry.find("atom:title", ns)
            published_el = entry.find("atom:published", ns)
            thumb_el = entry.find(".//media:thumbnail", ns)
            if video_id_el is None or title_el is None:
                continue
            video_id = video_id_el.text
            videos.append({
                "id": video_id,
                "title": title_el.text,
                "published": (published_el.text or "")[:10] if published_el is not None else "",
                "thumbnail": thumb_el.get("url") if thumb_el is not None
                             else f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
            })
        return videos
    except Exception as e:
        print(f"  YouTube RSS fetch failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Telegram — новини від інформаційного партнера ВФД (Fullbull). Канал пише
# і про світовий дартс, тому фільтруємо: лишаємо тільки пости, де є явний
# український сигнал (слово "україн", ВФД/УДЛ/ЗУДЛ, наше місто-господар,
# або ім'я гравця з нашої ж бази).
# ---------------------------------------------------------------------------
UKRAINE_SIGNAL_WORDS = ["україн", "вфд", " удл", "зудл", "чемпіонат україни", "кубок україни"]


def is_ukraine_relevant(text, known_names, known_cities):
    t = text.lower()
    if any(w in t for w in UKRAINE_SIGNAL_WORDS):
        return True
    if any(city.lower() in t for city in known_cities):
        return True
    if any(name.lower() in t for name in known_names if len(name) > 3):
        return True
    return False


def strip_html_tags(fragment):
    text = re.sub(r"<br\s*/?>", "\n", fragment)
    text = re.sub(r"<[^>]+>", "", text)
    text = _html_module.unescape(text).strip()
    # Голі посилання не несуть змісту на карточці (Nakka/YouTube лінки в
    # тексті поста) — прибираємо їх, лишаючи чистий текст новини.
    text = re.sub(r"https?://\S+", "", text)
    # Прибираємо порожні рядки, що лишились після видалення посилань
    text = re.sub(r"\n\s*\n+", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def fetch_telegram_news(channel, known_names, known_cities, limit=6):
    url = f"https://t.me/s/{channel}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (vfd-darts-sync)"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            page = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  Telegram fetch failed: {e}")
        return []

    blocks = re.split(r'(?=<div class="tgme_widget_message_wrap)', page)
    posts = []
    for block in blocks:
        text_m = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', block, re.DOTALL)
        date_m = re.search(r'<time[^>]*datetime="([^"]+)"', block)
        link_m = re.search(r'href="(https://t\.me/[a-zA-Z0-9_]+/\d+)"', block)
        photo_m = re.search(r"tgme_widget_message_photo_wrap[^\"']*[\"'][^>]*background-image:url\('([^']+)'\)", block)
        if not text_m or not date_m:
            continue
        text = strip_html_tags(text_m.group(1))
        if not text:
            continue
        posts.append({
            "text": text[:500],
            "date": date_m.group(1)[:10],
            "url": link_m.group(1) if link_m else f"https://t.me/{channel}",
            "photo": photo_m.group(1) if photo_m else None,
        })

    posts.reverse()  # t.me/s/ віддає від найстарішого до найновішого
    filtered = [p for p in posts if is_ukraine_relevant(p["text"], known_names, known_cities)]
    return filtered[:limit]


def main():
    print("Fetching tournaments CSV...")
    t_rows = fetch_csv(TOURNAMENTS_CSV_URL)
    print(f"  {len(t_rows)} raw rows")

    print("Fetching men's prizes CSV...")
    men_rows = fetch_csv(PRIZES_MEN_CSV_URL)
    print(f"  {len(men_rows)} raw rows")

    women_rows = []
    try:
        print("Fetching women's prizes CSV...")
        women_rows = fetch_csv(PRIZES_WOMEN_CSV_URL)
        print(f"  {len(women_rows)} raw rows")
    except Exception as e:
        print(f"  WARNING: could not fetch women's sheet ({e}); continuing without it")

    tournaments = parse_tournaments(t_rows)
    print(f"Parsed {len(tournaments)} tournaments")

    men_year_data, _sheet_men_aggregate = parse_prizes(men_rows)
    print(f"Parsed men's prize data for {len(men_year_data)} years")

    women_year_data = {}
    if women_rows:
        women_year_data, _sheet_women_aggregate = parse_prizes(women_rows)
        print(f"Parsed women's prize data for {len(women_year_data)} years")

    # Рахуємо медальний залік самі з даних подіумів, а не з ручної таблиці
    # внизу аркуша (там могли закрастись помилки при ручному підбитті).
    # Це єдине призначення таблиці "Призери етапів кубків ВФД" на сайті —
    # її записи більше НЕ намагаємось зіставляти з конкретними турнірами
    # (це виявилось занадто крихким через розбіжності в нумерації/містах).
    men_aggregate = build_leaderboard_from_podiums(men_year_data)
    women_aggregate = build_leaderboard_from_podiums(women_year_data)
    print(f"Computed leaderboard ourselves: {len(men_aggregate)} men, {len(women_aggregate)} women")

    for t in tournaments:
        t["medals"] = None
        t["medalsWomen"] = None

    # Єдина база відомих імен (канонічно — "Прізвище Ім'я", українською),
    # побудована з нашого найнадійнішого джерела — самостійно порахованого
    # медального заліку. Використовується для уніфікації імен всюди далі:
    # в рейтингах сезону і в статистиці Nakka — де прізвища часто пишуть
    # по-різному (одруківки, порядок слів, українська/російська форма).
    name_sources = []
    name_sources.extend(p["name"] for p in men_aggregate)
    name_sources.extend(p["name"] for p in women_aggregate)
    name_index = build_name_index(name_sources)
    canonical_names = build_canonical_names(name_sources)
    print(f"  Built name index with {len(name_index)} known surnames, "
          f"{len(canonical_names)} canonical full names")

    print("Fetching season ratings (Кубок України, all tabs)...")
    ratings = build_ratings(RATINGS_SOURCES_PATH, name_index, canonical_names)
    print(f"Parsed {len(ratings)} rating seasons")

    print("Fetching real Nakka tournament stats (this may take a few minutes)...")
    known_women = {p["name"] for p in women_aggregate}
    nakka_player_records = enrich_with_nakka(tournaments, name_index, canonical_names, known_women)
    print(f"Collected {len(nakka_player_records)} player-tournament stat rows from Nakka")

    # Протоколи (Google Docs) для турнірів до Nakka НЕ вмикаємо автоматично:
    # більшість із них — це повний розпис матчів по раундах, а не готова
    # таблиця місць, тож автопарсинг короткого опису дає ненадійні (іноді
    # просто неправильні) результати. Функції parse_protocol_description /
    # fetch_protocol_podium / fill_protocol_medals лишаються в коді нижче —
    # повернемось до цього, коли протоколи будуть уніфіковані в один формат.
    # protocol_count = fill_protocol_medals(tournaments)

    print("Fetching latest YouTube videos...")
    youtube_videos = fetch_latest_youtube_videos(3)
    print(f"  Got {len(youtube_videos)} videos")

    print("Fetching Telegram news (Fullbull)...")
    ukr_cities = list({t["city"] for t in tournaments if t.get("city")})
    telegram_news = fetch_telegram_news(TELEGRAM_CHANNEL, canonical_names, ukr_cities, limit=6)
    print(f"  Got {len(telegram_news)} Ukraine-relevant posts")

    data = {
        "meta": {
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
            "tournamentsCount": len(tournaments),
        },
        "tournaments": tournaments,
        "leaderboard": men_aggregate,
        "leaderboardWomen": women_aggregate,
        "ratings": ratings,
        "nakkaPlayerStats": nakka_player_records,
        "youtubeVideos": youtube_videos,
        "telegramNews": telegram_news,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

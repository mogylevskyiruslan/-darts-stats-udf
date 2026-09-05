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
                for prow in podium_rows[:3]:
                    val = prow[col_idx].strip() if col_idx < len(prow) else ""
                    names.append(val or None)
                if any(names):
                    year_data[year][stage_label] = {"city": city, "podium": names}
            i = j
            continue

        i += 1

    return year_data, aggregate


def extract_stage(fmt):
    m = re.search(r"(\d+)\s*етап", fmt)
    if m:
        return m.group(1)
    if "Фінал" in fmt:
        return "FINAL"
    return None


def attach_medals(tournaments, year_data, field_name, require_exact_format=True):
    """Attach medal podium to matching tournaments for one gender.
    field_name: 'medals' (men) or 'medalsWomen' (women).
    Returns the set of (year, stage_key) pairs that were successfully matched,
    so the caller can compute what's left over for the historical section."""
    used_keys = set()
    for t in tournaments:
        t[field_name] = None
        if t["isUDL"]:
            continue
        try:
            year = int(t["date"].split(".")[-1])
        except ValueError:
            continue
        yd = year_data.get(year)
        if not yd:
            continue

        stage = extract_stage(t["format"])
        entry, used_key = None, None

        if stage == "FINAL":
            numbered = [k for k in yd if k.isdigit()]
            if numbered:
                last_key = max(numbered, key=int)
                cand = yd[last_key]
                if cand["city"] == t["city"]:
                    entry, used_key = cand, last_key
        elif stage is not None:
            cand = yd.get(stage)
            if cand and cand["city"] == t["city"]:
                entry, used_key = cand, stage
        elif (not require_exact_format or t["format"] == "501DO") and t["name"].strip() == f"ЧУ {year}":
            cand = yd.get("ЧУ")
            if cand and cand["city"] == t["city"]:
                entry, used_key = cand, "ЧУ"

        if entry:
            podium = entry["podium"]
            t[field_name] = {
                "gold": podium[0] if len(podium) > 0 else None,
                "silver": podium[1] if len(podium) > 1 else None,
                "bronze": podium[2] if len(podium) > 2 else None,
            }
            used_keys.add((year, used_key))

    return used_keys


def build_historical(men_year_data, women_year_data, used_keys_men, used_keys_women):
    """Combine leftover (not matched to a tournament row) entries from both
    gender tables into one list, tagged with gender, for the historical section."""
    historical = []
    all_years = sorted(set(list(men_year_data.keys()) + list(women_year_data.keys())), reverse=True)
    for year in all_years:
        m_year = men_year_data.get(year, {})
        w_year = women_year_data.get(year, {})
        all_keys = sorted(
            set(list(m_year.keys()) + list(w_year.keys())),
            key=lambda k: (0, int(k)) if k.isdigit() else (1, 0),
        )
        for key in all_keys:
            stage_label = "ЧУ" if key == "ЧУ" else f"{key} етап"
            m_entry = m_year.get(key)
            if m_entry and (year, key) not in used_keys_men:
                p = m_entry["podium"]
                historical.append({
                    "year": year, "gender": "men", "stageLabel": stage_label,
                    "city": m_entry["city"] or "—",
                    "gold": p[0] if len(p) > 0 else None,
                    "silver": p[1] if len(p) > 1 else None,
                    "bronze": p[2] if len(p) > 2 else None,
                })
            w_entry = w_year.get(key)
            if w_entry and (year, key) not in used_keys_women:
                p = w_entry["podium"]
                historical.append({
                    "year": year, "gender": "women", "stageLabel": stage_label,
                    "city": w_entry["city"] or "—",
                    "gold": p[0] if len(p) > 0 else None,
                    "silver": p[1] if len(p) > 1 else None,
                    "bronze": p[2] if len(p) > 2 else None,
                })
    return historical


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


def build_ratings(sources_path):
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


def resolve_name(name, name_index):
    """Якщо ім'я з Nakka — це лише одне слово (прізвище), намагається
    знайти повне ім'я в наших уже відомих джерелах. Інакше — без змін."""
    if not name:
        return name
    parts = name.strip().split()
    if len(parts) >= 2:
        return name.strip()
    full = name_index.get(parts[0]) if parts else None
    return full or name.strip()


def medals_from_nakka(nakka_data, name_index):
    """Визначає 🥇🥈🥉 напряму з поля rank статистики (1/2/3 місце)."""
    if not nakka_data:
        return None
    entries, stats = nakka_data["entries"], nakka_data["stats"]
    podium = {}
    for tpid, stat in stats.items():
        rank = stat.get("rank")
        if rank in (1, 2, 3):
            podium[rank] = resolve_name(entries.get(tpid, tpid), name_index)
    if not podium:
        return None
    return {
        "gold": podium.get(1),
        "silver": podium.get(2),
        "bronze": podium.get(3),
    }


def enrich_with_nakka(tournaments, name_index):
    """Проходить по всіх турнірах, тягне Nakka tdid з посилань, і додає
    t['nakkaMedals'] / t['nakkaMedalsWomen'] (надійні призери напряму з API)
    плюс повертає плаский список усіх гравець-турнір записів статистики
    (сировина для секції "Рекорди" — топ по середньому, 180-ках тощо)."""
    cache = {}
    player_records = []
    fetched = 0

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

        for tdid, gender, medal_field in (
            (men_tdid, "men", "nakkaMedals"),
            (women_tdid, "women", "nakkaMedalsWomen"),
            (other_tdid, "open", "nakkaMedals"),
        ):
            if not tdid:
                continue
            data = fetch_nakka_tournament(tdid, cache)
            fetched += 1
            if not data:
                continue

            t[medal_field] = medals_from_nakka(data, name_index)

            for tpid, stat in data["stats"].items():
                avg = player_avg(stat)
                if avg is None:
                    continue  # гравець не зіграв жодного дротика — пропускаємо
                player_records.append({
                    "name": resolve_name(data["entries"].get(tpid, tpid), name_index),
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

    men_year_data, men_aggregate = parse_prizes(men_rows)
    print(f"Parsed men's prize data for {len(men_year_data)} years, {len(men_aggregate)} leaderboard rows")

    women_year_data, women_aggregate = ({}, [])
    if women_rows:
        women_year_data, women_aggregate = parse_prizes(women_rows)
        print(f"Parsed women's prize data for {len(women_year_data)} years, {len(women_aggregate)} leaderboard rows")

    used_keys_men = attach_medals(tournaments, men_year_data, "medals")
    used_keys_women = attach_medals(tournaments, women_year_data, "medalsWomen")
    matched_men = sum(1 for t in tournaments if t["medals"])
    matched_women = sum(1 for t in tournaments if t["medalsWomen"])
    print(f"Matched men's medals for {matched_men} tournaments, women's for {matched_women}")

    historical = build_historical(men_year_data, women_year_data, used_keys_men, used_keys_women)
    print(f"{len(historical)} historical-only records (both genders combined)")

    print("Fetching season ratings (Кубок України, all tabs)...")
    ratings = build_ratings(RATINGS_SOURCES_PATH)
    print(f"Parsed {len(ratings)} rating seasons")

    print("Fetching real Nakka tournament stats (this may take a few minutes)...")
    name_sources = []
    name_sources.extend(p["name"] for p in men_aggregate)
    name_sources.extend(p["name"] for p in women_aggregate)
    for year_data in (men_year_data, women_year_data):
        for stages in year_data.values():
            for entry in stages.values():
                name_sources.extend(n for n in entry.get("podium", []) if n)
    name_index = build_name_index(name_sources)
    print(f"  Built name index with {len(name_index)} known surnames")

    nakka_player_records = enrich_with_nakka(tournaments, name_index)
    print(f"Collected {len(nakka_player_records)} player-tournament stat rows from Nakka")

    data = {
        "meta": {
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
            "tournamentsCount": len(tournaments),
            "historicalCount": len(historical),
        },
        "tournaments": tournaments,
        "leaderboard": men_aggregate,
        "leaderboardWomen": women_aggregate,
        "historical": historical,
        "ratings": ratings,
        "nakkaPlayerStats": nakka_player_records,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

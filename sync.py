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
import urllib.request
from datetime import datetime, timezone

TOURNAMENTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZxNlB-yHQDjWX3Y_n4GCUL_4sY5oLcLeW9rR_MI5zlm2p0YqZmHUUXw07bLw1YTiUg4Ar6bRbn_Dd/pub?output=csv&gid=0"
PRIZES_MEN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5IoUV8U550qzdDKkLxenpx2LUYMQ8Uccqf9ZdkyP7ruIqdoPt_tX-hQWKhQOnTGc6HG6jiPQmQEuA/pub?output=csv&gid=0"
PRIZES_WOMEN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5IoUV8U550qzdDKkLxenpx2LUYMQ8Uccqf9ZdkyP7ruIqdoPt_tX-hQWKhQOnTGc6HG6jiPQmQEuA/pub?output=csv&gid=109502045"

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
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

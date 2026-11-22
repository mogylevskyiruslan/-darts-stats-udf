#!/usr/bin/env python3
"""Синхронізація власників тур-карти з Google-таблиці в Supabase (таблиця members).

Читає CSV таблиці власників тур-карти і для кожного сезону, що має колонку
«№ посвідчення YYYY», записує пари (email, season) -> «Прізвище Ім'я».
Телефони й інші колонки НЕ імпортуються. У логах не друкуються ні імена, ні email (лише кількості).

Змінні середовища (GitHub Secrets):
  MEMBERS_CSV_URL       посилання на CSV-експорт таблиці
  SUPABASE_URL          https://<project>.supabase.co
  SUPABASE_SERVICE_KEY  service_role / secret ключ (ніколи не публікувати!)

Локально:  python3 sync_members.py --file members.csv --dry-run
"""
import csv, io, json, os, re, sys, urllib.request, urllib.parse, urllib.error

EMAIL_RE = re.compile(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}')


def read_source(args):
    if '--file' in args:
        return open(args[args.index('--file') + 1], encoding='utf-8-sig').read()
    url = os.environ.get('MEMBERS_CSV_URL', '').strip()
    if not url:
        sys.exit('MEMBERS_CSV_URL не задано')
    req = urllib.request.Request(url, headers={'User-Agent': 'udf-members-sync'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8-sig')


def parse(text):
    first = text.split('\n', 1)[0]
    delim = '\t' if first.count('\t') > first.count(',') else ','
    rows = list(csv.reader(io.StringIO(text), delimiter=delim))
    if not rows:
        return {}
    head = [h.strip().lower() for h in rows[0]]
    year_cols = {}
    for i, h in enumerate(head):
        m = re.search(r'№\s*посвідчення\s*(\d{4})', h)
        if m:
            year_cols[i] = int(m.group(1))

    def col(*names):
        for n in names:
            if n in head:
                return head.index(n)
        return None
    c_first, c_last, c_mail = col("ім'я", 'імя', 'ім’я'), col('прізвище'), col('мейл', 'email', 'e-mail', 'пошта')
    if c_first is None or c_last is None or c_mail is None or not year_cols:
        sys.exit('Не знайдено потрібних колонок (Ім\'я, Прізвище, мейл, № посвідчення YYYY)')
    out = {}  # (email, season) -> name
    for r in rows[1:]:
        if len(r) <= max(c_first, c_last, c_mail):
            continue
        name = (r[c_last].strip() + ' ' + r[c_first].strip()).strip()
        emails = [e.lower() for e in EMAIL_RE.findall(r[c_mail])]
        if not name or not emails:
            continue
        for ci, season in year_cols.items():
            if ci < len(r) and r[ci].strip():
                for e in emails:
                    out[(e, season)] = name
    return out


class Sb:
    def __init__(self, url, key):
        self.base = url.rstrip('/') + '/rest/v1/'
        self.h = {'apikey': key, 'Content-Type': 'application/json'}
        if key.startswith('eyJ'):
            self.h['Authorization'] = 'Bearer ' + key

    def call(self, method, path, body=None, extra=None):
        h = dict(self.h); h.update(extra or {})
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                t = r.read().decode()
                return json.loads(t) if t else None
        except urllib.error.HTTPError as e:
            sys.exit('Supabase %s %s -> HTTP %s: %s' % (method, path.split('?')[0], e.code, e.read().decode()[:300]))


def main():
    args = sys.argv[1:]
    want = parse(read_source(args))
    seasons = sorted({s for (_, s) in want})
    print('У таблиці: %d записів (email, сезон); сезони: %s' % (len(want), seasons))
    if not want:
        sys.exit('Порожній результат — нічого не змінюю')
    if '--dry-run' in args:
        for s in seasons:
            print('  сезон %d: %d' % (s, sum(1 for k in want if k[1] == s)))
        return
    url, key = os.environ.get('SUPABASE_URL', '').strip(), os.environ.get('SUPABASE_SERVICE_KEY', '').strip()
    if not url or not key:
        sys.exit('SUPABASE_URL / SUPABASE_SERVICE_KEY не задано')
    sb = Sb(url, key)
    have = sb.call('GET', 'members?select=email,season&limit=100000') or []
    have_keys = {(r['email'].lower(), r['season']) for r in have}
    # запобіжник: не видаляємо більше половини наявних записів за один запуск
    stale = [k for k in have_keys if k[1] in seasons and k not in want]
    if have_keys and len(stale) > max(5, len(have_keys) // 2):
        sys.exit('Запобіжник: до видалення %d із %d записів — схоже на помилку джерела. Нічого не змінено.' % (len(stale), len(have_keys)))
    rows = [{'email': e, 'season': s, 'player_name': n} for (e, s), n in want.items()]
    for i in range(0, len(rows), 200):
        sb.call('POST', 'members?on_conflict=email,season', rows[i:i + 200], {'Prefer': 'resolution=merge-duplicates,return=minimal'})
    for e, s in stale:
        sb.call('DELETE', 'members?email=eq.%s&season=eq.%d' % (urllib.parse.quote(e, safe=''), s), None, {'Prefer': 'return=minimal'})
    print('Готово: записано/оновлено %d, видалено застарілих %d' % (len(rows), len(stale)))


if __name__ == '__main__':
    main()

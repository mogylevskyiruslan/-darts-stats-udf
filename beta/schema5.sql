-- ВФД · «Мій простір» · Етап 5 · профіль, нові вправи, розвиток. Запустити ОДИН раз.

-- 1) Профіль: додаткові поля (видно лише власнику)
alter table public.profiles add column if not exists nickname   text;
alter table public.profiles add column if not exists region     text;
alter table public.profiles add column if not exists club       text;
alter table public.profiles add column if not exists hand       text;
alter table public.profiles add column if not exists darts_info text;
alter table public.profiles add column if not exists fav_format text;
alter table public.profiles add column if not exists season_goal text;
alter table public.profiles add column if not exists bio        text check (bio is null or char_length(bio) <= 600);
alter table public.profiles add column if not exists photo      text check (photo is null or char_length(photo) <= 200000);
alter table public.profiles add column if not exists is_public  boolean not null default false;
grant select, insert, update on public.profiles to authenticated;

-- 2) Нові типи вправ у drills
alter table public.drills drop constraint if exists drills_game_check;
alter table public.drills add constraint drills_game_check
  check (game in ('p171','m60','sector','dbl','trp','score','cricket'));

-- 3) Розвиток: цілі, план, рефлексії (універсальна таблиця)
create table if not exists public.dev (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id  text not null,
  kind       text not null check (kind in ('goal','plan','reflect')),
  data       jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists dev_user_idx on public.dev (user_id, kind, created_at desc);
alter table public.dev enable row level security;
drop policy if exists dev_select on public.dev;
drop policy if exists dev_insert on public.dev;
drop policy if exists dev_update on public.dev;
drop policy if exists dev_delete on public.dev;
create policy dev_select on public.dev for select using (user_id = auth.uid());
create policy dev_insert on public.dev for insert with check (user_id = auth.uid() and public.has_card());
create policy dev_update on public.dev for update using (user_id = auth.uid() and public.has_card()) with check (user_id = auth.uid() and public.has_card());
create policy dev_delete on public.dev for delete using (user_id = auth.uid() and public.has_card());
revoke all on public.dev from anon;
grant select, insert, update, delete on public.dev to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 4) Повне видалення даних тепер включає і нову таблицю
create or replace function public.delete_my_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.dev          where user_id = auth.uid();
  delete from public.drills       where user_id = auth.uid();
  delete from public.legs         where user_id = auth.uid();
  delete from public.checkouts    where user_id = auth.uid();
  delete from public.local_events where user_id = auth.uid();
  delete from public.skills       where user_id = auth.uid();
  delete from public.profiles     where user_id = auth.uid();
end $$;

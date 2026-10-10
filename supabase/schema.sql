-- Halloween Pychowice: execute once in Supabase SQL Editor.
-- Public visitors see only approved submissions. Anonymous visitors may submit for review.
create extension if not exists pgcrypto;
create table if not exists public.halloween_places (
 id uuid primary key default gen_random_uuid(),
 address text not null check (char_length(address) between 3 and 180),
 lat double precision not null check (lat between 50.015 and 50.06),
 lon double precision not null check (lon between 19.85 and 19.94),
 hours text check (char_length(hours) <= 80),
 note text check (char_length(note) <= 240),
 decor boolean not null default false,
 candy boolean not null default false,
 no_halloween boolean not null default false,
 owner_consent boolean not null default false check (owner_consent = true),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 constraint valid_participation check (
   (no_halloween and not candy and not decor)
   or (not no_halloween and (candy or decor))
 )
);
alter table public.halloween_places enable row level security;
revoke all on public.halloween_places from anon, authenticated;
grant select (id,address,lat,lon,hours,note,decor,candy,no_halloween,created_at) on public.halloween_places to anon,authenticated;
grant insert (address,lat,lon,hours,note,decor,candy,no_halloween,owner_consent) on public.halloween_places to anon,authenticated;
drop policy if exists "Visitors read approved places" on public.halloween_places;
create policy "Visitors read approved places" on public.halloween_places
 for select to anon,authenticated using (status = 'approved');
drop policy if exists "Visitors submit pending places" on public.halloween_places;
create policy "Visitors submit pending places" on public.halloween_places
 for insert to anon,authenticated with check (status = 'pending' and owner_consent = true);
-- Review pending entries in Supabase Table Editor using the project owner account.
-- Never place the service_role or secret API key in browser code.
-- For public launch add CAPTCHA/rate-limiting and a verified owner-removal process.

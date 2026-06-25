-- ============================================================
--  Nikkah Invitation — Supabase schema
--  Run this once in the Supabase SQL Editor.
--  Security model:
--    * RLS is ON and the public (anon) role has NO table policies,
--      so the guest list can never be read directly from the browser.
--    * Guests interact only through two SECURITY DEFINER functions
--      that are scoped by their unique token.
--    * The admin (you) gets full access, but only when signed in
--      with the allow-listed email.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- table ----------
create table if not exists public.guests (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null default encode(gen_random_bytes(8), 'hex'),
  display_name  text not null,
  num_invited   int  not null default 1  check (num_invited  >= 0),
  rsvp_status   text not null default 'pending'
                       check (rsvp_status in ('pending','accepted','declined')),
  num_confirmed int  not null default 0  check (num_confirmed >= 0),
  note          text,
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint confirmed_not_over_invited check (num_confirmed <= num_invited)
);

-- ---------- row level security ----------
alter table public.guests enable row level security;

-- Admin (only the allow-listed email) gets full access.
drop policy if exists "admin full access" on public.guests;
create policy "admin full access" on public.guests
  for all
  to authenticated
  using      (auth.jwt() ->> 'email' = 'adilkapadia0@gmail.com')
  with check (auth.jwt() ->> 'email' = 'adilkapadia0@gmail.com');

-- NOTE: no policy for the anon role => anon cannot select/insert/update/delete.

-- ============================================================
--  Public RPCs — the only way a guest can touch their row.
-- ============================================================

-- Read one invitation by its token.
create or replace function public.get_invitation(p_token text)
returns table (
  display_name  text,
  num_invited   int,
  rsvp_status   text,
  num_confirmed int,
  note          text
)
language sql
security definer
set search_path = public
as $$
  select display_name, num_invited, rsvp_status, num_confirmed, note
  from public.guests
  where token = p_token
  limit 1;
$$;

-- Submit / update an RSVP. Validates the seat count server-side.
create or replace function public.submit_rsvp(
  p_token     text,
  p_status    text,
  p_confirmed int  default 1,
  p_note      text default null
)
returns table (
  display_name  text,
  num_invited   int,
  rsvp_status   text,
  num_confirmed int,
  note          text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests;
begin
  select * into g from public.guests where token = p_token;
  if not found then
    raise exception 'Invitation not found';
  end if;

  if p_status not in ('accepted','declined') then
    raise exception 'Invalid status';
  end if;

  if p_status = 'declined' then
    p_confirmed := 0;
  else
    p_confirmed := coalesce(p_confirmed, 1);
    if p_confirmed < 1 then
      p_confirmed := 1;
    end if;
    if p_confirmed > g.num_invited then
      raise exception 'Confirmed (%) exceeds the % seat(s) invited', p_confirmed, g.num_invited;
    end if;
  end if;

  update public.guests
     set rsvp_status   = p_status,
         num_confirmed = p_confirmed,
         note          = coalesce(nullif(p_note, ''), note),
         responded_at  = now()
   where token = p_token;

  return query
    select display_name, num_invited, rsvp_status, num_confirmed, note
    from public.guests where token = p_token;
end;
$$;

-- Only these two functions are callable by the public.
revoke all on function public.get_invitation(text)               from public;
revoke all on function public.submit_rsvp(text, text, int, text) from public;
grant execute on function public.get_invitation(text)               to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, int, text) to anon, authenticated;

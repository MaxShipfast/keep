-- Keep accounts: cloud backup of the app state, a profile for lifecycle emails, and in-app
-- account deletion (App Review guideline 5.1.1(v)).

-- The whole app state (plan, meals, lifts, weigh-ins) as one JSONB document per user.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "own row" on public.user_state;
create policy "own row" on public.user_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- One row per account for lifecycle email: who to email, whether they may be marketed to, and where
-- they are in the funnel. Access is never decided here (the App Store receipt decides that), so
-- the client may write these fields.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  first_name text,
  marketing_opt_in boolean not null default false,
  signup_source text check (signup_source in ('save_plan', 'after_purchase', 'settings', 'welcome')),
  country text,
  paywall_seen_at timestamptz,
  pro boolean not null default false,
  pro_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Users edit their own row, but not its identity or bookkeeping columns.
revoke update on public.profiles from authenticated;
grant update (first_name, marketing_opt_in, signup_source, country, paywall_seen_at, pro, pro_updated_at, updated_at)
  on public.profiles to authenticated;

-- Every new auth user gets a profile, so the email is captured even if the app never writes one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, first_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'first_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Apple's relay address or a changed email must reach the profile too.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email, updated_at = now() where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- In-app account deletion. Removing the auth user cascades to user_state and profiles.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Praxzis · run this in the Supabase SQL editor (one pass is enough).
-- After it runs: Authentication → Providers
--   • Email: enable. For development, turn OFF "Confirm email".
--   • Google: enable and paste your Web client ID + secret.
--   • Apple: enable and paste Services ID / secret / key.
-- Authentication → URL Configuration → Redirect URLs, add:
--   praxzis://auth/callback
--   praxzis://**
--   http://localhost:8081/auth/callback
--   http://localhost:8090/auth/callback
--   http://127.0.0.1:8081/auth/callback
-- Apple provider Client IDs must include:
--   host.exp.Exponent          (Expo Go)
--   com.praxzis.app            (this app)
-- Google provider uses the Web client ID + secret already configured in
-- Supabase. Google Cloud authorized redirect stays the Supabase callback
-- (https://<project-ref>.supabase.co/auth/v1/callback). Do not add
-- praxzis://auth/callback to Google Cloud.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Reader',
  email text,
  provider text not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notebooks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.notebooks enable row level security;

drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile write" on public.profiles;
drop policy if exists "own notebook read" on public.notebooks;
drop policy if exists "own notebook write" on public.notebooks;

create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile write" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own notebook read" on public.notebooks
  for select using (auth.uid() = user_id);
create policy "own notebook write" on public.notebooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.notebooks to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Reader'),
    new.email,
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  )
  on conflict (id) do update
    set email = excluded.email,
        provider = excluded.provider,
        updated_at = now();

  insert into public.notebooks (user_id, payload)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- House development account. Always allowed in the app as well.
-- Email: praxzisapp@gmail.com
-- Password: BillionDollars2026@10
do $$
declare
  uid uuid := '11111111-1111-4111-8111-111111111111';
begin
  if not exists (select 1 from auth.users where email = 'praxzisapp@gmail.com') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      'praxzisapp@gmail.com',
      crypt('BillionDollars2026@10', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Praxzis","full_name":"Praxzis"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      uid,
      uid::text,
      jsonb_build_object('sub', uid::text, 'email', 'praxzisapp@gmail.com'),
      'email',
      now(),
      now(),
      now()
    );
  end if;
end;
$$;

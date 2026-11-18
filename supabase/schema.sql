create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.recipes (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

create table if not exists public.shopping_items (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

create table if not exists public.shopping_sections (
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, name)
);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.create_household(household_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  created_household public.households;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a household.';
  end if;

  insert into public.households (name)
  values (trim(household_name))
  returning * into created_household;

  insert into public.household_members (household_id, user_id)
  values (created_household.id, auth.uid());

  return created_household;
end;
$$;

create or replace function public.join_household(household_invite_code text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  joined_household public.households;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a household.';
  end if;

  select *
  into joined_household
  from public.households
  where invite_code = upper(trim(household_invite_code));

  if joined_household.id is null then
    raise exception 'That household invite code was not found.';
  end if;

  insert into public.household_members (household_id, user_id)
  values (joined_household.id, auth.uid())
  on conflict do nothing;

  return joined_household;
end;
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.shopping_items enable row level security;
alter table public.shopping_sections enable row level security;

drop policy if exists "Members can view their households" on public.households;
create policy "Members can view their households"
on public.households for select
to authenticated
using (public.is_household_member(id));

drop policy if exists "Members can view household membership" on public.household_members;
create policy "Members can view household membership"
on public.household_members for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Members can manage recipes" on public.recipes;
create policy "Members can manage recipes"
on public.recipes for all
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "Members can manage shopping items" on public.shopping_items;
create policy "Members can manage shopping items"
on public.shopping_items for all
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "Members can manage shopping sections" on public.shopping_sections;
create policy "Members can manage shopping sections"
on public.shopping_sections for all
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;

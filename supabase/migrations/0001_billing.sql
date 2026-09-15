-- ---------------------------------------------------------------------------
-- TypeMon accounts and Plus.
--
-- What is real and server-side: who has which plan, how many polishes they
-- have used this month, and every order. A client cannot grant itself a plan
-- or spend past its allowance — every write goes through a security-definer
-- function below, and the tables only grant SELECT to their owner.
--
-- What is not yet real: the money. Orders carry `provider` so a demo
-- activation can never be mistaken for a paid one, and the QPay integration
-- only has to fill `provider_ref` and call activate_plan from its callback.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type public.plan_tier as enum ('free', 'plus');
  end if;
  if not exists (select 1 from pg_type where typname = 'plan_status') then
    create type public.plan_status as enum ('free', 'active', 'expired');
  end if;
end $$;

-- One row per person. No row means free.
create table if not exists public.subscriptions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  tier       public.plan_tier   not null default 'free',
  status     public.plan_status not null default 'free',
  plan_code  text check (plan_code in ('monthly', 'annual')),
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_period_idx on public.subscriptions (status, period_end);

alter table public.subscriptions enable row level security;
drop policy if exists "own subscription select" on public.subscriptions;
create policy "own subscription select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Monthly usage, one row per person per month per meter.
create table if not exists public.usage_counters (
  user_id      uuid not null references auth.users (id) on delete cascade,
  meter        text not null check (meter in ('polish')),
  period_start date not null,
  used         integer not null default 0 check (used >= 0),
  primary key (user_id, meter, period_start)
);

alter table public.usage_counters enable row level security;
drop policy if exists "own counters select" on public.usage_counters;
create policy "own counters select" on public.usage_counters
  for select using (auth.uid() = user_id);

-- Orders. Real in shape, demo in effect until QPay is wired in.
create table if not exists public.payment_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  plan_code    text not null check (plan_code in ('monthly', 'annual')),
  amount_mnt   integer not null check (amount_mnt >= 0),
  provider     text not null default 'demo' check (provider in ('demo', 'qpay')),
  -- The provider's own id; unique so a repeated callback cannot extend twice.
  provider_ref text unique,
  status       text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed')),
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  expires_at   timestamptz not null default now() + interval '15 minutes'
);

create index if not exists payment_orders_user_idx on public.payment_orders (user_id, created_at desc);

alter table public.payment_orders enable row level security;
drop policy if exists "own orders select" on public.payment_orders;
create policy "own orders select" on public.payment_orders
  for select using (auth.uid() = user_id);

-- Every model call, append-only, so cost per account is a number and not a
-- guess. Written by the server on the caller's behalf.
create table if not exists public.ai_usage (
  id            bigserial primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  route         text not null,
  model         text not null default '',
  prompt_tokens integer,
  output_tokens integer,
  latency_ms    integer,
  ok            boolean not null default true,
  error_code    text,
  created_at    timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;
drop policy if exists "own usage select" on public.ai_usage;
drop policy if exists "own usage insert" on public.ai_usage;
create policy "own usage select" on public.ai_usage
  for select using (auth.uid() = user_id);
create policy "own usage insert" on public.ai_usage
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Entitlement, resolved on read. A lapsed period downgrades by itself; nothing
-- is deleted when a plan ends.
-- ---------------------------------------------------------------------------
create or replace function public.my_entitlement()
returns table (tier text, status text, plan_code text, period_end timestamptz)
language sql
stable
as $$
  select
    case when s.status = 'active' and s.period_end > now() then 'plus' else 'free' end,
    case
      when s.status = 'active' and s.period_end > now() then 'active'
      when s.status = 'active' then 'expired'
      else 'free'
    end,
    s.plan_code,
    s.period_end
  from public.subscriptions s
  where s.user_id = auth.uid()
  union all
  select 'free', 'free', null, null
  where not exists (select 1 from public.subscriptions where user_id = auth.uid())
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Activating a paid period. Idempotent on the order: a retried callback
-- extends the plan once.
-- ---------------------------------------------------------------------------
create or replace function public.activate_plan(order_id uuid)
returns table (activated boolean, reason text, period_end timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  me       uuid := auth.uid();
  ord      public.payment_orders%rowtype;
  current  public.subscriptions%rowtype;
  starts   timestamptz;
  duration interval;
begin
  select * into ord from public.payment_orders where id = order_id and user_id = me;
  if not found then
    return query select false, 'order_not_found', null::timestamptz;
    return;
  end if;

  if ord.status = 'paid' then
    select * into current from public.subscriptions where user_id = me;
    return query select true, 'already_paid', current.period_end;
    return;
  end if;

  if ord.expires_at < now() then
    update public.payment_orders set status = 'expired' where id = ord.id;
    return query select false, 'expired', null::timestamptz;
    return;
  end if;

  duration := case ord.plan_code when 'annual' then interval '365 days' else interval '30 days' end;

  select * into current from public.subscriptions where user_id = me;
  -- Buying while a plan still runs extends from its end, not from today.
  starts := greatest(now(), coalesce(current.period_end, now()));

  insert into public.subscriptions (user_id, tier, status, plan_code, period_end, updated_at)
  values (me, 'plus', 'active', ord.plan_code, starts + duration, now())
  on conflict (user_id) do update
    set tier = 'plus', status = 'active', plan_code = ord.plan_code,
        period_end = starts + duration, updated_at = now();

  update public.payment_orders set status = 'paid', paid_at = now() where id = ord.id;

  return query select true, 'activated', starts + duration;
end $$;

-- ---------------------------------------------------------------------------
-- Quota. Check and spend in one statement; returns the state after the spend.
-- ---------------------------------------------------------------------------
create or replace function public.spend_quota(meter_name text, allowance int, amount int default 1)
returns table (allowed boolean, used int, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  me       uuid := auth.uid();
  period   date := date_trunc('month', now())::date;
  new_used integer;
begin
  if me is null then
    return query select false, 0, 0;
    return;
  end if;

  if allowance = 0 and amount > 0 then
    return query select false, 0, 0;
    return;
  end if;

  if allowance < 0 then
    insert into public.usage_counters (user_id, meter, period_start, used)
    values (me, meter_name, period, amount)
    on conflict (user_id, meter, period_start)
      do update set used = greatest(0, public.usage_counters.used + amount)
    returning used into new_used;
    return query select true, new_used, -1;
    return;
  end if;

  insert into public.usage_counters (user_id, meter, period_start, used)
  values (me, meter_name, period, greatest(0, amount))
  on conflict (user_id, meter, period_start)
    do update set used = greatest(0, public.usage_counters.used + amount)
    where public.usage_counters.used + amount <= allowance
  returning used into new_used;

  if new_used is null then
    select coalesce(u.used, allowance) into new_used
      from public.usage_counters u
     where u.user_id = me and u.meter = meter_name and u.period_start = period;
    return query select false, coalesce(new_used, allowance), 0;
    return;
  end if;

  return query select true, new_used, allowance - new_used;
end $$;

-- This month's usage per meter.
create or replace function public.my_usage()
returns table (meter text, used integer)
language sql
stable
as $$
  select u.meter, u.used
  from public.usage_counters u
  where u.user_id = auth.uid()
    and u.period_start = date_trunc('month', now())::date;
$$;

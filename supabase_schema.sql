-- ── Businesses ──────────────────────────────────────────────
create table if not exists businesses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  api_key    text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- ── Users ────────────────────────────────────────────────────
create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  phone_or_email text unique not null,
  total_points   int not null default 0,
  created_at     timestamptz default now()
);

-- ── Items ────────────────────────────────────────────────────
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete set null,
  name        text not null,
  category    text,
  created_at  timestamptz default now()
);

-- ── Reviews ──────────────────────────────────────────────────
create table if not exists reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  item_id       uuid references items(id) on delete set null,
  item_name     text,                    -- name from QR code, used when item_id is null
  text          text not null,
  stars         smallint check (stars between 1 and 5),
  photo_url     text,
  score         smallint check (score between 0 and 100),
  points_earned int not null default 0,
  created_at    timestamptz default now()
);

-- Migration if reviews table already exists without item_name:
alter table reviews add column if not exists item_name text;

-- Rate-limit: один отзыв на пару (user, item)
create unique index if not exists reviews_user_item_unique
  on reviews (user_id, item_id)
  where item_id is not null;

-- ── Points log ───────────────────────────────────────────────
create table if not exists points_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  review_id  uuid references reviews(id) on delete set null,
  amount     int not null,
  created_at timestamptz default now()
);

-- ── RPC: increment_points ─────────────────────────────────────
create or replace function increment_points(user_id_arg uuid, amount_arg int)
returns void language sql as $$
  update users
  set total_points = total_points + amount_arg
  where id = user_id_arg;
$$;

-- ── Row Level Security (открыть для сервисного ключа) ─────────
alter table businesses enable row level security;
alter table users       enable row level security;
alter table items       enable row level security;
alter table reviews     enable row level security;
alter table points_log  enable row level security;

-- Сервисный ключ (SUPABASE_KEY = service_role) обходит RLS автоматически.
-- Для публичного anon-ключа добавь политики при необходимости.

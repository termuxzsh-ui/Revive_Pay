alter table public.users
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text unique,
  add column stripe_subscription_status text not null default 'inactive'
    check (
      stripe_subscription_status in (
        'inactive',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
      )
    );

create table public.stripe_connections (
  user_id uuid primary key references public.users (id) on delete cascade,
  stripe_account_id text not null unique,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  access_token_tag text not null,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  refresh_token_tag text,
  scope text not null,
  livemode boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_connections enable row level security;
revoke all on table public.stripe_connections from anon, authenticated;
grant all on table public.stripe_connections to service_role;

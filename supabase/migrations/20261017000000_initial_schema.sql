create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  notification_email text,
  stripe_account_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.failed_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  stripe_invoice_id text not null,
  customer_email text,
  customer_name text,
  amount_due bigint not null check (amount_due >= 0),
  currency text not null,
  attempt_count integer not null default 1 check (attempt_count >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'recovered', 'failed')),
  hosted_invoice_url text,
  created_at timestamptz not null default now(),
  unique (user_id, stripe_invoice_id)
);

create index failed_invoices_user_created_at_idx
  on public.failed_invoices (user_id, created_at desc);
create index failed_invoices_user_status_idx
  on public.failed_invoices (user_id, status);

create table public.recovery_logs (
  id uuid primary key default gen_random_uuid(),
  failed_invoice_id uuid not null
    references public.failed_invoices (id) on delete cascade,
  email_sent_at timestamptz,
  status text not null check (
    status in (
      'dunning_sent',
      'dunning_failed',
      'recovered',
      'founder_notification_sent',
      'founder_notification_failed'
    )
  )
);

create index recovery_logs_invoice_status_idx
  on public.recovery_logs (failed_invoice_id, status);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.failed_invoices enable row level security;
alter table public.recovery_logs enable row level security;

create policy "Users can read their own profile"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);

revoke update on table public.users from authenticated;
grant update (notification_email) on table public.users to authenticated;

create policy "Users can update their notification email"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their own failed invoices"
  on public.failed_invoices for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read logs for their own invoices"
  on public.recovery_logs for select
  to authenticated
  using (
    exists (
      select 1
      from public.failed_invoices
      where failed_invoices.id = recovery_logs.failed_invoice_id
        and failed_invoices.user_id = (select auth.uid())
    )
  );

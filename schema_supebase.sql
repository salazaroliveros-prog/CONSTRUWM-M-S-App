-- ============================================================
-- WM/M&S - SUPABASE SCHEMA (ADMIN + PORTALES PÚBLICOS)
-- ============================================================

-- ============================================================
-- RESET (OPCIONAL): BORRAR TABLAS/OBJETOS EXISTENTES
-- ============================================================
-- ADVERTENCIA: Esto elimina datos permanentemente.
-- Úsalo solo si quieres reinstalar el esquema desde cero.
-- Ejecuta este bloque primero (puedes comentar lo que no uses).

-- 1) Vistas (si existen)
drop view if exists public.v_inventory_value cascade;
drop view if exists public.v_org_daily_cashflow cascade;
drop view if exists public.v_project_financials cascade;

-- 2) Tablas (orden aproximado; CASCADE cubre dependencias)
drop table if exists public.stock_movements cascade;
drop table if exists public.purchase_order_items cascade;
drop table if exists public.purchase_orders cascade;
drop table if exists public.purchase_request_items cascade;
drop table if exists public.purchase_requests cascade;
drop table if exists public.inventory_items cascade;

drop table if exists public.budget_items cascade;
drop table if exists public.budgets cascade;

drop table if exists public.notifications cascade;
drop table if exists public.candidate_applications cascade;
drop table if exists public.attendance_records cascade;
drop table if exists public.employees cascade;
drop table if exists public.transactions cascade;
drop table if exists public.projects cascade;

drop table if exists public.org_portal_secrets cascade;
drop table if exists public.org_members cascade;
drop table if exists public.profiles cascade;
drop table if exists public.organizations cascade;

-- 3) Funciones (si existen)
drop function if exists public.trg_apply_stock_movement() cascade;
drop function if exists public.stock_delta(stock_movement_type, numeric) cascade;
drop function if exists public.set_tx_month() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.is_org_member(uuid) cascade;

-- 4) ENUMs (tipos)
drop type if exists stock_movement_type cascade;
drop type if exists purchase_order_status cascade;
drop type if exists purchase_request_status cascade;
drop type if exists request_priority cascade;
drop type if exists notification_type cascade;
drop type if exists application_status cascade;
drop type if exists attendance_method cascade;
drop type if exists tx_type cascade;
drop type if exists project_typology cascade;
drop type if exists project_status cascade;

-- 5) Realtime publication (OPCIONAL)
-- Si te da error por permisos/no existe, puedes omitirlo.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- No siempre es necesario remover tablas; al borrarlas ya se limpian.
    null;
  end if;
end $$;

-- 0) EXTENSIONES
create extension if not exists pgcrypto;

-- ============================================================
-- 1) ENUMS
-- ============================================================
do $$ begin
  create type project_status as enum ('PENDING','ACTIVE','PAUSED','EXECUTED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_typology as enum ('RESIDENCIAL','COMERCIAL','INDUSTRIAL','CIVIL','OTRO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_type as enum ('INCOME','EXPENSE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_method as enum ('SELF','EMERGENCY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('PENDING','APPROVED','REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('INFO','WARNING','CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_priority as enum ('STANDARD','HIGH','CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type purchase_request_status as enum ('DRAFT','SUBMITTED','APPROVED','REJECTED','ORDERED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type purchase_order_status as enum ('DRAFT','SENT','PARTIAL','RECEIVED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_movement_type as enum ('IN','OUT','ADJUSTMENT');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2) MULTI-TENANCY + ADMIN CONTROL
-- ============================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin', -- por ahora el admin controla todo
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = _org_id
      and m.user_id = auth.uid()
  );
$$;

-- ============================================================
-- 3) PORTALES PÚBLICOS (tokens) - para Edge Functions
-- ============================================================
create table if not exists public.org_portal_secrets (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  attendance_token text not null,
  applications_token text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

-- ============================================================
-- 4) PROYECTOS
-- ============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,

  name text not null,
  client_name text,
  location_text text,

  status project_status not null default 'PENDING',
  typology project_typology not null default 'OTRO',

  land_area_m2 numeric(12,2) not null default 0,
  construction_area_m2 numeric(12,2) not null default 0,

  start_date date,
  end_date date,

  contract_amount numeric(14,2) not null default 0,
  notes text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_org on public.projects(org_id);
create index if not exists idx_projects_org_status on public.projects(org_id, status);

-- ============================================================
-- 5) TRANSACCIONES (Ingresos/Egresos)
-- ============================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,

  type tx_type not null,
  description text not null,

  quantity numeric(14,3) not null default 1,
  unit text not null default 'unidad',

  unit_cost numeric(14,2) not null default 0,
  category text not null,
  provider text,

  tx_date date not null default (now()::date),
  tx_month date not null,

  rental_end date,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_org_date on public.transactions(org_id, tx_date desc);
create index if not exists idx_transactions_project_date on public.transactions(project_id, tx_date desc);
create index if not exists idx_transactions_org_month on public.transactions(org_id, tx_month);

-- Mantener tx_month (primer día del mes) a partir de tx_date
create or replace function public.set_tx_month()
returns trigger
language plpgsql
as $$
begin
  -- tx_date es DATE, así que evitamos date_trunc() para cumplir reglas de inmutabilidad.
  new.tx_month := make_date(extract(year from new.tx_date)::int, extract(month from new.tx_date)::int, 1);
  return new;
end;
$$;

drop trigger if exists trg_transactions_set_tx_month on public.transactions;
create trigger trg_transactions_set_tx_month
before insert or update of tx_date
on public.transactions
for each row execute function public.set_tx_month();

-- ============================================================
-- 6) RRHH: EMPLEADOS
-- ============================================================
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,

  worker_id text not null,
  name text not null,
  phone text,
  dpi text,
  position_title text not null,

  daily_salary numeric(14,2) not null default 0,
  active boolean not null default true,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_employee_worker unique (org_id, worker_id)
);

create index if not exists idx_employees_org on public.employees(org_id);

-- ============================================================
-- 7) RRHH: ASISTENCIA (Portal Campo)
-- ============================================================
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,

  day date not null,
  method attendance_method not null default 'SELF',

  lat numeric(10,7),
  lng numeric(10,7),
  device_label text,
  note text,

  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_attendance_org_day on public.attendance_records(org_id, day desc);
create index if not exists idx_attendance_employee_day on public.attendance_records(employee_id, day desc);

-- Evitar duplicado SELF diario (permitimos múltiples EMERGENCY si se requiere, o puedes restringir también)
create unique index if not exists uq_attendance_self_per_day
on public.attendance_records(employee_id, day)
where method = 'SELF';

-- ============================================================
-- 8) RRHH: APLICANTES / CONTRATO (Portal Aplicante)
-- ============================================================
create table if not exists public.candidate_applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,

  name text not null,
  phone text,
  dpi text not null,
  experience text,
  position_applied text not null,

  status application_status not null default 'PENDING',

  -- contrato/postulación en JSON
  contract_data jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'PORTAL_CONTRACT',
  meta jsonb
);

create index if not exists idx_applications_org_status on public.candidate_applications(org_id, status);
create index if not exists idx_applications_org_submitted on public.candidate_applications(org_id, submitted_at desc);

-- ============================================================
-- 9) NOTIFICACIONES (Admin)
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,

  title text not null,
  message text not null,
  type notification_type not null default 'INFO',

  target_user_id uuid references auth.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_org_created on public.notifications(org_id, created_at desc);
create index if not exists idx_notifications_target_user on public.notifications(target_user_id, created_at desc);

-- ============================================================
-- 10) PRESUPUESTOS
-- ============================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,

  name text not null default 'Presupuesto Base',
  indirect_percent numeric(6,4) not null default 0.15,
  utility_percent numeric(6,4) not null default 0.10,
  tax_percent numeric(6,4) not null default 0.12,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint uq_budget_project unique (project_id, name)
);

create index if not exists idx_budgets_project on public.budgets(project_id);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,

  name text not null,
  category text not null,
  unit text not null,

  unit_price numeric(14,2) not null default 0,
  quantity numeric(14,3) not null default 0,
  line_total numeric(14,2) generated always as (round(unit_price * quantity, 2)) stored,

  created_at timestamptz not null default now()
);

create index if not exists idx_budget_items_budget on public.budget_items(budget_id);

-- ============================================================
-- 11) INVENTARIO + COMPRAS
-- ============================================================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,

  name text not null,
  category text,
  unit text not null default 'unidad',

  current_stock numeric(14,3) not null default 0,
  min_stock numeric(14,3) not null default 0,
  last_unit_cost numeric(14,2) not null default 0,

  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_inventory_name unique (org_id, name)
);

create index if not exists idx_inventory_org on public.inventory_items(org_id);

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,

  title text not null,
  specs text,
  priority request_priority not null default 'STANDARD',
  status purchase_request_status not null default 'DRAFT',

  needed_by date,
  requested_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pr_org_status on public.purchase_requests(org_id, status);
create index if not exists idx_pr_project on public.purchase_requests(project_id);

create table if not exists public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references public.purchase_requests(id) on delete cascade,

  inventory_item_id uuid references public.inventory_items(id) on delete set null,

  item_name text not null,
  unit text not null default 'unidad',
  quantity numeric(14,3) not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists idx_pr_items_request on public.purchase_request_items(request_id);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  request_id uuid references public.purchase_requests(id) on delete set null,

  supplier_name text,
  supplier_phone text,
  status purchase_order_status not null default 'DRAFT',

  ordered_at timestamptz,
  received_at timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_po_org_status on public.purchase_orders(org_id, status);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,

  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  item_name text not null,
  unit text not null default 'unidad',

  quantity numeric(14,3) not null default 0,
  unit_cost numeric(14,2) not null default 0,

  line_total numeric(14,2) generated always as (round(quantity * unit_cost, 2)) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_po_items_po on public.purchase_order_items(purchase_order_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,

  movement_type stock_movement_type not null,
  quantity numeric(14,3) not null default 0,

  unit_cost numeric(14,2),
  project_id uuid references public.projects(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,

  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_item on public.stock_movements(inventory_item_id, created_at desc);
create index if not exists idx_stock_movements_org on public.stock_movements(org_id, created_at desc);

-- ============================================================
-- 12) TRIGGERS: updated_at genérico
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_updated_at on public.inventory_items;
create trigger trg_inventory_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_requests_updated_at on public.purchase_requests;
create trigger trg_purchase_requests_updated_at
before update on public.purchase_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_candidate_applications_updated_at on public.candidate_applications;
create trigger trg_candidate_applications_updated_at
before update on public.candidate_applications
for each row execute function public.set_updated_at();

-- ============================================================
-- 13) INVENTARIO: Trigger para mantener current_stock + last_unit_cost
-- ============================================================
create or replace function public.stock_delta(_movement stock_movement_type, _qty numeric)
returns numeric
language sql
immutable
as $$
  select case
    when _movement = 'IN' then _qty
    when _movement = 'OUT' then -_qty
    else _qty -- ADJUSTMENT: quantity puede ser + o -
  end;
$$;

create or replace function public.trg_apply_stock_movement()
returns trigger
language plpgsql
as $$
declare
  d numeric(14,3);
  old_d numeric(14,3);
begin
  if (tg_op = 'INSERT') then
    d := public.stock_delta(new.movement_type, new.quantity);
    update public.inventory_items
      set current_stock = current_stock + d,
          last_unit_cost = case when new.unit_cost is not null then new.unit_cost else last_unit_cost end
    where id = new.inventory_item_id;
    return new;

  elsif (tg_op = 'DELETE') then
    d := public.stock_delta(old.movement_type, old.quantity);
    update public.inventory_items
      set current_stock = current_stock - d
    where id = old.inventory_item_id;
    return old;

  elsif (tg_op = 'UPDATE') then
    old_d := public.stock_delta(old.movement_type, old.quantity);
    d := public.stock_delta(new.movement_type, new.quantity);

    update public.inventory_items
      set current_stock = current_stock - old_d
    where id = old.inventory_item_id;

    update public.inventory_items
      set current_stock = current_stock + d,
          last_unit_cost = case when new.unit_cost is not null then new.unit_cost else last_unit_cost end
    where id = new.inventory_item_id;

    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_stock_movements_apply on public.stock_movements;
create trigger trg_stock_movements_apply
after insert or update or delete on public.stock_movements
for each row execute function public.trg_apply_stock_movement();

-- ============================================================
-- 14) VIEWS (reportes)
-- ============================================================
create or replace view public.v_project_financials as
select
  p.org_id,
  p.id as project_id,
  p.name as project_name,
  coalesce(sum(case when t.type = 'INCOME' then (t.quantity * t.unit_cost) end), 0) as total_income,
  coalesce(sum(case when t.type = 'EXPENSE' then (t.quantity * t.unit_cost) end), 0) as total_expense,
  coalesce(sum(case when t.type = 'INCOME' then (t.quantity * t.unit_cost) else 0 end), 0)
  - coalesce(sum(case when t.type = 'EXPENSE' then (t.quantity * t.unit_cost) else 0 end), 0) as balance
from public.projects p
left join public.transactions t on t.project_id = p.id
group by p.org_id, p.id, p.name;

create or replace view public.v_org_daily_cashflow as
select
  org_id,
  tx_date,
  sum(case when type = 'INCOME' then quantity*unit_cost else 0 end) as income,
  sum(case when type = 'EXPENSE' then quantity*unit_cost else 0 end) as expense,
  sum(case when type = 'INCOME' then quantity*unit_cost else 0 end)
  - sum(case when type = 'EXPENSE' then quantity*unit_cost else 0 end) as balance
from public.transactions
group by org_id, tx_date;

create or replace view public.v_inventory_value as
select
  org_id,
  id as inventory_item_id,
  name,
  unit,
  current_stock,
  last_unit_cost,
  round(current_stock * last_unit_cost, 2) as stock_value
from public.inventory_items;

-- ============================================================
-- 15) RLS (SEGURIDAD)
-- ============================================================

-- Activar RLS
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.org_members enable row level security;
alter table public.org_portal_secrets enable row level security;

alter table public.projects enable row level security;
alter table public.transactions enable row level security;

alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.candidate_applications enable row level security;

alter table public.notifications enable row level security;

alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;

alter table public.inventory_items enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.purchase_request_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.stock_movements enable row level security;

-- ORGANIZATIONS: solo miembros la ven
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
for select to authenticated
using (public.is_org_member(id));

-- PROFILES: cada quien ve/edita su perfil
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (user_id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ORG_MEMBERS: cada quien ve su membresía (admin management se puede endurecer después)
drop policy if exists org_members_select on public.org_members;
create policy org_members_select on public.org_members
for select to authenticated
using (user_id = auth.uid());

-- PORTAL SECRETS: solo miembros (admin)
drop policy if exists org_portal_secrets_rw on public.org_portal_secrets;
create policy org_portal_secrets_rw on public.org_portal_secrets
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

-- RW por org_id (ADMIN control total)
drop policy if exists projects_rw on public.projects;
create policy projects_rw on public.projects
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists transactions_rw on public.transactions;
create policy transactions_rw on public.transactions
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists employees_rw on public.employees;
create policy employees_rw on public.employees
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists attendance_rw on public.attendance_records;
create policy attendance_rw on public.attendance_records
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists applications_rw on public.candidate_applications;
create policy applications_rw on public.candidate_applications
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists notifications_rw on public.notifications;
create policy notifications_rw on public.notifications
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists budgets_rw on public.budgets;
create policy budgets_rw on public.budgets
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists budget_items_rw on public.budget_items;
create policy budget_items_rw on public.budget_items
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists inventory_rw on public.inventory_items;
create policy inventory_rw on public.inventory_items
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists pr_rw on public.purchase_requests;
create policy pr_rw on public.purchase_requests
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists pr_items_rw on public.purchase_request_items;
create policy pr_items_rw on public.purchase_request_items
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists po_rw on public.purchase_orders;
create policy po_rw on public.purchase_orders
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists po_items_rw on public.purchase_order_items;
create policy po_items_rw on public.purchase_order_items
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

drop policy if exists stock_rw on public.stock_movements;
create policy stock_rw on public.stock_movements
for all to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

-- ============================================================
-- 16) REALTIME READY (replica identity full)
-- ============================================================
alter table public.projects replica identity full;
alter table public.transactions replica identity full;
alter table public.employees replica identity full;
alter table public.attendance_records replica identity full;
alter table public.candidate_applications replica identity full;
alter table public.inventory_items replica identity full;
alter table public.purchase_requests replica identity full;
alter table public.purchase_orders replica identity full;
alter table public.stock_movements replica identity full;

-- Opcional: añadir tablas a supabase_realtime si existe
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.projects;
    alter publication supabase_realtime add table public.transactions;
    alter publication supabase_realtime add table public.employees;
    alter publication supabase_realtime add table public.attendance_records;
    alter publication supabase_realtime add table public.candidate_applications;
    alter publication supabase_realtime add table public.inventory_items;
    alter publication supabase_realtime add table public.purchase_requests;
    alter publication supabase_realtime add table public.purchase_orders;
    alter publication supabase_realtime add table public.stock_movements;
  end if;
exception when duplicate_object then
  null;
end $$;
-- SalonEase — Supabase setup
-- Paste this whole file into Supabase > SQL Editor > New query > Run.

-- 1. The table ---------------------------------------------------------
create table if not exists bookings (
  id            bigint generated always as identity primary key,
  customer_name text        not null,
  phone         text,
  service       text        not null,
  stylist       text,
  booking_date  date        not null,
  start_time    time        not null,
  amount        numeric(10,2),
  status        text        not null default 'confirmed',
  created_at    timestamptz not null default now()
);

-- Makes the "all bookings for a date" query fast.
create index if not exists bookings_date_idx on bookings (booking_date, start_time);


-- 2. Row Level Security ------------------------------------------------
-- Supabase blocks all access by default once RLS is on. These two policies
-- let the public anon key read and insert.
--
-- NOTE: this is fine for a bootcamp demo, where anyone with the URL may
-- read and add bookings. A real salon would require a signed-in user —
-- say this out loud if you are asked about it, it shows you know the
-- difference between a demo and production.

alter table bookings enable row level security;

drop policy if exists "anon can read bookings"   on bookings;
drop policy if exists "anon can insert bookings" on bookings;

create policy "anon can read bookings"
  on bookings for select
  to anon
  using (true);

create policy "anon can insert bookings"
  on bookings for insert
  to anon
  with check (true);


-- 3. Sample rows -------------------------------------------------------
-- So your endpoint returns real data in the very first screenshot.
-- Delete these later and add your own.

insert into bookings (customer_name, phone, service, stylist, booking_date, start_time, amount) values
  ('Simran Kaur',  '9876500011', 'Haircut',            'Ravi',   current_date,     '11:00', 300.00),
  ('Priya Sharma', '9876500022', 'Facial',             'Neha',   current_date,     '12:30', 900.00),
  ('Jasleen Kaur', '9876500033', 'Hair Spa',           'Neha',   current_date,     '16:00', 1200.00),
  ('Manpreet Kaur','9876500044', 'Haircut + Blow Dry', 'Ravi',   current_date + 1, '10:30', 650.00),
  ('Harleen Kaur', '9876500055', 'Bridal Makeup',      'Simran', current_date + 2, '09:00', 8500.00);


-- 4. Check it worked ---------------------------------------------------
select id, customer_name, service, booking_date, start_time, amount
from bookings
order by booking_date, start_time;

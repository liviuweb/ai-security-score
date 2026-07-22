-- KI-Nutri-Score — Supabase-Schema für Visit-Tracking, Feedback und Admin-Auswertung.
-- Im Supabase SQL-Editor ausführen (Projekt hclclqznrcpttnzxwytf). Idempotent, kann
-- gefahrlos mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

-- ── visits ──────────────────────────────────────────────────────────────────
-- Wird von src/hooks/useTrackVisit.ts beschrieben: { path }
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null
);

alter table public.visits enable row level security;

drop policy if exists "Allow anon insert on visits" on public.visits;
create policy "Allow anon insert on visits"
  on public.visits
  for insert
  to anon
  with check (true);

-- Bewusst KEINE SELECT-Policy für anon — Rohdaten sind nur über get_admin_stats
-- (unten, security definer) aggregiert erreichbar, nicht direkt per Tabellen-Query.

-- ── feedback ────────────────────────────────────────────────────────────────
-- Wird von src/FeedbackWidget.tsx beschrieben: { rating, message, page }
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rating int not null check (rating between 1 and 5),
  message text,
  page text not null
);

alter table public.feedback enable row level security;

drop policy if exists "Allow anon insert on feedback" on public.feedback;
create policy "Allow anon insert on feedback"
  on public.feedback
  for insert
  to anon
  with check (true);

-- ── get_admin_stats ─────────────────────────────────────────────────────────
-- Von src/AdminTab.tsx per supabase.rpc('get_admin_stats') aufgerufen. Liefert ein
-- einzelnes JSON-Objekt: { total_visits, total_feedback, avg_rating, feedback: [...] }.
-- security definer + fixer search_path, damit die Funktion trotz fehlender
-- SELECT-Policies auf die Tabellen zugreifen kann (kontrollierter Lesezugriff nur
-- über diese aggregierte Funktion, nicht über direkte Tabellen-Reads durch anon).
create or replace function public.get_admin_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_visits', (select count(*) from public.visits),
    'total_feedback', (select count(*) from public.feedback),
    'avg_rating', coalesce((select round(avg(rating)::numeric, 2) from public.feedback), 0),
    'feedback', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'created_at', f.created_at,
            'rating', f.rating,
            'message', f.message,
            'page', f.page
          )
          order by f.created_at desc
        )
        from public.feedback f
      ),
      '[]'::jsonb
    )
  );
$$;

-- WICHTIG (siehe Sicherheitshinweis im Chat): Das Passwort-Gate in AdminTab.tsx ist
-- rein clientseitig. Dieser GRANT macht get_admin_stats für jeden mit dem (ohnehin
-- öffentlichen) anon-Key aufrufbar — unabhängig vom Admin-Passwort im Frontend.
-- Für echten Zugriffsschutz müsste diese Funktion stattdessen nur für eine
-- authenticated-Rolle mit Admin-Anspruch freigegeben werden (setzt echte Supabase-Auth
-- im Frontend voraus, aktuell nicht implementiert).
grant execute on function public.get_admin_stats() to anon;

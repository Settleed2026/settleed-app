-- 016_page_views.sql
-- Anonymous + authenticated visitor tracking

create table if not exists page_views (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  page        text not null,
  referrer    text,
  user_agent  text,
  device      text,           -- 'mobile' | 'tablet' | 'desktop'
  browser     text,           -- 'chrome' | 'firefox' | 'safari' | 'edge' | 'other'
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

create index if not exists page_views_created_at_idx on page_views(created_at desc);
create index if not exists page_views_session_id_idx  on page_views(session_id);

alter table page_views enable row level security;

-- Any visitor (anonymous or authenticated) can log a page view
create policy "anyone_insert_page_views"
  on page_views for insert
  to anon, authenticated
  with check (true);

-- Only admins can read page views
create policy "admin_select_page_views"
  on page_views for select
  to authenticated
  using (is_admin());

-- Grant table-level permissions
grant insert on page_views to anon, authenticated;
grant select on page_views to authenticated;

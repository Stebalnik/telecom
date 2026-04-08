


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."customer_resource_audience_scope" AS ENUM (
    'all_markets',
    'selected_markets'
);


ALTER TYPE "public"."customer_resource_audience_scope" OWNER TO "postgres";


CREATE TYPE "public"."team_member_role" AS ENUM (
    'Technician',
    'Foreman',
    'Rigger',
    'Climber',
    'Electrician',
    'Fiber Tech',
    'Project Manager',
    'Inspector',
    'Driver',
    'Other'
);


ALTER TYPE "public"."team_member_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acknowledge_customer_resource"("p_resource_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_resource public.customer_resources%rowtype;
  v_company_id uuid;
begin
  select *
  into v_resource
  from public.customer_resources
  where id = p_resource_id
    and is_active = true;

  if not found then
    raise exception 'Resource not found';
  end if;

  if not public.current_contractor_has_customer_approval(v_resource.customer_id) then
    raise exception 'Access denied';
  end if;

  if not public.current_contractor_matches_resource_market(v_resource.id) then
    raise exception 'Access denied for this market';
  end if;

  select cc.id
  into v_company_id
  from public.contractor_companies cc
  where cc.owner_user_id = auth.uid()
  limit 1;

  if v_company_id is null then
    raise exception 'Contractor company not found';
  end if;

  insert into public.customer_resource_acknowledgements (
    resource_id,
    contractor_company_id,
    acknowledged_by
  )
  values (
    v_resource.id,
    v_company_id,
    auth.uid()
  )
  on conflict (resource_id, contractor_company_id)
  do update set
    acknowledged_by = excluded.acknowledged_by,
    acknowledged_at = now();

  insert into public.customer_resource_events (
    resource_id,
    contractor_company_id,
    actor_user_id,
    event_type
  )
  values (
    v_resource.id,
    v_company_id,
    auth.uid(),
    'acknowledged'
  );

  return jsonb_build_object(
    'ok', true,
    'resource_id', v_resource.id
  );
end;
$$;


ALTER FUNCTION "public"."acknowledge_customer_resource"("p_resource_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_approved_team_change_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_request public.team_change_requests%rowtype;
begin
  select *
  into v_request
  from public.team_change_requests
  where id = p_request_id;

  if not found then
    raise exception 'Team change request not found';
  end if;

  if v_request.status <> 'approved' then
    raise exception 'Only approved requests can be applied';
  end if;

  -- remove current team members for this team
  delete from public.team_members
  where team_id = v_request.team_id;

  -- insert requested composition
  insert into public.team_members (
    team_id,
    full_name,
    role_title,
    phone,
    email,
    date_of_birth
  )
  select
    v_request.team_id,
    m.full_name,
    m.role_title,
    m.phone,
    m.email,
    m.date_of_birth
  from public.team_change_request_members m
  where m.request_id = v_request.id
  order by m.sort_order asc;
end;
$$;


ALTER FUNCTION "public"."apply_approved_team_change_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_contractor_coi_before_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.contractor_coi_history (
    source_coi_id,
    company_id,
    issue_date,
    expiration_date,
    carrier_name,
    am_best_rating,
    admitted_carrier,
    file_path,
    status,
    review_notes,
    insured_name,
    broker_name,
    broker_phone,
    broker_email,
    certificate_holder,
    description_of_operations,
    additional_insured_text,
    waiver_of_subrogation_text,
    primary_non_contributory_text,
    included_entities_text,
    version_no,
    archived_at,
    created_at
  )
  values (
    old.id,
    old.company_id,
    old.issue_date,
    old.expiration_date,
    old.carrier_name,
    old.am_best_rating,
    old.admitted_carrier,
    old.file_path,
    old.status,
    old.review_notes,
    old.insured_name,
    old.broker_name,
    old.broker_phone,
    old.broker_email,
    old.certificate_holder,
    old.description_of_operations,
    old.additional_insured_text,
    old.waiver_of_subrogation_text,
    old.primary_non_contributory_text,
    old.included_entities_text,
    old.version_no,
    now(),
    old.created_at
  );

  new.version_no = coalesce(old.version_no, 1) + 1;
  return new;
end;
$$;


ALTER FUNCTION "public"."archive_contractor_coi_before_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_feedback_last_message_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.feedback_items
  set
    last_message_at = now(),
    updated_at = now()
  where id = new.feedback_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."bump_feedback_last_message_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_bid_job"("p_job_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.jobs j
    join public.vendor_approvals va
      on va.customer_id = j.customer_id
    join public.contractor_companies c
      on c.id = va.contractor_company_id
    where j.id = p_job_id
      and j.status = 'open'
      and j.customer_id is not null
      and va.status = 'approved'
      and c.owner_user_id = auth.uid()
      and c.status = 'active'
  );
$$;


ALTER FUNCTION "public"."can_bid_job"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_current_user_view_feedback"("p_feedback_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.feedback_items f
    where f.id = p_feedback_id
      and (
        public.is_admin()
        or (f.user_id is not null and f.user_id = auth.uid())
      )
  );
$$;


ALTER FUNCTION "public"."can_current_user_view_feedback"("p_feedback_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."company_insurance_issues"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  with req as (
    select it.id as insurance_type_id, it.name
    from public.required_company_insurance r
    join public.insurance_types it on it.id = r.insurance_type_id
    where r.is_required = true
  ),
  docs as (
    select
      d.insurance_type_id,
      d.verification_status,
      d.expires_at
    from public.documents d
    where d.doc_kind = 'insurance'
      and d.company_id = p_company_id
      and d.insurance_type_id is not null
  ),
  missing as (
    select r.name
    from req r
    left join docs d on d.insurance_type_id = r.insurance_type_id
    where d.insurance_type_id is null
  ),
  approved_latest as (
    -- последняя approved дата по каждому типу
    select insurance_type_id, max(expires_at) as max_exp
    from docs
    where verification_status = 'approved'
    group by insurance_type_id
  ),
  expired as (
    select r.name
    from req r
    join approved_latest a on a.insurance_type_id = r.insurance_type_id
    where a.max_exp < current_date
  ),
  not_approved as (
    -- есть документы, но нет ни одного approved (вообще)
    select r.name
    from req r
    where exists (select 1 from docs d where d.insurance_type_id = r.insurance_type_id)
      and not exists (select 1 from docs d where d.insurance_type_id = r.insurance_type_id and d.verification_status = 'approved')
  ),
  ok as (
    -- тип считается OK, если есть approved и он не истёк
    select r.insurance_type_id
    from req r
    join approved_latest a on a.insurance_type_id = r.insurance_type_id
    where a.max_exp >= current_date
  )
  select jsonb_build_object(
    'missing', coalesce((select jsonb_agg(name) from missing), '[]'::jsonb),
    'expired', coalesce((select jsonb_agg(name) from expired), '[]'::jsonb),
    'not_approved', coalesce((select jsonb_agg(name) from not_approved), '[]'::jsonb),
    'is_eligible', (select count(*) = (select count(*) from req) from ok)
  );
$$;


ALTER FUNCTION "public"."company_insurance_issues"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."company_is_eligible"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  with required as (
    select r.insurance_type_id
    from public.required_company_insurance r
    where r.is_required = true
  ),
  ok_docs as (
    select distinct d.insurance_type_id
    from public.documents d
    where d.doc_kind = 'insurance'
      and d.company_id = p_company_id
      and d.verification_status = 'approved'
      and d.expires_at >= current_date
  )
  select not exists (
    select 1
    from required r
    left join ok_docs o on o.insurance_type_id = r.insurance_type_id
    where o.insurance_type_id is null
  );
$$;


ALTER FUNCTION "public"."company_is_eligible"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_customer_agreement_from_template"("p_template_id" "uuid", "p_contractor_company_id" "uuid" DEFAULT NULL::"uuid", "p_job_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tpl public.customer_agreement_templates%rowtype;
  v_id uuid;
begin
  select *
  into v_tpl
  from public.customer_agreement_templates
  where id = p_template_id;

  if not found then
    raise exception 'Template not found';
  end if;

  if not public.current_user_owns_customer(v_tpl.customer_id) and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  insert into public.customer_agreements (
    customer_id,
    contractor_company_id,
    job_id,
    template_id,
    agreement_type,
    title,
    file_name,
    file_path,
    status,
    source,
    created_by
  )
  values (
    v_tpl.customer_id,
    p_contractor_company_id,
    p_job_id,
    v_tpl.id,
    v_tpl.template_type,
    coalesce(nullif(trim(p_title), ''), v_tpl.title),
    v_tpl.file_name,
    v_tpl.file_path,
    'draft',
    'template',
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_customer_agreement_from_template"("p_template_id" "uuid", "p_contractor_company_id" "uuid", "p_job_id" "uuid", "p_title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_contractor_can_view_customer"("p_customer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.contractor_companies cc
    join public.customer_contractors rel
      on rel.contractor_company_id = cc.id
    where cc.owner_user_id = auth.uid()
      and rel.customer_id = p_customer_id
  );
$$;


ALTER FUNCTION "public"."current_contractor_can_view_customer"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_contractor_has_customer_approval"("p_customer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.contractor_companies cc
    join public.customer_contractors rel
      on rel.contractor_company_id = cc.id
    where cc.owner_user_id = auth.uid()
      and rel.customer_id = p_customer_id
      and rel.status = 'approved'
  );
$$;


ALTER FUNCTION "public"."current_contractor_has_customer_approval"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_contractor_matches_resource_market"("p_resource_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with my_company as (
    select cc.id as company_id
    from public.contractor_companies cc
    where cc.owner_user_id = auth.uid()
    limit 1
  ),
  my_profile as (
    select
      cpp.company_id,
      cpp.home_market,
      coalesce(cpp.markets, '{}'::text[]) as markets
    from public.contractor_public_profiles cpp
    join my_company mc on mc.company_id = cpp.company_id
  ),
  resource_row as (
    select r.id, r.audience_scope
    from public.customer_resources r
    where r.id = p_resource_id
    limit 1
  )
  select exists (
    select 1
    from resource_row r
    where
      r.audience_scope = 'all_markets'
      or (
        r.audience_scope = 'selected_markets'
        and exists (
          select 1
          from public.customer_resource_markets rm
          join my_profile mp on true
          where rm.resource_id = r.id
            and (
              rm.market = any(mp.markets)
              or rm.market = mp.home_market
            )
        )
      )
  );
$$;


ALTER FUNCTION "public"."current_contractor_matches_resource_market"("p_resource_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_customer_can_view_company"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.customers c
    join public.customer_contractors rel
      on rel.customer_id = c.id
    where c.owner_user_id = auth.uid()
      and rel.contractor_company_id = p_company_id
  );
$$;


ALTER FUNCTION "public"."current_customer_can_view_company"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_owns_contractor_company"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.contractor_companies cc
    where cc.id = p_company_id
      and cc.owner_user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."current_user_owns_contractor_company"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_owns_customer"("p_customer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and c.owner_user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."current_user_owns_customer"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_id_from_agreement_storage_path"("p_name" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(split_part(p_name, '/', 2), '')::uuid;
$$;


ALTER FUNCTION "public"."customer_id_from_agreement_storage_path"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_review_contractor_request"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_decision" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_customer public.customers%rowtype;
  v_now timestamptz := now();
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select *
  into v_customer
  from public.customers
  where id = p_customer_id
    and owner_user_id = auth.uid();

  if not found then
    raise exception 'Customer not found or not owned by current user';
  end if;

  update public.customer_contractors
  set
    status = p_decision,
    customer_note = p_note,
    reviewed_at = v_now,
    reviewed_by = auth.uid(),
    approved_at = case when p_decision = 'approved' then v_now else approved_at end,
    rejected_at = case when p_decision = 'rejected' then v_now else rejected_at end
  where customer_id = p_customer_id
    and contractor_company_id = p_contractor_company_id;

  insert into public.customer_contractor_application_events (
    customer_id,
    contractor_company_id,
    event_type,
    actor_user_id,
    note
  )
  values (
    p_customer_id,
    p_contractor_company_id,
    p_decision,
    auth.uid(),
    p_note
  );

  return jsonb_build_object(
    'ok', true,
    'status', p_decision
  );
end;
$$;


ALTER FUNCTION "public"."customer_review_contractor_request"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_decision" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_start_or_get_request_thread"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_first_message" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_thread_id uuid;
begin
  if trim(coalesce(p_first_message, '')) = '' then
    raise exception 'Message is required';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and c.owner_user_id = auth.uid()
  ) then
    raise exception 'Customer not found or not owned by current user';
  end if;

  insert into public.customer_contractor_request_threads (
    customer_id,
    contractor_company_id,
    created_by_customer_user_id
  )
  values (
    p_customer_id,
    p_contractor_company_id,
    auth.uid()
  )
  on conflict (customer_id, contractor_company_id)
  do update set
    last_message_at = now()
  returning id into v_thread_id;

  insert into public.customer_contractor_request_messages (
    thread_id,
    sender_user_id,
    sender_role,
    body
  )
  values (
    v_thread_id,
    auth.uid(),
    'customer',
    p_first_message
  );

  update public.customer_contractor_request_threads
  set last_message_at = now()
  where id = v_thread_id;

  return v_thread_id;
end;
$$;


ALTER FUNCTION "public"."customer_start_or_get_request_thread"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_first_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eligible_teams_for_job"("p_company_id" "uuid", "p_job_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text")
    LANGUAGE "sql" STABLE
    AS $$
  with req as (
    select cert_type_id
    from public.job_required_certs
    where job_id = p_job_id
  ),
  members as (
    select m.id as member_id, m.team_id
    from public.team_members m
    join public.teams t on t.id = m.team_id
    where t.company_id = p_company_id
      and t.status = 'active'
  ),
  member_ok as (
    select
      m.team_id,
      d.cert_type_id
    from members m
    join public.documents d on d.team_member_id = m.member_id
    where d.doc_kind = 'cert'
      and d.verification_status = 'approved'
      and d.expires_at >= current_date
  ),
  team_has_all as (
    -- команда подходит если существует хотя бы один member, который покрывает ВСЕ req certs?
    -- MVP логика: "в команде есть хотя бы по одному сертификату каждого типа" (упрощение)
    select m.team_id
    from members m
    join req r on true
    left join member_ok ok on ok.team_id = m.team_id and ok.cert_type_id = r.cert_type_id
    group by m.team_id
    having count(distinct r.cert_type_id) = count(distinct ok.cert_type_id)
  )
  select t.id, t.name
  from public.teams t
  where t.company_id = p_company_id
    and t.id in (select team_id from team_has_all)
  order by t.created_at desc;
$$;


ALTER FUNCTION "public"."eligible_teams_for_job"("p_company_id" "uuid", "p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_contractor"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'contractor'
  );
$$;


ALTER FUNCTION "public"."is_current_user_contractor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_customer"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'customer'
  );
$$;


ALTER FUNCTION "public"."is_current_user_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."job_id_from_storage_path"("p_name" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(split_part(p_name, '/', 2), '')::uuid;
$$;


ALTER FUNCTION "public"."job_id_from_storage_path"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_customer_pending_contractor_requests"("p_customer_id" "uuid") RETURNS TABLE("customer_id" "uuid", "contractor_company_id" "uuid", "status" "text", "approval_requested_at" timestamp with time zone, "cooldown_until" timestamp with time zone, "request_count" integer, "contractor_legal_name" "text", "contractor_dba_name" "text", "contractor_status" "text", "contractor_onboarding_status" "text", "headline" "text", "home_market" "text", "available_teams_count" integer, "insurance_types" "text"[], "approved_cert_count" integer, "approved_team_members_count" integer, "thread_id" "uuid", "has_thread" boolean, "last_message_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with base as (
    select
      cc.customer_id,
      cc.contractor_company_id,
      cc.status,
      cc.approval_requested_at,
      cc.cooldown_until,
      cc.request_count
    from public.customer_contractors cc
    where cc.customer_id = p_customer_id
      and cc.status = 'pending'
  ),
  profile_data as (
    select
      c.id as company_id,
      c.legal_name,
      c.dba_name,
      c.status as contractor_status,
      c.onboarding_status as contractor_onboarding_status,
      p.headline,
      p.home_market
    from public.contractor_companies c
    left join public.contractor_public_profiles p
      on p.company_id = c.id
  ),
  teams_data as (
    select
      t.company_id,
      count(*)::int as available_teams_count
    from public.teams t
    where t.status = 'active'
    group by t.company_id
  ),
  insurance_data as (
    select
      d.company_id,
      array_agg(distinct it.name order by it.name) as insurance_types
    from public.documents d
    join public.insurance_types it on it.id = d.insurance_type_id
    where d.doc_kind = 'insurance'
      and d.verification_status = 'approved'
      and d.expires_at >= current_date
    group by d.company_id
  ),
  cert_data as (
    select
      t.company_id,
      count(distinct d.id)::int as approved_cert_count,
      count(distinct m.id)::int as approved_team_members_count
    from public.teams t
    join public.team_members m on m.team_id = t.id
    left join public.documents d
      on d.team_member_id = m.id
     and d.doc_kind = 'cert'
     and d.verification_status = 'approved'
     and d.expires_at >= current_date
    where t.status = 'active'
    group by t.company_id
  ),
  thread_data as (
    select
      th.customer_id,
      th.contractor_company_id,
      th.id as thread_id,
      true as has_thread,
      th.last_message_at
    from public.customer_contractor_request_threads th
    where th.customer_id = p_customer_id
  )
  select
    b.customer_id,
    b.contractor_company_id,
    b.status,
    b.approval_requested_at,
    b.cooldown_until,
    b.request_count,
    pd.legal_name as contractor_legal_name,
    pd.dba_name as contractor_dba_name,
    pd.contractor_status,
    pd.contractor_onboarding_status,
    pd.headline,
    pd.home_market,
    coalesce(td2.available_teams_count, 0) as available_teams_count,
    coalesce(id2.insurance_types, '{}'::text[]) as insurance_types,
    coalesce(cd.approved_cert_count, 0) as approved_cert_count,
    coalesce(cd.approved_team_members_count, 0) as approved_team_members_count,
    th.thread_id,
    coalesce(th.has_thread, false) as has_thread,
    th.last_message_at
  from base b
  join profile_data pd on pd.company_id = b.contractor_company_id
  left join teams_data td2 on td2.company_id = b.contractor_company_id
  left join insurance_data id2 on id2.company_id = b.contractor_company_id
  left join cert_data cd on cd.company_id = b.contractor_company_id
  left join thread_data th
    on th.customer_id = b.customer_id
   and th.contractor_company_id = b.contractor_company_id
  order by b.approval_requested_at asc nulls last;
$$;


ALTER FUNCTION "public"."list_customer_pending_contractor_requests"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_customer_resources_for_contractor"("p_customer_id" "uuid") RETURNS TABLE("id" "uuid", "customer_id" "uuid", "title" "text", "description" "text", "category" "text", "file_name" "text", "revision_label" "text", "effective_date" "date", "expires_at" "date", "is_required" boolean, "is_active" boolean, "audience_scope" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "is_acknowledged" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with my_company as (
    select cc.id as company_id
    from public.contractor_companies cc
    where cc.owner_user_id = auth.uid()
    limit 1
  )
  select
    r.id,
    r.customer_id,
    r.title,
    r.description,
    r.category,
    r.file_name,
    r.revision_label,
    r.effective_date,
    r.expires_at,
    r.is_required,
    r.is_active,
    r.audience_scope,
    r.created_at,
    r.updated_at,
    exists (
      select 1
      from public.customer_resource_acknowledgements a
      join my_company mc on mc.company_id = a.contractor_company_id
      where a.resource_id = r.id
    ) as is_acknowledged
  from public.customer_resources r
  where r.customer_id = p_customer_id
    and r.is_active = true
    and public.current_contractor_has_customer_approval(p_customer_id)
    and public.current_contractor_matches_resource_market(r.id)
  order by r.created_at desc;
$$;


ALTER FUNCTION "public"."list_customer_resources_for_contractor"("p_customer_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customer_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "mime_type" "text",
    "file_size_bytes" bigint,
    "revision_label" "text",
    "effective_date" "date",
    "expires_at" "date",
    "is_required" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "audience_scope" "text" DEFAULT 'all_markets'::"text" NOT NULL,
    CONSTRAINT "customer_resources_audience_scope_check" CHECK (("audience_scope" = ANY (ARRAY['all_markets'::"text", 'selected_markets'::"text"]))),
    CONSTRAINT "customer_resources_category_check" CHECK (("category" = ANY (ARRAY['standard'::"text", 'sop'::"text", 'mop'::"text", 'training'::"text", 'safety'::"text", 'closeout'::"text", 'diagram'::"text", 'template'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."customer_resources" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_customer_resources_for_owner"("p_customer_id" "uuid") RETURNS SETOF "public"."customer_resources"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select r.*
  from public.customer_resources r
  where r.customer_id = p_customer_id
    and public.current_user_owns_customer(p_customer_id)
  order by r.created_at desc;
$$;


ALTER FUNCTION "public"."list_customer_resources_for_owner"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_marketplace_contractors"("p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("company_id" "uuid", "legal_name" "text", "dba_name" "text", "headline" "text", "home_market" "text", "markets" "text"[], "available_teams_count" integer, "insurance_types" "text"[], "average_rating" numeric, "reviews_count" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with base as (
    select
      c.id as company_id,
      c.legal_name,
      c.dba_name,
      p.headline,
      p.home_market,
      p.markets
    from public.contractor_companies c
    join public.contractor_public_profiles p
      on p.company_id = c.id
    where c.status = 'active'
      and c.onboarding_status = 'approved'
      and p.is_listed = true
      and (
        p_search is null
        or trim(p_search) = ''
        or c.legal_name ilike '%' || trim(p_search) || '%'
        or coalesce(c.dba_name, '') ilike '%' || trim(p_search) || '%'
        or coalesce(p.headline, '') ilike '%' || trim(p_search) || '%'
        or coalesce(p.home_market, '') ilike '%' || trim(p_search) || '%'
      )
  ),
  team_counts as (
    select
      t.company_id,
      count(*)::int as available_teams_count
    from public.teams t
    where t.status = 'active'
      and not exists (
        select 1
        from public.team_availability_blocks b
        where b.team_id = t.id
          and b.status = 'busy'
          and current_date between b.start_date and b.end_date
      )
    group by t.company_id
  ),
  insurance_summary as (
    select
      d.company_id,
      array_agg(distinct it.name order by it.name) as insurance_types
    from public.documents d
    join public.insurance_types it
      on it.id = d.insurance_type_id
    where d.doc_kind = 'insurance'
      and d.verification_status = 'approved'
      and d.expires_at >= current_date
    group by d.company_id
  ),
  rating_summary as (
    select
      contractor_company_id as company_id,
      round(avg(rating)::numeric, 2) as average_rating,
      count(*)::int as reviews_count
    from public.work_reviews
    where reviewee_role = 'contractor'
      and contractor_company_id is not null
    group by contractor_company_id
  )
  select
    b.company_id,
    b.legal_name,
    b.dba_name,
    b.headline,
    b.home_market,
    coalesce(b.markets, '{}'::text[]) as markets,
    coalesce(tc.available_teams_count, 0) as available_teams_count,
    coalesce(ins.insurance_types, '{}'::text[]) as insurance_types,
    coalesce(rs.average_rating, 0) as average_rating,
    coalesce(rs.reviews_count, 0) as reviews_count
  from base b
  left join team_counts tc on tc.company_id = b.company_id
  left join insurance_summary ins on ins.company_id = b.company_id
  left join rating_summary rs on rs.company_id = b.company_id
  order by b.legal_name asc;
$$;


ALTER FUNCTION "public"."list_marketplace_contractors"("p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_customer_resource_event"("p_resource_id" "uuid", "p_event_type" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_resource public.customer_resources%rowtype;
  v_company_id uuid;
begin
  if p_event_type not in ('view', 'download') then
    raise exception 'Invalid event type';
  end if;

  select *
  into v_resource
  from public.customer_resources
  where id = p_resource_id
    and is_active = true;

  if not found then
    raise exception 'Resource not found';
  end if;

  if not public.current_contractor_has_customer_approval(v_resource.customer_id) then
    raise exception 'Access denied';
  end if;

  if not public.current_contractor_matches_resource_market(v_resource.id) then
    raise exception 'Access denied for this market';
  end if;

  select cc.id
  into v_company_id
  from public.contractor_companies cc
  where cc.owner_user_id = auth.uid()
  limit 1;

  if v_company_id is null then
    raise exception 'Contractor company not found';
  end if;

  insert into public.customer_resource_events (
    resource_id,
    contractor_company_id,
    actor_user_id,
    event_type
  )
  values (
    v_resource.id,
    v_company_id,
    auth.uid(),
    p_event_type
  );

  return jsonb_build_object(
    'ok', true
  );
end;
$$;


ALTER FUNCTION "public"."log_customer_resource_event"("p_resource_id" "uuid", "p_event_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_team_request_redecision"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if old.status in ('approved', 'rejected') and new.status <> old.status then
    raise exception 'This team change request has already been finalized.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_team_request_redecision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_company_status"("p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  issues jsonb;
  is_ok boolean;
  owner_ok boolean;
  reason text := '';
begin
  owner_ok := exists (
    select 1
    from public.contractor_companies c
    where c.id = p_company_id
      and c.owner_user_id = auth.uid()
  );

  if not owner_ok and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  issues := public.company_insurance_issues(p_company_id);
  is_ok := (issues->>'is_eligible')::boolean;

  if is_ok then
    update public.contractor_companies
      set status = 'active', block_reason = null
    where id = p_company_id;
    return;
  end if;

  -- собираем причину
  if jsonb_array_length(issues->'missing') > 0 then
    reason := reason || 'Missing: ' || (select string_agg(x, ', ') from jsonb_array_elements_text(issues->'missing') as x) || '. ';
  end if;

  if jsonb_array_length(issues->'expired') > 0 then
    reason := reason || 'Expired: ' || (select string_agg(x, ', ') from jsonb_array_elements_text(issues->'expired') as x) || '. ';
  end if;

  if jsonb_array_length(issues->'not_approved') > 0 then
    reason := reason || 'Not approved: ' || (select string_agg(x, ', ') from jsonb_array_elements_text(issues->'not_approved') as x) || '. ';
  end if;

  if reason = '' then
    reason := 'Missing/expired required insurance';
  end if;

  update public.contractor_companies
    set status = 'blocked', block_reason = trim(reason)
  where id = p_company_id;
end;
$$;


ALTER FUNCTION "public"."recalc_company_status"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_customer_approval"("p_customer_id" "uuid", "p_contractor_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company public.contractor_companies%rowtype;
  v_row public.customer_contractors%rowtype;
  v_now timestamptz := now();
  v_cooldown interval := interval '180 days';
  v_next timestamptz;
begin
  select *
  into v_company
  from public.contractor_companies
  where id = p_contractor_company_id
    and owner_user_id = auth.uid();

  if not found then
    raise exception 'Company not found or not owned by current user';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
  ) then
    raise exception 'Customer not found';
  end if;

  select *
  into v_row
  from public.customer_contractors
  where customer_id = p_customer_id
    and contractor_company_id = p_contractor_company_id;

  if found and v_row.status = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'status', 'approved',
      'message', 'Already approved'
    );
  end if;

  if found and v_row.cooldown_until is not null and v_row.cooldown_until > v_now then
    insert into public.customer_contractor_application_events (
      customer_id,
      contractor_company_id,
      event_type,
      actor_user_id,
      note,
      meta
    )
    values (
      p_customer_id,
      p_contractor_company_id,
      'cooldown_blocked',
      auth.uid(),
      'Approval request blocked by cooldown',
      jsonb_build_object('cooldown_until', v_row.cooldown_until)
    );

    return jsonb_build_object(
      'ok', false,
      'status', coalesce(v_row.status, 'pending'),
      'cooldown_until', v_row.cooldown_until,
      'message', 'Cooldown active'
    );
  end if;

  v_next := v_now + v_cooldown;

  insert into public.customer_contractors (
    customer_id,
    contractor_company_id,
    status,
    approval_requested_at,
    last_applied_at,
    cooldown_until,
    request_count
  )
  values (
    p_customer_id,
    p_contractor_company_id,
    'pending',
    v_now,
    v_now,
    v_next,
    1
  )
  on conflict (customer_id, contractor_company_id)
  do update set
    status = 'pending',
    approval_requested_at = v_now,
    last_applied_at = v_now,
    cooldown_until = v_next,
    request_count = public.customer_contractors.request_count + 1;

  insert into public.customer_contractor_application_events (
    customer_id,
    contractor_company_id,
    event_type,
    actor_user_id,
    note
  )
  values (
    p_customer_id,
    p_contractor_company_id,
    'requested',
    auth.uid(),
    'Contractor requested customer approval'
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'pending',
    'cooldown_until', v_next,
    'message', 'Approval request sent'
  );
end;
$$;


ALTER FUNCTION "public"."request_customer_approval"("p_customer_id" "uuid", "p_contractor_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_customer_agreement_template_default"("p_template_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tpl public.customer_agreement_templates%rowtype;
begin
  select *
  into v_tpl
  from public.customer_agreement_templates
  where id = p_template_id;

  if not found then
    raise exception 'Template not found';
  end if;

  if not public.current_user_owns_customer(v_tpl.customer_id) and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  update public.customer_agreement_templates
  set is_default = false
  where customer_id = v_tpl.customer_id
    and template_type = v_tpl.template_type;

  update public.customer_agreement_templates
  set is_default = true
  where id = p_template_id;
end;
$$;


ALTER FUNCTION "public"."set_customer_agreement_template_default"("p_template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_feedback_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_feedback_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_bids"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_bids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_customer_contractor_to_vendor_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_status text;
begin
  if tg_op = 'DELETE' then
    delete from public.vendor_approvals
    where customer_id = old.customer_id
      and contractor_company_id = old.contractor_company_id;
    return old;
  end if;

  v_status :=
    case new.status
      when 'approved' then 'approved'
      when 'pending' then 'pending'
      when 'rejected' then 'rejected'
      else 'pending'
    end;

  insert into public.vendor_approvals (
    customer_id,
    contractor_company_id,
    status
  )
  values (
    new.customer_id,
    new.contractor_company_id,
    v_status
  )
  on conflict (customer_id, contractor_company_id)
  do update set
    status = excluded.status;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_customer_contractor_to_vendor_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_cert_count"("p_team_id" "uuid", "p_cert_type_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select count(distinct m.id)::int
  from public.team_members m
  join public.documents d on d.team_member_id = m.id
  where m.team_id = p_team_id
    and d.doc_kind = 'cert'
    and d.cert_type_id = p_cert_type_id
    and d.verification_status = 'approved'
    and d.expires_at >= current_date;
$$;


ALTER FUNCTION "public"."team_cert_count"("p_team_id" "uuid", "p_cert_type_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_meets_job_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_job_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select not exists (
    select 1
    from public.job_scopes js
    where js.job_id = p_job_id
      and public.team_meets_scope_for_customer(p_customer_id, p_team_id, js.scope_id) = false
  );
$$;


ALTER FUNCTION "public"."team_meets_job_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_meets_scope_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_scope_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select not exists (
    select 1
    from public.customer_scope_requirements r
    where r.customer_id = p_customer_id
      and r.scope_id = p_scope_id
      and public.team_cert_count(p_team_id, r.cert_type_id) < r.min_count_in_team
  );
$$;


ALTER FUNCTION "public"."team_meets_scope_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_scope_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_is_approved"("p_customer_id" "uuid", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.vendor_approvals va
    where va.customer_id = p_customer_id
      and va.contractor_company_id = p_company_id
      and va.status = 'approved'
  );
$$;


ALTER FUNCTION "public"."vendor_is_approved"("p_customer_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event" "text" NOT NULL,
    "path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bid_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bid_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text",
    "note" "text",
    "actor_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bid_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "price" integer NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "planned_start_date" "date",
    "planned_end_date" "date",
    "work_days" integer,
    "review_notes" "text",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bids_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'revision_requested'::"text", 'accepted'::"text", 'rejected'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cert_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text",
    "sort_order" integer,
    "code" "text",
    "issuer_hint" "text"
);


ALTER TABLE "public"."cert_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_change_request_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text",
    "file_path" "text" NOT NULL,
    "file_public_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_change_request_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_change_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "request_type" "text" DEFAULT 'company_data_change'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "proposed_legal_name" "text",
    "proposed_dba_name" "text",
    "proposed_fein" "text",
    "proposed_phone" "text",
    "proposed_email" "text",
    "proposed_address_line1" "text",
    "proposed_address_line2" "text",
    "proposed_city" "text",
    "proposed_state" "text",
    "proposed_zip" "text",
    "proposed_country" "text",
    "proposed_bank_account_holder" "text",
    "proposed_bank_routing" "text",
    "proposed_bank_account" "text",
    "comment" "text",
    "admin_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "company_change_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."company_change_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_coi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "issue_date" "date",
    "expiration_date" "date",
    "carrier_name" "text",
    "am_best_rating" "text",
    "admitted_carrier" boolean,
    "file_path" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "insured_name" "text",
    "broker_name" "text",
    "broker_phone" "text",
    "broker_email" "text",
    "certificate_holder" "text",
    "description_of_operations" "text",
    "additional_insured_text" "text",
    "waiver_of_subrogation_text" "text",
    "primary_non_contributory_text" "text",
    "included_entities_text" "text",
    "version_no" integer DEFAULT 1 NOT NULL,
    "archived_at" timestamp with time zone,
    CONSTRAINT "contractor_coi_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."contractor_coi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_coi_endorsements" (
    "coi_id" "uuid" NOT NULL,
    "endorsement_code" "text" NOT NULL,
    "notice_days" integer
);


ALTER TABLE "public"."contractor_coi_endorsements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_coi_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_coi_id" "uuid",
    "company_id" "uuid" NOT NULL,
    "issue_date" "date",
    "expiration_date" "date",
    "carrier_name" "text",
    "am_best_rating" "text",
    "admitted_carrier" boolean,
    "file_path" "text",
    "status" "text",
    "review_notes" "text",
    "insured_name" "text",
    "broker_name" "text",
    "broker_phone" "text",
    "broker_email" "text",
    "certificate_holder" "text",
    "description_of_operations" "text",
    "additional_insured_text" "text",
    "waiver_of_subrogation_text" "text",
    "primary_non_contributory_text" "text",
    "included_entities_text" "text",
    "version_no" integer DEFAULT 1 NOT NULL,
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractor_coi_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_coi_insured_entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coi_id" "uuid" NOT NULL,
    "entity_name" "text" NOT NULL,
    "entity_type" "text" DEFAULT 'additional_insured'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractor_coi_insured_entities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_coi_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coi_id" "uuid" NOT NULL,
    "insurance_type_id" "uuid" NOT NULL,
    "issue_date" "date",
    "expiration_date" "date",
    "policy_number" "text",
    "limits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractor_coi_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_coi_supporting_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coi_id" "uuid" NOT NULL,
    "uploaded_by" "uuid",
    "file_name" "text",
    "file_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractor_coi_supporting_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "legal_name" "text" NOT NULL,
    "dba_name" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "block_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "insurance_mode" "text" DEFAULT 'either'::"text" NOT NULL,
    "fein" "text",
    "phone" "text",
    "email" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "country" "text" DEFAULT 'US'::"text",
    "bank_account_holder" "text",
    "bank_routing" "text",
    "bank_account" "text",
    "onboarding_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "payout_method_type" "text",
    "payout_account_label" "text",
    "payout_contact_email" "text",
    "payout_contact_phone" "text",
    "payout_external_ref" "text",
    "billing_method_type" "text",
    "billing_account_label" "text",
    "billing_contact_email" "text",
    "billing_contact_phone" "text",
    "billing_external_ref" "text",
    "billing_provider" "text",
    "billing_customer_id" "text",
    "billing_payment_method_id" "text",
    "billing_card_brand" "text",
    "billing_last4" "text",
    "billing_exp_month" integer,
    "billing_exp_year" integer,
    CONSTRAINT "contractor_companies_insurance_mode_check" CHECK (("insurance_mode" = ANY (ARRAY['coi_only'::"text", 'separate_only'::"text", 'either'::"text"]))),
    CONSTRAINT "contractor_companies_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'approved'::"text"]))),
    CONSTRAINT "contractor_companies_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."contractor_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_insurance_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "insurance_type_id" "uuid" NOT NULL,
    "issue_date" "date",
    "expiration_date" "date" NOT NULL,
    "policy_number" "text",
    "limits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "carrier_name" "text",
    "am_best_rating" "text",
    "admitted_carrier" boolean,
    "file_path" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contractor_insurance_policies_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."contractor_insurance_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_public_profiles" (
    "company_id" "uuid" NOT NULL,
    "headline" "text",
    "markets" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_listed" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "home_market" "text"
);


ALTER TABLE "public"."contractor_public_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_agreement_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "template_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "file_name" "text",
    "file_path" "text" NOT NULL,
    "applies_to" "text" DEFAULT 'both'::"text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_agreement_templates_applies_to_check" CHECK (("applies_to" = ANY (ARRAY['onboarding'::"text", 'per_job'::"text", 'both'::"text"]))),
    CONSTRAINT "customer_agreement_templates_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))),
    CONSTRAINT "customer_agreement_templates_template_type_check" CHECK (("template_type" = ANY (ARRAY['msa'::"text", 'service_agreement'::"text", 'one_time_project_agreement'::"text"])))
);


ALTER TABLE "public"."customer_agreement_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid",
    "job_id" "uuid",
    "template_id" "uuid",
    "agreement_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "file_name" "text",
    "file_path" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "source" "text" DEFAULT 'template'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "effective_date" "date",
    "expiration_date" "date",
    "terminated_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "internal_notes" "text",
    "contractor_notes" "text",
    CONSTRAINT "customer_agreements_agreement_type_check" CHECK (("agreement_type" = ANY (ARRAY['msa'::"text", 'service_agreement'::"text", 'one_time_project_agreement'::"text"]))),
    CONSTRAINT "customer_agreements_source_check" CHECK (("source" = ANY (ARRAY['template'::"text", 'manual_upload'::"text"]))),
    CONSTRAINT "customer_agreements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'awaiting_signature'::"text", 'signed'::"text", 'active'::"text", 'expired'::"text", 'terminated'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."customer_agreements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contractor_application_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_user_id" "uuid",
    "note" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_contractor_application_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['requested'::"text", 'approved'::"text", 'rejected'::"text", 'cooldown_blocked'::"text"])))
);


ALTER TABLE "public"."customer_contractor_application_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contractor_request_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "sender_user_id" "uuid" NOT NULL,
    "sender_role" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_contractor_request_messages_sender_role_check" CHECK (("sender_role" = ANY (ARRAY['customer'::"text", 'contractor'::"text"])))
);


ALTER TABLE "public"."customer_contractor_request_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contractor_request_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid" NOT NULL,
    "customer_contractor_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_by_customer_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_contractor_request_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contractors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approval_requested_at" timestamp with time zone,
    "last_applied_at" timestamp with time zone,
    "cooldown_until" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "request_count" integer DEFAULT 0 NOT NULL,
    "customer_note" "text",
    "contractor_note" "text",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    CONSTRAINT "customer_contractors_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."customer_contractors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_insurance_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "min_days_before_expiration" integer DEFAULT 0 NOT NULL,
    "hard_block_if_expired" boolean DEFAULT true NOT NULL,
    "warning_days_before_expiration" integer DEFAULT 30 NOT NULL,
    "min_am_best_rating" "text",
    "must_be_admitted_carrier" boolean DEFAULT false NOT NULL,
    "state_restrictions" "text",
    "bond_required" boolean DEFAULT false NOT NULL,
    "bid_bond" boolean DEFAULT false NOT NULL,
    "performance_bond" boolean DEFAULT false NOT NULL,
    "payment_bond" boolean DEFAULT false NOT NULL,
    "bond_amount_percent" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "minimum_days_before_expiration" integer DEFAULT 0,
    "notice_of_cancellation_days" integer DEFAULT 30,
    "minimum_am_best_rating" "text"
);


ALTER TABLE "public"."customer_insurance_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_insurance_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "insurance_type_id" "uuid" NOT NULL,
    "is_required" boolean DEFAULT true NOT NULL,
    "min_limit_each_occurrence" bigint,
    "min_limit_aggregate" bigint,
    "require_additional_insured" boolean DEFAULT false NOT NULL,
    "require_blanket_additional_insured" boolean DEFAULT false NOT NULL,
    "require_primary_noncontributory" boolean DEFAULT false NOT NULL,
    "require_waiver_subrogation" boolean DEFAULT false NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."customer_insurance_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_required_endorsements" (
    "config_id" "uuid" NOT NULL,
    "endorsement_code" "text" NOT NULL,
    "notice_days" integer
);


ALTER TABLE "public"."customer_required_endorsements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_resource_acknowledgements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid" NOT NULL,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_resource_acknowledgements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_resource_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "event_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_resource_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['view'::"text", 'download'::"text", 'acknowledged'::"text"])))
);


ALTER TABLE "public"."customer_resource_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_resource_markets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "market" "text" NOT NULL
);


ALTER TABLE "public"."customer_resource_markets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_scope_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "scope_id" "uuid" NOT NULL,
    "cert_type_id" "uuid" NOT NULL,
    "min_count_in_team" integer DEFAULT 1 NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."customer_scope_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legal_name" "text",
    "dba_name" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customers"."name" IS 'Legacy field. Kept for backward compatibility.';



COMMENT ON COLUMN "public"."customers"."legal_name" IS 'Official customer legal name.';



COMMENT ON COLUMN "public"."customers"."dba_name" IS 'Customer DBA or display name.';



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "team_member_id" "uuid",
    "doc_kind" "text" NOT NULL,
    "cert_type_id" "uuid",
    "insurance_type_id" "uuid",
    "file_path" "text" NOT NULL,
    "file_public_url" "text" NOT NULL,
    "expires_at" "date" NOT NULL,
    "verification_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "verification_note" "text",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "documents_doc_kind_check" CHECK (("doc_kind" = ANY (ARRAY['insurance'::"text", 'cert'::"text"]))),
    CONSTRAINT "documents_owner_check" CHECK (((("company_id" IS NOT NULL) AND ("team_member_id" IS NULL) AND ("doc_kind" = 'insurance'::"text")) OR (("team_member_id" IS NOT NULL) AND ("company_id" IS NULL) AND ("doc_kind" = 'cert'::"text")))),
    CONSTRAINT "documents_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."endorsement_types" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."endorsement_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "role" "text",
    "source" "text" NOT NULL,
    "area" "text",
    "message" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "path" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "role" "text",
    "source" "text" NOT NULL,
    "customer_id" "uuid",
    "contractor_company_id" "uuid",
    "guest_name" "text",
    "guest_email" "text",
    "category" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "path" "text",
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "feedback_items_category_check" CHECK (("category" = ANY (ARRAY['bug'::"text", 'feature_request'::"text", 'ux_issue'::"text", 'billing'::"text", 'account'::"text", 'other'::"text"]))),
    CONSTRAINT "feedback_items_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text"]))),
    CONSTRAINT "feedback_items_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'contractor'::"text", 'admin'::"text", 'unknown'::"text"]))),
    CONSTRAINT "feedback_items_source_check" CHECK (("source" = ANY (ARRAY['public'::"text", 'landing'::"text", 'signup'::"text", 'login'::"text", 'dashboard'::"text", 'customer'::"text", 'contractor'::"text", 'admin'::"text"]))),
    CONSTRAINT "feedback_items_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'in_review'::"text", 'waiting_for_user'::"text", 'planned'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."feedback_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sender_user_id" "uuid",
    "sender_role" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    CONSTRAINT "feedback_messages_sender_role_check" CHECK (("sender_role" = ANY (ARRAY['guest'::"text", 'customer'::"text", 'contractor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."feedback_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insurance_policy_data" (
    "document_id" "uuid" NOT NULL,
    "limit_each_occurrence" bigint,
    "limit_aggregate" bigint,
    "has_additional_insured" boolean,
    "has_blanket_additional_insured" boolean,
    "has_primary_noncontributory" boolean,
    "has_waiver_subrogation" boolean,
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."insurance_policy_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insurance_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text",
    "is_core" boolean DEFAULT true NOT NULL,
    "limit_schema" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."insurance_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "bid_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "awarded_price" integer NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "awarded_by" "uuid"
);


ALTER TABLE "public"."job_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "content_type" "text",
    "size_bytes" bigint,
    "uploaded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_required_certs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "cert_type_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_required_certs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_scopes" (
    "job_id" "uuid" NOT NULL,
    "scope_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_scopes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "budget_min" integer,
    "budget_max" integer,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_id" "uuid",
    "scope_id" "uuid",
    "deadline_date" "date",
    "archived_at" timestamp with time zone,
    "archive_reason" "text",
    "visibility_mode" "text" DEFAULT 'public'::"text" NOT NULL,
    "requires_one_time_contract" boolean DEFAULT false NOT NULL,
    "agreement_template_id" "uuid",
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"]))),
    CONSTRAINT "jobs_visibility_mode_check" CHECK (("visibility_mode" = ANY (ARRAY['public'::"text", 'qualified_only'::"text", 'approved_only'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."jobs_public" AS
 SELECT "id",
    "customer_id",
    "scope_id",
    "title",
    "description",
    "location",
    "status",
    "created_at"
   FROM "public"."jobs" "j";


ALTER VIEW "public"."jobs_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "terms_accepted_at" timestamp with time zone,
    "privacy_accepted_at" timestamp with time zone,
    "customer_agreement_accepted_at" timestamp with time zone,
    "contractor_agreement_accepted_at" timestamp with time zone,
    "role_selected_at" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'contractor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."required_company_insurance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "insurance_type_id" "uuid" NOT NULL,
    "is_required" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."required_company_insurance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scopes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."scopes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_availability_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'busy'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "team_availability_blocks_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'busy'::"text", 'tentative'::"text"])))
);


ALTER TABLE "public"."team_availability_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_change_request_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "role_title" "text",
    "phone" "text",
    "email" "text",
    "date_of_birth" "date",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_change_request_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_change_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "team_change_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."team_change_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "block_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "teams_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."team_change_requests_with_company" AS
 SELECT "r"."id",
    "r"."company_id",
    "r"."team_id",
    "r"."requested_by",
    "r"."reason",
    "r"."status",
    "r"."admin_note",
    "r"."created_at",
    "r"."updated_at",
    "c"."legal_name" AS "company_legal_name",
    "c"."dba_name" AS "company_dba_name",
    "t"."name" AS "team_name"
   FROM (("public"."team_change_requests" "r"
     LEFT JOIN "public"."contractor_companies" "c" ON (("c"."id" = "r"."company_id")))
     LEFT JOIN "public"."teams" "t" ON (("t"."id" = "r"."team_id")));


ALTER VIEW "public"."team_change_requests_with_company" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "role_title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "email" "text",
    "date_of_birth" "date",
    "role" "public"."team_member_role",
    "role_custom" "text"
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contractor_company_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by_admin" "uuid",
    "reviewed_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vendor_approvals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."vendor_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "customer_id" "uuid",
    "contractor_company_id" "uuid",
    "reviewer_user_id" "uuid" NOT NULL,
    "reviewer_role" "text" NOT NULL,
    "reviewee_role" "text" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "work_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "work_reviews_reviewee_role_check" CHECK (("reviewee_role" = ANY (ARRAY['customer'::"text", 'contractor'::"text"]))),
    CONSTRAINT "work_reviews_reviewer_role_check" CHECK (("reviewer_role" = ANY (ARRAY['customer'::"text", 'contractor'::"text"])))
);


ALTER TABLE "public"."work_reviews" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bid_events"
    ADD CONSTRAINT "bid_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cert_types"
    ADD CONSTRAINT "cert_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."cert_types"
    ADD CONSTRAINT "cert_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."cert_types"
    ADD CONSTRAINT "cert_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_change_request_files"
    ADD CONSTRAINT "company_change_request_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_change_requests"
    ADD CONSTRAINT "company_change_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_coi"
    ADD CONSTRAINT "contractor_coi_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."contractor_coi"
    ADD CONSTRAINT "contractor_coi_company_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."contractor_coi_endorsements"
    ADD CONSTRAINT "contractor_coi_endorsements_pkey" PRIMARY KEY ("coi_id", "endorsement_code");



ALTER TABLE ONLY "public"."contractor_coi_endorsements"
    ADD CONSTRAINT "contractor_coi_endorsements_unique" UNIQUE ("coi_id", "endorsement_code");



ALTER TABLE ONLY "public"."contractor_coi_history"
    ADD CONSTRAINT "contractor_coi_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_coi_insured_entities"
    ADD CONSTRAINT "contractor_coi_insured_entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_coi"
    ADD CONSTRAINT "contractor_coi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_coi_policies"
    ADD CONSTRAINT "contractor_coi_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_coi_supporting_files"
    ADD CONSTRAINT "contractor_coi_supporting_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_coi"
    ADD CONSTRAINT "contractor_coi_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."contractor_companies"
    ADD CONSTRAINT "contractor_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_insurance_policies"
    ADD CONSTRAINT "contractor_insurance_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_public_profiles"
    ADD CONSTRAINT "contractor_public_profiles_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."customer_agreement_templates"
    ADD CONSTRAINT "customer_agreement_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_agreements"
    ADD CONSTRAINT "customer_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contractor_application_events"
    ADD CONSTRAINT "customer_contractor_application_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contractor_request_messages"
    ADD CONSTRAINT "customer_contractor_request_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contractor_request_threads"
    ADD CONSTRAINT "customer_contractor_request_t_customer_id_contractor_compan_key" UNIQUE ("customer_id", "contractor_company_id");



ALTER TABLE ONLY "public"."customer_contractor_request_threads"
    ADD CONSTRAINT "customer_contractor_request_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contractors"
    ADD CONSTRAINT "customer_contractors_customer_id_contractor_company_id_key" UNIQUE ("customer_id", "contractor_company_id");



ALTER TABLE ONLY "public"."customer_contractors"
    ADD CONSTRAINT "customer_contractors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contractors"
    ADD CONSTRAINT "customer_contractors_unique" UNIQUE ("customer_id", "contractor_company_id");



ALTER TABLE ONLY "public"."customer_insurance_config"
    ADD CONSTRAINT "customer_insurance_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_insurance_config"
    ADD CONSTRAINT "customer_insurance_config_unique" UNIQUE ("customer_id");



ALTER TABLE ONLY "public"."customer_insurance_requirements"
    ADD CONSTRAINT "customer_insurance_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_insurance_requirements"
    ADD CONSTRAINT "customer_insurance_requirements_unique" UNIQUE ("customer_id", "insurance_type_id");



ALTER TABLE ONLY "public"."customer_required_endorsements"
    ADD CONSTRAINT "customer_required_endorsements_pkey" PRIMARY KEY ("config_id", "endorsement_code");



ALTER TABLE ONLY "public"."customer_resource_acknowledgements"
    ADD CONSTRAINT "customer_resource_acknowledge_resource_id_contractor_compan_key" UNIQUE ("resource_id", "contractor_company_id");



ALTER TABLE ONLY "public"."customer_resource_acknowledgements"
    ADD CONSTRAINT "customer_resource_acknowledgements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_resource_events"
    ADD CONSTRAINT "customer_resource_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_resource_markets"
    ADD CONSTRAINT "customer_resource_markets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_resources"
    ADD CONSTRAINT "customer_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_scope_requirements"
    ADD CONSTRAINT "customer_scope_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_scope_requirements"
    ADD CONSTRAINT "customer_scope_requirements_unique" UNIQUE ("customer_id", "scope_id", "cert_type_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."endorsement_types"
    ADD CONSTRAINT "endorsement_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_messages"
    ADD CONSTRAINT "feedback_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insurance_policy_data"
    ADD CONSTRAINT "insurance_policy_data_pkey" PRIMARY KEY ("document_id");



ALTER TABLE ONLY "public"."insurance_types"
    ADD CONSTRAINT "insurance_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."insurance_types"
    ADD CONSTRAINT "insurance_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."insurance_types"
    ADD CONSTRAINT "insurance_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_bid_id_key" UNIQUE ("bid_id");



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_required_certs"
    ADD CONSTRAINT "job_required_certs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_scopes"
    ADD CONSTRAINT "job_scopes_pkey" PRIMARY KEY ("job_id", "scope_id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."required_company_insurance"
    ADD CONSTRAINT "required_company_insurance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scopes"
    ADD CONSTRAINT "scopes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."scopes"
    ADD CONSTRAINT "scopes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_availability_blocks"
    ADD CONSTRAINT "team_availability_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_change_request_members"
    ADD CONSTRAINT "team_change_request_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_approvals"
    ADD CONSTRAINT "vendor_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_reviews"
    ADD CONSTRAINT "work_reviews_pkey" PRIMARY KEY ("id");



CREATE INDEX "analytics_events_created_at_idx" ON "public"."analytics_events" USING "btree" ("created_at" DESC);



CREATE INDEX "analytics_events_event_created_at_idx" ON "public"."analytics_events" USING "btree" ("event", "created_at" DESC);



CREATE INDEX "analytics_events_event_idx" ON "public"."analytics_events" USING "btree" ("event");



CREATE INDEX "analytics_events_role_idx" ON "public"."analytics_events" USING "btree" ("role");



CREATE INDEX "analytics_events_user_id_idx" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "contractor_coi_company_id_idx" ON "public"."contractor_coi" USING "btree" ("company_id");



CREATE INDEX "contractor_coi_company_idx" ON "public"."contractor_coi" USING "btree" ("company_id");



CREATE INDEX "contractor_coi_end_coi_idx" ON "public"."contractor_coi_endorsements" USING "btree" ("coi_id");



CREATE INDEX "contractor_coi_endorsements_coi_id_idx" ON "public"."contractor_coi_endorsements" USING "btree" ("coi_id");



CREATE INDEX "contractor_coi_insured_entities_coi_id_idx" ON "public"."contractor_coi_insured_entities" USING "btree" ("coi_id");



CREATE INDEX "contractor_coi_policies_coi_id_idx" ON "public"."contractor_coi_policies" USING "btree" ("coi_id");



CREATE INDEX "contractor_coi_policies_coi_idx" ON "public"."contractor_coi_policies" USING "btree" ("coi_id");



CREATE INDEX "contractor_coi_policies_type_id_idx" ON "public"."contractor_coi_policies" USING "btree" ("insurance_type_id");



CREATE INDEX "contractor_companies_owner_user_id_idx" ON "public"."contractor_companies" USING "btree" ("owner_user_id");



CREATE UNIQUE INDEX "contractor_company_owner_unique" ON "public"."contractor_companies" USING "btree" ("owner_user_id");



CREATE INDEX "customer_agreements_contractor_company_id_idx" ON "public"."customer_agreements" USING "btree" ("contractor_company_id");



CREATE INDEX "customer_agreements_created_at_idx" ON "public"."customer_agreements" USING "btree" ("created_at" DESC);



CREATE INDEX "customer_agreements_customer_id_idx" ON "public"."customer_agreements" USING "btree" ("customer_id");



CREATE INDEX "customer_agreements_signed_at_idx" ON "public"."customer_agreements" USING "btree" ("signed_at" DESC);



CREATE INDEX "customer_agreements_status_idx" ON "public"."customer_agreements" USING "btree" ("status");



CREATE INDEX "customer_contractors_contractor_company_id_idx" ON "public"."customer_contractors" USING "btree" ("contractor_company_id");



CREATE INDEX "customer_contractors_customer_id_idx" ON "public"."customer_contractors" USING "btree" ("customer_id");



CREATE INDEX "customer_resource_ack_company_idx" ON "public"."customer_resource_acknowledgements" USING "btree" ("contractor_company_id");



CREATE INDEX "customer_resource_ack_resource_idx" ON "public"."customer_resource_acknowledgements" USING "btree" ("resource_id");



CREATE INDEX "customer_resource_events_company_idx" ON "public"."customer_resource_events" USING "btree" ("contractor_company_id");



CREATE INDEX "customer_resource_events_resource_idx" ON "public"."customer_resource_events" USING "btree" ("resource_id");



CREATE INDEX "customer_resource_markets_market_idx" ON "public"."customer_resource_markets" USING "btree" ("market");



CREATE INDEX "customer_resource_markets_resource_idx" ON "public"."customer_resource_markets" USING "btree" ("resource_id");



CREATE UNIQUE INDEX "customer_resource_markets_unique" ON "public"."customer_resource_markets" USING "btree" ("resource_id", "market");



CREATE INDEX "error_logs_area_idx" ON "public"."error_logs" USING "btree" ("area");



CREATE INDEX "error_logs_created_at_idx" ON "public"."error_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "error_logs_role_idx" ON "public"."error_logs" USING "btree" ("role");



CREATE INDEX "error_logs_source_idx" ON "public"."error_logs" USING "btree" ("source");



CREATE INDEX "error_logs_user_id_idx" ON "public"."error_logs" USING "btree" ("user_id");



CREATE INDEX "feedback_items_contractor_company_id_idx" ON "public"."feedback_items" USING "btree" ("contractor_company_id");



CREATE INDEX "feedback_items_customer_id_idx" ON "public"."feedback_items" USING "btree" ("customer_id");



CREATE INDEX "feedback_items_last_message_at_idx" ON "public"."feedback_items" USING "btree" ("last_message_at" DESC);



CREATE INDEX "feedback_items_role_idx" ON "public"."feedback_items" USING "btree" ("role");



CREATE INDEX "feedback_items_source_idx" ON "public"."feedback_items" USING "btree" ("source");



CREATE INDEX "feedback_items_status_idx" ON "public"."feedback_items" USING "btree" ("status");



CREATE INDEX "feedback_items_user_id_idx" ON "public"."feedback_items" USING "btree" ("user_id");



CREATE INDEX "feedback_messages_feedback_id_idx" ON "public"."feedback_messages" USING "btree" ("feedback_id", "created_at");



CREATE INDEX "idx_bid_events_bid_id" ON "public"."bid_events" USING "btree" ("bid_id");



CREATE INDEX "idx_bid_events_created_at" ON "public"."bid_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bids_job" ON "public"."bids" USING "btree" ("job_id");



CREATE INDEX "idx_cert_types_category" ON "public"."cert_types" USING "btree" ("category", "sort_order");



CREATE INDEX "idx_cert_types_category_sort" ON "public"."cert_types" USING "btree" ("category", "sort_order");



CREATE INDEX "idx_certificate_types_category" ON "public"."cert_types" USING "btree" ("category", "sort_order");



CREATE INDEX "idx_companies_owner" ON "public"."contractor_companies" USING "btree" ("owner_user_id");



CREATE INDEX "idx_company_change_request_files_request_id" ON "public"."company_change_request_files" USING "btree" ("request_id");



CREATE INDEX "idx_company_change_requests_company_id" ON "public"."company_change_requests" USING "btree" ("company_id");



CREATE INDEX "idx_company_change_requests_requested_by" ON "public"."company_change_requests" USING "btree" ("requested_by");



CREATE INDEX "idx_company_change_requests_status" ON "public"."company_change_requests" USING "btree" ("status");



CREATE INDEX "idx_contractor_coi_company_id" ON "public"."contractor_coi" USING "btree" ("company_id");



CREATE INDEX "idx_contractor_coi_history_archived_at" ON "public"."contractor_coi_history" USING "btree" ("archived_at" DESC);



CREATE INDEX "idx_contractor_coi_history_company_id" ON "public"."contractor_coi_history" USING "btree" ("company_id");



CREATE INDEX "idx_contractor_coi_history_source_coi_id" ON "public"."contractor_coi_history" USING "btree" ("source_coi_id");



CREATE INDEX "idx_contractor_coi_supporting_files_coi_id" ON "public"."contractor_coi_supporting_files" USING "btree" ("coi_id");



CREATE INDEX "idx_contractor_companies_owner" ON "public"."contractor_companies" USING "btree" ("owner_user_id");



CREATE INDEX "idx_customer_agreement_templates_customer" ON "public"."customer_agreement_templates" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_customer_agreement_templates_customer_type" ON "public"."customer_agreement_templates" USING "btree" ("customer_id", "template_type");



CREATE INDEX "idx_customer_agreements_contractor" ON "public"."customer_agreements" USING "btree" ("contractor_company_id");



CREATE INDEX "idx_customer_agreements_customer" ON "public"."customer_agreements" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_customer_agreements_job" ON "public"."customer_agreements" USING "btree" ("job_id");



CREATE INDEX "idx_customer_contractor_application_events_lookup" ON "public"."customer_contractor_application_events" USING "btree" ("customer_id", "contractor_company_id", "created_at" DESC);



CREATE INDEX "idx_customer_contractor_request_messages_thread" ON "public"."customer_contractor_request_messages" USING "btree" ("thread_id", "created_at");



CREATE INDEX "idx_customer_contractor_request_threads_contractor" ON "public"."customer_contractor_request_threads" USING "btree" ("contractor_company_id", "last_message_at" DESC);



CREATE INDEX "idx_customer_contractor_request_threads_customer" ON "public"."customer_contractor_request_threads" USING "btree" ("customer_id", "last_message_at" DESC);



CREATE INDEX "idx_customer_contractors_contractor_company_status" ON "public"."customer_contractors" USING "btree" ("contractor_company_id", "status");



CREATE INDEX "idx_customer_contractors_customer_status" ON "public"."customer_contractors" USING "btree" ("customer_id", "status");



CREATE INDEX "idx_customers_owner" ON "public"."customers" USING "btree" ("owner_user_id");



CREATE INDEX "idx_documents_company" ON "public"."documents" USING "btree" ("company_id");



CREATE INDEX "idx_documents_member" ON "public"."documents" USING "btree" ("team_member_id");



CREATE INDEX "idx_documents_status" ON "public"."documents" USING "btree" ("verification_status");



CREATE INDEX "idx_job_awards_company" ON "public"."job_awards" USING "btree" ("contractor_company_id");



CREATE INDEX "idx_jobs_customer_archived" ON "public"."jobs" USING "btree" ("customer_id", "archived_at");



CREATE INDEX "idx_jobs_customer_status" ON "public"."jobs" USING "btree" ("customer_id", "status");



CREATE INDEX "idx_members_team" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_avail_team" ON "public"."team_availability_blocks" USING "btree" ("team_id");



CREATE INDEX "idx_team_change_request_members_request_id" ON "public"."team_change_request_members" USING "btree" ("request_id");



CREATE INDEX "idx_team_change_requests_company_id" ON "public"."team_change_requests" USING "btree" ("company_id");



CREATE INDEX "idx_team_change_requests_company_status" ON "public"."team_change_requests" USING "btree" ("company_id", "status");



CREATE INDEX "idx_team_change_requests_requested_by" ON "public"."team_change_requests" USING "btree" ("requested_by");



CREATE INDEX "idx_team_change_requests_status" ON "public"."team_change_requests" USING "btree" ("status");



CREATE INDEX "idx_team_change_requests_team_id" ON "public"."team_change_requests" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_dob" ON "public"."team_members" USING "btree" ("date_of_birth");



CREATE INDEX "idx_team_members_email" ON "public"."team_members" USING "btree" ("email");



CREATE INDEX "idx_teams_company" ON "public"."teams" USING "btree" ("company_id");



CREATE UNIQUE INDEX "insurance_types_code_uq" ON "public"."insurance_types" USING "btree" ("code");



CREATE INDEX "insurance_types_name_idx" ON "public"."insurance_types" USING "btree" ("name");



CREATE UNIQUE INDEX "uq_bid_job_company" ON "public"."bids" USING "btree" ("job_id", "company_id");



CREATE UNIQUE INDEX "uq_customer_agreement_templates_default_per_type" ON "public"."customer_agreement_templates" USING "btree" ("customer_id", "template_type") WHERE (("is_default" = true) AND ("status" = 'active'::"text"));



CREATE UNIQUE INDEX "uq_customer_contractors_customer_company" ON "public"."customer_contractors" USING "btree" ("customer_id", "contractor_company_id");



CREATE UNIQUE INDEX "uq_customer_ins_req" ON "public"."customer_insurance_requirements" USING "btree" ("customer_id", "insurance_type_id");



CREATE UNIQUE INDEX "uq_customer_scope_req" ON "public"."customer_scope_requirements" USING "btree" ("customer_id", "scope_id", "cert_type_id");



CREATE UNIQUE INDEX "uq_job_cert" ON "public"."job_required_certs" USING "btree" ("job_id", "cert_type_id");



CREATE UNIQUE INDEX "uq_required_insurance_type" ON "public"."required_company_insurance" USING "btree" ("insurance_type_id");



CREATE UNIQUE INDEX "uq_vendor_customer_company" ON "public"."vendor_approvals" USING "btree" ("customer_id", "contractor_company_id");



CREATE UNIQUE INDEX "vendor_approvals_customer_company_uniq" ON "public"."vendor_approvals" USING "btree" ("customer_id", "contractor_company_id");



CREATE OR REPLACE TRIGGER "trg_archive_contractor_coi_before_update" BEFORE UPDATE ON "public"."contractor_coi" FOR EACH ROW EXECUTE FUNCTION "public"."archive_contractor_coi_before_update"();



CREATE OR REPLACE TRIGGER "trg_bids_updated_at" BEFORE UPDATE ON "public"."bids" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_bids"();



CREATE OR REPLACE TRIGGER "trg_customer_agreements_updated_at" BEFORE UPDATE ON "public"."customer_agreements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_customer_resources_updated_at" BEFORE UPDATE ON "public"."customer_resources" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_feedback_items_updated_at" BEFORE UPDATE ON "public"."feedback_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_feedback_items_updated_at"();



CREATE OR REPLACE TRIGGER "trg_feedback_messages_bump_parent" AFTER INSERT ON "public"."feedback_messages" FOR EACH ROW EXECUTE FUNCTION "public"."bump_feedback_last_message_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_team_request_redecision" BEFORE UPDATE ON "public"."team_change_requests" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_team_request_redecision"();



CREATE OR REPLACE TRIGGER "trg_sync_customer_contractors_to_vendor_approvals" AFTER INSERT OR DELETE OR UPDATE ON "public"."customer_contractors" FOR EACH ROW EXECUTE FUNCTION "public"."sync_customer_contractor_to_vendor_approval"();



CREATE OR REPLACE TRIGGER "trg_team_change_requests_updated_at" BEFORE UPDATE ON "public"."team_change_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."bid_events"
    ADD CONSTRAINT "bid_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bid_events"
    ADD CONSTRAINT "bid_events_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_change_request_files"
    ADD CONSTRAINT "company_change_request_files_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."company_change_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_change_requests"
    ADD CONSTRAINT "company_change_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi"
    ADD CONSTRAINT "contractor_coi_company_fk" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi"
    ADD CONSTRAINT "contractor_coi_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_endorsements"
    ADD CONSTRAINT "contractor_coi_end_coi_fk" FOREIGN KEY ("coi_id") REFERENCES "public"."contractor_coi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_endorsements"
    ADD CONSTRAINT "contractor_coi_end_type_fk" FOREIGN KEY ("endorsement_code") REFERENCES "public"."endorsement_types"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contractor_coi_endorsements"
    ADD CONSTRAINT "contractor_coi_endorsements_coi_id_fkey" FOREIGN KEY ("coi_id") REFERENCES "public"."contractor_coi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_endorsements"
    ADD CONSTRAINT "contractor_coi_endorsements_endorsement_code_fkey" FOREIGN KEY ("endorsement_code") REFERENCES "public"."endorsement_types"("code");



ALTER TABLE ONLY "public"."contractor_coi_history"
    ADD CONSTRAINT "contractor_coi_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_insured_entities"
    ADD CONSTRAINT "contractor_coi_insured_entities_coi_id_fkey" FOREIGN KEY ("coi_id") REFERENCES "public"."contractor_coi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_policies"
    ADD CONSTRAINT "contractor_coi_policies_coi_fk" FOREIGN KEY ("coi_id") REFERENCES "public"."contractor_coi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_policies"
    ADD CONSTRAINT "contractor_coi_policies_coi_id_fkey" FOREIGN KEY ("coi_id") REFERENCES "public"."contractor_coi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_policies"
    ADD CONSTRAINT "contractor_coi_policies_insurance_fk" FOREIGN KEY ("insurance_type_id") REFERENCES "public"."insurance_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contractor_coi_policies"
    ADD CONSTRAINT "contractor_coi_policies_insurance_type_id_fkey" FOREIGN KEY ("insurance_type_id") REFERENCES "public"."insurance_types"("id");



ALTER TABLE ONLY "public"."contractor_coi_supporting_files"
    ADD CONSTRAINT "contractor_coi_supporting_files_coi_id_fkey" FOREIGN KEY ("coi_id") REFERENCES "public"."contractor_coi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_coi_supporting_files"
    ADD CONSTRAINT "contractor_coi_supporting_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contractor_companies"
    ADD CONSTRAINT "contractor_companies_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_insurance_policies"
    ADD CONSTRAINT "contractor_insurance_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_insurance_policies"
    ADD CONSTRAINT "contractor_insurance_policies_insurance_type_id_fkey" FOREIGN KEY ("insurance_type_id") REFERENCES "public"."insurance_types"("id");



ALTER TABLE ONLY "public"."contractor_public_profiles"
    ADD CONSTRAINT "contractor_public_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_agreement_templates"
    ADD CONSTRAINT "customer_agreement_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_agreement_templates"
    ADD CONSTRAINT "customer_agreement_templates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_agreements"
    ADD CONSTRAINT "customer_agreements_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_agreements"
    ADD CONSTRAINT "customer_agreements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_agreements"
    ADD CONSTRAINT "customer_agreements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_agreements"
    ADD CONSTRAINT "customer_agreements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_agreements"
    ADD CONSTRAINT "customer_agreements_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."customer_agreement_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_contractor_application_events"
    ADD CONSTRAINT "customer_contractor_application_even_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractor_application_events"
    ADD CONSTRAINT "customer_contractor_application_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractor_request_messages"
    ADD CONSTRAINT "customer_contractor_request_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractor_request_messages"
    ADD CONSTRAINT "customer_contractor_request_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."customer_contractor_request_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractor_request_threads"
    ADD CONSTRAINT "customer_contractor_request_th_created_by_customer_user_id_fkey" FOREIGN KEY ("created_by_customer_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractor_request_threads"
    ADD CONSTRAINT "customer_contractor_request_threads_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractor_request_threads"
    ADD CONSTRAINT "customer_contractor_request_threads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractors"
    ADD CONSTRAINT "customer_contractors_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractors"
    ADD CONSTRAINT "customer_contractors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contractors"
    ADD CONSTRAINT "customer_contractors_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_insurance_config"
    ADD CONSTRAINT "customer_insurance_config_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_insurance_requirements"
    ADD CONSTRAINT "customer_insurance_requirements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_insurance_requirements"
    ADD CONSTRAINT "customer_insurance_requirements_insurance_type_id_fkey" FOREIGN KEY ("insurance_type_id") REFERENCES "public"."insurance_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_required_endorsements"
    ADD CONSTRAINT "customer_required_endorsements_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."customer_insurance_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_required_endorsements"
    ADD CONSTRAINT "customer_required_endorsements_endorsement_code_fkey" FOREIGN KEY ("endorsement_code") REFERENCES "public"."endorsement_types"("code");



ALTER TABLE ONLY "public"."customer_resource_acknowledgements"
    ADD CONSTRAINT "customer_resource_acknowledgements_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_resource_acknowledgements"
    ADD CONSTRAINT "customer_resource_acknowledgements_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_resource_acknowledgements"
    ADD CONSTRAINT "customer_resource_acknowledgements_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."customer_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_resource_events"
    ADD CONSTRAINT "customer_resource_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_resource_events"
    ADD CONSTRAINT "customer_resource_events_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_resource_events"
    ADD CONSTRAINT "customer_resource_events_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."customer_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_resource_markets"
    ADD CONSTRAINT "customer_resource_markets_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."customer_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_resources"
    ADD CONSTRAINT "customer_resources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_resources"
    ADD CONSTRAINT "customer_resources_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_scope_requirements"
    ADD CONSTRAINT "customer_scope_requirements_cert_type_id_fkey" FOREIGN KEY ("cert_type_id") REFERENCES "public"."cert_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_scope_requirements"
    ADD CONSTRAINT "customer_scope_requirements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_scope_requirements"
    ADD CONSTRAINT "customer_scope_requirements_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_cert_type_id_fkey" FOREIGN KEY ("cert_type_id") REFERENCES "public"."cert_types"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_insurance_type_id_fkey" FOREIGN KEY ("insurance_type_id") REFERENCES "public"."insurance_types"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_messages"
    ADD CONSTRAINT "feedback_messages_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insurance_policy_data"
    ADD CONSTRAINT "insurance_policy_data_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_awards"
    ADD CONSTRAINT "job_awards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_required_certs"
    ADD CONSTRAINT "job_required_certs_cert_type_id_fkey" FOREIGN KEY ("cert_type_id") REFERENCES "public"."cert_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_required_certs"
    ADD CONSTRAINT "job_required_certs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_scopes"
    ADD CONSTRAINT "job_scopes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_scopes"
    ADD CONSTRAINT "job_scopes_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_agreement_template_id_fkey" FOREIGN KEY ("agreement_template_id") REFERENCES "public"."customer_agreement_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."required_company_insurance"
    ADD CONSTRAINT "required_company_insurance_insurance_type_id_fkey" FOREIGN KEY ("insurance_type_id") REFERENCES "public"."insurance_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_availability_blocks"
    ADD CONSTRAINT "team_availability_blocks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_change_request_members"
    ADD CONSTRAINT "team_change_request_members_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."team_change_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_approvals"
    ADD CONSTRAINT "vendor_approvals_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_approvals"
    ADD CONSTRAINT "vendor_approvals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_approvals"
    ADD CONSTRAINT "vendor_approvals_reviewed_by_admin_fkey" FOREIGN KEY ("reviewed_by_admin") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."work_reviews"
    ADD CONSTRAINT "work_reviews_contractor_company_id_fkey" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_reviews"
    ADD CONSTRAINT "work_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_reviews"
    ADD CONSTRAINT "work_reviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_reviews"
    ADD CONSTRAINT "work_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_events_admin_read" ON "public"."analytics_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "analytics_events_insert_authenticated" ON "public"."analytics_events" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "analytics_events_user_read_own" ON "public"."analytics_events" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."bid_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bid_events_insert_customer_or_contractor" ON "public"."bid_events" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."bids" "b"
     JOIN "public"."jobs" "j" ON (("j"."id" = "b"."job_id")))
  WHERE (("b"."id" = "bid_events"."bid_id") AND ("j"."customer_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."bids" "b"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "b"."company_id")))
  WHERE (("b"."id" = "bid_events"."bid_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "bid_events_select" ON "public"."bid_events" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."bids" "b"
     JOIN "public"."jobs" "j" ON (("j"."id" = "b"."job_id")))
  WHERE (("b"."id" = "bid_events"."bid_id") AND ("j"."customer_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."bids" "b"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "b"."company_id")))
  WHERE (("b"."id" = "bid_events"."bid_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."bids" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bids_insert_contractor" ON "public"."bids" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "bids"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()) AND ("c"."status" = 'active'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "bids"."job_id") AND ("j"."status" = 'open'::"text") AND ("j"."customer_id" IS NOT NULL) AND "public"."vendor_is_approved"("j"."customer_id", "bids"."company_id")))) AND ("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "bids"."job_id") AND "public"."team_meets_job_for_customer"("j"."customer_id", "bids"."team_id", "j"."id"))))));



CREATE POLICY "bids_select" ON "public"."bids" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "bids"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "bids"."job_id") AND ("j"."customer_user_id" = "auth"."uid"()))))));



CREATE POLICY "bids_update_customer" ON "public"."bids" FOR UPDATE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "bids"."job_id") AND ("j"."customer_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "bids"."job_id") AND ("j"."customer_user_id" = "auth"."uid"()))))));



CREATE POLICY "cc_delete_customer_own" ON "public"."customer_contractors" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_contractors"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "cc_insert_contractor_pending_own" ON "public"."customer_contractors" FOR INSERT WITH CHECK ((("status" = 'pending'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "customer_contractors"."contractor_company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "cc_insert_customer_own" ON "public"."customer_contractors" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_contractors"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "cc_select_contractor_own" ON "public"."customer_contractors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "customer_contractors"."contractor_company_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "cc_select_customer_own" ON "public"."customer_contractors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_contractors"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "cc_update_customer_own" ON "public"."customer_contractors" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_contractors"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_contractors"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."cert_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cert_types_read_all" ON "public"."cert_types" FOR SELECT USING (true);



CREATE POLICY "coi_delete" ON "public"."contractor_coi" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "coi_delete_owner_or_admin" ON "public"."contractor_coi" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_end_delete_owner_or_admin" ON "public"."contractor_coi_endorsements" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_endorsements"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_end_insert_owner_or_admin" ON "public"."contractor_coi_endorsements" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_endorsements"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_end_select_owner_or_admin" ON "public"."contractor_coi_endorsements" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_endorsements"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_endorsements_rw" ON "public"."contractor_coi_endorsements" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_companies" "cc"
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "cc"."id")))
  WHERE (("c"."id" = "contractor_coi_endorsements"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_companies" "cc"
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "cc"."id")))
  WHERE (("c"."id" = "contractor_coi_endorsements"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "coi_entities_rw" ON "public"."contractor_coi_insured_entities" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_companies" "cc"
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "cc"."id")))
  WHERE (("c"."id" = "contractor_coi_insured_entities"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_companies" "cc"
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "cc"."id")))
  WHERE (("c"."id" = "contractor_coi_insured_entities"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "coi_insert" ON "public"."contractor_coi" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "coi_insert_owner_or_admin" ON "public"."contractor_coi" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_policies_delete_owner_or_admin" ON "public"."contractor_coi_policies" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_policies_insert_owner_or_admin" ON "public"."contractor_coi_policies" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_policies_select" ON "public"."contractor_coi_policies" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."contractor_coi" "c"
  WHERE ("c"."id" = "contractor_coi_policies"."coi_id"))) AND ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_companies" "cc"
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "cc"."id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."customers" "cust"
     JOIN "public"."customer_contractors" "link" ON (("link"."customer_id" = "cust"."id")))
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "link"."contractor_company_id")))
  WHERE (("cust"."owner_user_id" = "auth"."uid"()) AND ("link"."status" = 'approved'::"text") AND ("c"."id" = "contractor_coi_policies"."coi_id")))))));



CREATE POLICY "coi_policies_select_owner_or_admin" ON "public"."contractor_coi_policies" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_policies_update_owner_or_admin" ON "public"."contractor_coi_policies" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_policies_write" ON "public"."contractor_coi_policies" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_companies" "cc"
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "cc"."id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_companies" "cc"
     JOIN "public"."contractor_coi" "c" ON (("c"."company_id" = "cc"."id")))
  WHERE (("c"."id" = "contractor_coi_policies"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "coi_select" ON "public"."contractor_coi" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."customers" "c"
     JOIN "public"."customer_contractors" "link" ON (("link"."customer_id" = "c"."id")))
  WHERE (("c"."owner_user_id" = "auth"."uid"()) AND ("link"."contractor_company_id" = "contractor_coi"."company_id") AND ("link"."status" = 'approved'::"text"))))));



CREATE POLICY "coi_select_customer_approved" ON "public"."contractor_coi" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."customers" "cu"
     JOIN "public"."customer_contractors" "link" ON (("link"."customer_id" = "cu"."id")))
  WHERE (("cu"."owner_user_id" = "auth"."uid"()) AND ("link"."contractor_company_id" = "contractor_coi"."company_id") AND ("link"."status" = 'approved'::"text")))));



CREATE POLICY "coi_select_owner_or_admin" ON "public"."contractor_coi" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "coi_update" ON "public"."contractor_coi" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "coi_update_owner_or_admin" ON "public"."contractor_coi" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_coi"."company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "companies_insert_own" ON "public"."contractor_companies" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_user_id"));



CREATE POLICY "companies_select_own" ON "public"."contractor_companies" FOR SELECT USING (("auth"."uid"() = "owner_user_id"));



CREATE POLICY "companies_update_own" ON "public"."contractor_companies" FOR UPDATE USING (("auth"."uid"() = "owner_user_id")) WITH CHECK (("auth"."uid"() = "owner_user_id"));



CREATE POLICY "contractor can view customers" ON "public"."customers" FOR SELECT USING (true);



ALTER TABLE "public"."contractor_coi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_coi_endorsements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_coi_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contractor_coi_history_delete_admin" ON "public"."contractor_coi_history" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "contractor_coi_history_select_owner_or_admin" ON "public"."contractor_coi_history" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "contractor_coi_history"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."contractor_coi_insured_entities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_coi_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_coi_supporting_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contractor_coi_supporting_files_delete_owner_or_admin" ON "public"."contractor_coi_supporting_files" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_supporting_files"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "contractor_coi_supporting_files_insert_owner_or_admin" ON "public"."contractor_coi_supporting_files" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_supporting_files"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "contractor_coi_supporting_files_select_owner_or_admin" ON "public"."contractor_coi_supporting_files" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."contractor_coi" "c"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "c"."company_id")))
  WHERE (("c"."id" = "contractor_coi_supporting_files"."coi_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."contractor_companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contractor_companies_admin_all" ON "public"."contractor_companies" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "contractor_companies_owner_insert" ON "public"."contractor_companies" FOR INSERT WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "contractor_companies_owner_select" ON "public"."contractor_companies" FOR SELECT USING (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "contractor_companies_owner_update_draft" ON "public"."contractor_companies" FOR UPDATE USING ((("owner_user_id" = "auth"."uid"()) AND ("onboarding_status" = 'draft'::"text"))) WITH CHECK ((("owner_user_id" = "auth"."uid"()) AND ("onboarding_status" = ANY (ARRAY['draft'::"text", 'submitted'::"text"]))));



CREATE POLICY "contractor_companies_select_for_linked_customers" ON "public"."contractor_companies" FOR SELECT TO "authenticated" USING ("public"."current_customer_can_view_company"("id"));



CREATE POLICY "contractor_companies_select_own" ON "public"."contractor_companies" FOR SELECT TO "authenticated" USING (("owner_user_id" = "auth"."uid"()));



ALTER TABLE "public"."contractor_public_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contractor_public_profiles_insert_owner" ON "public"."contractor_public_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "contractor_public_profiles"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "contractor_public_profiles_select" ON "public"."contractor_public_profiles" FOR SELECT TO "authenticated" USING ((("is_listed" = true) OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "contractor_public_profiles"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "contractor_public_profiles_select_authenticated" ON "public"."contractor_public_profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "contractor_public_profiles_update_owner" ON "public"."contractor_public_profiles" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "contractor_public_profiles"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "contractor_public_profiles"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "cust_ins_req_select_all" ON "public"."customer_insurance_requirements" FOR SELECT USING (true);



CREATE POLICY "cust_ins_req_write_owner" ON "public"."customer_insurance_requirements" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_insurance_requirements"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_insurance_requirements"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "cust_scope_req_select_all" ON "public"."customer_scope_requirements" FOR SELECT USING (true);



CREATE POLICY "cust_scope_req_write_owner" ON "public"."customer_scope_requirements" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_scope_requirements"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "customer_scope_requirements"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."customer_agreement_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_agreement_templates_delete_customer" ON "public"."customer_agreement_templates" FOR DELETE USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



CREATE POLICY "customer_agreement_templates_insert_customer" ON "public"."customer_agreement_templates" FOR INSERT WITH CHECK ("public"."current_user_owns_customer"("customer_id"));



CREATE POLICY "customer_agreement_templates_select_customer" ON "public"."customer_agreement_templates" FOR SELECT USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



CREATE POLICY "customer_agreement_templates_update_customer" ON "public"."customer_agreement_templates" FOR UPDATE USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"())) WITH CHECK (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



ALTER TABLE "public"."customer_agreements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_agreements_delete_customer" ON "public"."customer_agreements" FOR DELETE USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



CREATE POLICY "customer_agreements_insert_customer" ON "public"."customer_agreements" FOR INSERT WITH CHECK ("public"."current_user_owns_customer"("customer_id"));



CREATE POLICY "customer_agreements_select_customer" ON "public"."customer_agreements" FOR SELECT USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"() OR (("contractor_company_id" IS NOT NULL) AND "public"."current_user_owns_contractor_company"("contractor_company_id"))));



CREATE POLICY "customer_agreements_update_customer" ON "public"."customer_agreements" FOR UPDATE USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"())) WITH CHECK (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



ALTER TABLE "public"."customer_contractor_application_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_contractor_application_events_select_contractor" ON "public"."customer_contractor_application_events" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "customer_contractor_application_events"."contractor_company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "customer_contractor_application_events_select_customer" ON "public"."customer_contractor_application_events" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contractor_application_events"."customer_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



ALTER TABLE "public"."customer_contractor_request_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_contractor_request_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_contractors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_contractors_select_for_contractors" ON "public"."customer_contractors" FOR SELECT TO "authenticated" USING ("public"."current_user_owns_contractor_company"("contractor_company_id"));



CREATE POLICY "customer_contractors_select_for_customers" ON "public"."customer_contractors" FOR SELECT TO "authenticated" USING ("public"."current_user_owns_customer"("customer_id"));



ALTER TABLE "public"."customer_insurance_requirements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_request_messages_insert_contractor_reply" ON "public"."customer_contractor_request_messages" FOR INSERT WITH CHECK ((("sender_role" = 'contractor'::"text") AND ("sender_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."customer_contractor_request_threads" "t"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "t"."contractor_company_id")))
  WHERE (("t"."id" = "customer_contractor_request_messages"."thread_id") AND ("cc"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "customer_request_messages_insert_customer" ON "public"."customer_contractor_request_messages" FOR INSERT WITH CHECK ((("sender_role" = 'customer'::"text") AND ("sender_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."customer_contractor_request_threads" "t"
     JOIN "public"."customers" "c" ON (("c"."id" = "t"."customer_id")))
  WHERE (("t"."id" = "customer_contractor_request_messages"."thread_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "customer_request_messages_select_contractor" ON "public"."customer_contractor_request_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."customer_contractor_request_threads" "t"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "t"."contractor_company_id")))
  WHERE (("t"."id" = "customer_contractor_request_messages"."thread_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "customer_request_messages_select_customer" ON "public"."customer_contractor_request_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."customer_contractor_request_threads" "t"
     JOIN "public"."customers" "c" ON (("c"."id" = "t"."customer_id")))
  WHERE (("t"."id" = "customer_contractor_request_messages"."thread_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "customer_request_threads_select_contractor" ON "public"."customer_contractor_request_threads" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "customer_contractor_request_threads"."contractor_company_id") AND ("cc"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "customer_request_threads_select_customer" ON "public"."customer_contractor_request_threads" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contractor_request_threads"."customer_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "customer_resource_ack_insert_policy" ON "public"."customer_resource_acknowledgements" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "customer_resource_ack_select_policy" ON "public"."customer_resource_acknowledgements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_resources" "r"
  WHERE (("r"."id" = "customer_resource_acknowledgements"."resource_id") AND ("public"."current_user_owns_customer"("r"."customer_id") OR "public"."is_admin"())))));



CREATE POLICY "customer_resource_ack_update_policy" ON "public"."customer_resource_acknowledgements" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."customer_resource_acknowledgements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_resource_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_resource_events_insert_policy" ON "public"."customer_resource_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "customer_resource_events_select_policy" ON "public"."customer_resource_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_resources" "r"
  WHERE (("r"."id" = "customer_resource_events"."resource_id") AND ("public"."current_user_owns_customer"("r"."customer_id") OR "public"."is_admin"())))));



ALTER TABLE "public"."customer_resource_markets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_resource_markets_delete_policy" ON "public"."customer_resource_markets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_resources" "r"
  WHERE (("r"."id" = "customer_resource_markets"."resource_id") AND ("public"."current_user_owns_customer"("r"."customer_id") OR "public"."is_admin"())))));



CREATE POLICY "customer_resource_markets_insert_policy" ON "public"."customer_resource_markets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customer_resources" "r"
  WHERE (("r"."id" = "customer_resource_markets"."resource_id") AND ("public"."current_user_owns_customer"("r"."customer_id") OR "public"."is_admin"())))));



CREATE POLICY "customer_resource_markets_select_policy" ON "public"."customer_resource_markets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_resources" "r"
  WHERE (("r"."id" = "customer_resource_markets"."resource_id") AND ("public"."current_user_owns_customer"("r"."customer_id") OR "public"."is_admin"())))));



CREATE POLICY "customer_resource_markets_update_policy" ON "public"."customer_resource_markets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_resources" "r"
  WHERE (("r"."id" = "customer_resource_markets"."resource_id") AND ("public"."current_user_owns_customer"("r"."customer_id") OR "public"."is_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customer_resources" "r"
  WHERE (("r"."id" = "customer_resource_markets"."resource_id") AND ("public"."current_user_owns_customer"("r"."customer_id") OR "public"."is_admin"())))));



ALTER TABLE "public"."customer_resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_resources_delete_policy" ON "public"."customer_resources" FOR DELETE TO "authenticated" USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



CREATE POLICY "customer_resources_insert_policy" ON "public"."customer_resources" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



CREATE POLICY "customer_resources_select_policy" ON "public"."customer_resources" FOR SELECT TO "authenticated" USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



CREATE POLICY "customer_resources_update_policy" ON "public"."customer_resources" FOR UPDATE TO "authenticated" USING (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"())) WITH CHECK (("public"."current_user_owns_customer"("customer_id") OR "public"."is_admin"()));



ALTER TABLE "public"."customer_scope_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_insert_owner" ON "public"."customers" FOR INSERT WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "customers_select_for_contractors" ON "public"."customers" FOR SELECT TO "authenticated" USING ("public"."is_current_user_contractor"());



CREATE POLICY "customers_select_own" ON "public"."customers" FOR SELECT TO "authenticated" USING (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "customers_select_owner" ON "public"."customers" FOR SELECT USING (("public"."is_admin"() OR ("owner_user_id" = "auth"."uid"())));



CREATE POLICY "customers_update_owner" ON "public"."customers" FOR UPDATE USING (("public"."is_admin"() OR ("owner_user_id" = "auth"."uid"()))) WITH CHECK (("public"."is_admin"() OR ("owner_user_id" = "auth"."uid"())));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_delete_owner" ON "public"."documents" FOR DELETE USING (("public"."is_admin"() OR (("verification_status" = ANY (ARRAY['pending'::"text", 'rejected'::"text"])) AND ((("doc_kind" = 'insurance'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "documents"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))) OR (("doc_kind" = 'cert'::"text") AND (EXISTS ( SELECT 1
   FROM (("public"."team_members" "m"
     JOIN "public"."teams" "t" ON (("t"."id" = "m"."team_id")))
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("m"."id" = "documents"."team_member_id") AND ("c"."owner_user_id" = "auth"."uid"())))))))));



CREATE POLICY "documents_insert_owner" ON "public"."documents" FOR INSERT WITH CHECK (((("doc_kind" = 'insurance'::"text") AND ("company_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "documents"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))) OR (("doc_kind" = 'cert'::"text") AND ("team_member_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (("public"."team_members" "m"
     JOIN "public"."teams" "t" ON (("t"."id" = "m"."team_id")))
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("m"."id" = "documents"."team_member_id") AND ("c"."owner_user_id" = "auth"."uid"())))))));



CREATE POLICY "documents_select_owner" ON "public"."documents" FOR SELECT USING (("public"."is_admin"() OR (("doc_kind" = 'insurance'::"text") AND ("company_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "documents"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))) OR (("doc_kind" = 'cert'::"text") AND ("team_member_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (("public"."team_members" "m"
     JOIN "public"."teams" "t" ON (("t"."id" = "m"."team_id")))
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("m"."id" = "documents"."team_member_id") AND ("c"."owner_user_id" = "auth"."uid"())))))));



CREATE POLICY "documents_update_admin" ON "public"."documents" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "error_logs_admin_read" ON "public"."error_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "error_logs_insert_authenticated" ON "public"."error_logs" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."feedback_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_items_insert_authenticated" ON "public"."feedback_items" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "feedback_items_select_own_or_admin" ON "public"."feedback_items" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = "auth"."uid"())));



CREATE POLICY "feedback_items_update_admin_only" ON "public"."feedback_items" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."feedback_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_messages_insert_owner_or_admin" ON "public"."feedback_messages" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_current_user_view_feedback"("feedback_id"));



CREATE POLICY "feedback_messages_select_own_or_admin" ON "public"."feedback_messages" FOR SELECT TO "authenticated" USING (("public"."can_current_user_view_feedback"("feedback_id") AND ("public"."is_admin"() OR ("is_internal" = false))));



CREATE POLICY "feedback_messages_update_admin_only" ON "public"."feedback_messages" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."insurance_policy_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insurance_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insurance_types_read_all" ON "public"."insurance_types" FOR SELECT USING (true);



ALTER TABLE "public"."job_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_awards_insert_customer" ON "public"."job_awards" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_awards"."job_id") AND ("j"."customer_user_id" = "auth"."uid"()))))));



CREATE POLICY "job_awards_select" ON "public"."job_awards" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_awards"."job_id") AND ("j"."customer_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "job_awards"."contractor_company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "job_docs_delete_customer" ON "public"."job_documents" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_documents"."job_id") AND ("j"."customer_user_id" = "auth"."uid"()))))));



CREATE POLICY "job_docs_select_all" ON "public"."job_documents" FOR SELECT USING (true);



CREATE POLICY "job_docs_write_customer" ON "public"."job_documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_documents"."job_id") AND ("j"."customer_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."job_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_files_select_restricted" ON "public"."job_files" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_files"."job_id") AND ("j"."customer_user_id" = "auth"."uid"())))) OR "public"."can_bid_job"("job_id")));



CREATE POLICY "job_files_write_customer" ON "public"."job_files" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_files"."job_id") AND ("j"."customer_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_files"."job_id") AND ("j"."customer_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."job_required_certs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_scopes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_scopes_select_all" ON "public"."job_scopes" FOR SELECT USING (true);



CREATE POLICY "job_scopes_write_customer" ON "public"."job_scopes" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_scopes"."job_id") AND ("j"."customer_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_scopes"."job_id") AND ("j"."customer_user_id" = "auth"."uid"()))))));



CREATE POLICY "jobreq_select" ON "public"."job_required_certs" FOR SELECT USING (true);



CREATE POLICY "jobreq_write_customer" ON "public"."job_required_certs" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_required_certs"."job_id") AND ("j"."customer_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_required_certs"."job_id") AND ("j"."customer_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_insert_customer" ON "public"."jobs" FOR INSERT WITH CHECK (("customer_user_id" = "auth"."uid"()));



CREATE POLICY "jobs_select" ON "public"."jobs" FOR SELECT USING (("public"."is_admin"() OR ("customer_user_id" = "auth"."uid"()) OR ("status" = 'open'::"text")));



CREATE POLICY "jobs_update_customer" ON "public"."jobs" FOR UPDATE USING ((("customer_user_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("customer_user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "members_insert_own" ON "public"."team_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("t"."id" = "team_members"."team_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "members_select_own" ON "public"."team_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("t"."id" = "team_members"."team_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "members_update_own" ON "public"."team_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("t"."id" = "team_members"."team_id") AND ("c"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("t"."id" = "team_members"."team_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "policy_data_admin_write" ON "public"."insurance_policy_data" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "policy_data_select_owner" ON "public"."insurance_policy_data" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."documents" "d"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "d"."company_id")))
  WHERE (("d"."id" = "insurance_policy_data"."document_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "req_insurance_admin_write" ON "public"."required_company_insurance" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "req_insurance_select_all" ON "public"."required_company_insurance" FOR SELECT USING (true);



ALTER TABLE "public"."required_company_insurance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scopes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scopes_admin_write" ON "public"."scopes" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "scopes_select_all" ON "public"."scopes" FOR SELECT USING (true);



CREATE POLICY "team_avail_select_all" ON "public"."team_availability_blocks" FOR SELECT USING (true);



CREATE POLICY "team_avail_write_owner" ON "public"."team_availability_blocks" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("t"."id" = "team_availability_blocks"."team_id") AND ("c"."owner_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("t"."id" = "team_availability_blocks"."team_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."team_availability_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_change_request_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_change_request_members_delete_admin" ON "public"."team_change_request_members" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "team_change_request_members_insert_own_or_admin" ON "public"."team_change_request_members" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."team_change_requests" "r"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "r"."company_id")))
  WHERE (("r"."id" = "team_change_request_members"."request_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "team_change_request_members_select_own_or_admin" ON "public"."team_change_request_members" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."team_change_requests" "r"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "r"."company_id")))
  WHERE (("r"."id" = "team_change_request_members"."request_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "team_change_request_members_update_admin" ON "public"."team_change_request_members" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."team_change_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_change_requests_insert_own" ON "public"."team_change_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "t"."company_id")))
  WHERE (("t"."id" = "team_change_requests"."team_id") AND ("c"."id" = "team_change_requests"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()) AND ("team_change_requests"."requested_by" = "auth"."uid"())))));



CREATE POLICY "team_change_requests_select_own_or_admin" ON "public"."team_change_requests" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "team_change_requests"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "team_change_requests_update_admin" ON "public"."team_change_requests" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_insert_own" ON "public"."teams" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "teams"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "teams_select_own" ON "public"."teams" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "teams"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "teams_update_own" ON "public"."teams" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "teams"."company_id") AND ("c"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "teams"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."vendor_approvals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendor_insert_contractor" ON "public"."vendor_approvals" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "vendor_approvals"."contractor_company_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "vendor_select" ON "public"."vendor_approvals" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "vendor_approvals"."contractor_company_id") AND ("c"."owner_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."customers" "cu"
  WHERE (("cu"."id" = "vendor_approvals"."customer_id") AND ("cu"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "vendor_update_admin" ON "public"."vendor_approvals" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."work_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_reviews_insert_own" ON "public"."work_reviews" FOR INSERT TO "authenticated" WITH CHECK (("reviewer_user_id" = "auth"."uid"()));



CREATE POLICY "work_reviews_select_authenticated" ON "public"."work_reviews" FOR SELECT TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."company_change_request_files";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."company_change_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."documents";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."acknowledge_customer_resource"("p_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."acknowledge_customer_resource"("p_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acknowledge_customer_resource"("p_resource_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_approved_team_change_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_approved_team_change_request"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_approved_team_change_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_approved_team_change_request"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_contractor_coi_before_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."archive_contractor_coi_before_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_contractor_coi_before_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_feedback_last_message_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."bump_feedback_last_message_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_feedback_last_message_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_bid_job"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_bid_job"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_bid_job"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_current_user_view_feedback"("p_feedback_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_current_user_view_feedback"("p_feedback_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_current_user_view_feedback"("p_feedback_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."company_insurance_issues"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."company_insurance_issues"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."company_insurance_issues"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."company_is_eligible"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."company_is_eligible"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."company_is_eligible"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_customer_agreement_from_template"("p_template_id" "uuid", "p_contractor_company_id" "uuid", "p_job_id" "uuid", "p_title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_customer_agreement_from_template"("p_template_id" "uuid", "p_contractor_company_id" "uuid", "p_job_id" "uuid", "p_title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_customer_agreement_from_template"("p_template_id" "uuid", "p_contractor_company_id" "uuid", "p_job_id" "uuid", "p_title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_contractor_can_view_customer"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_contractor_can_view_customer"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_contractor_can_view_customer"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_contractor_has_customer_approval"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_contractor_has_customer_approval"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_contractor_has_customer_approval"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_contractor_matches_resource_market"("p_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_contractor_matches_resource_market"("p_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_contractor_matches_resource_market"("p_resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_customer_can_view_company"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_customer_can_view_company"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_customer_can_view_company"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_owns_contractor_company"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_owns_contractor_company"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_owns_contractor_company"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_owns_customer"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_owns_customer"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_owns_customer"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_id_from_agreement_storage_path"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."customer_id_from_agreement_storage_path"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_id_from_agreement_storage_path"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_review_contractor_request"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_decision" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."customer_review_contractor_request"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_decision" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_review_contractor_request"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_decision" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_start_or_get_request_thread"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_first_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."customer_start_or_get_request_thread"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_first_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_start_or_get_request_thread"("p_customer_id" "uuid", "p_contractor_company_id" "uuid", "p_first_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."eligible_teams_for_job"("p_company_id" "uuid", "p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."eligible_teams_for_job"("p_company_id" "uuid", "p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."eligible_teams_for_job"("p_company_id" "uuid", "p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_current_user_contractor"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_contractor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_contractor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_current_user_customer"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_customer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_customer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."job_id_from_storage_path"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."job_id_from_storage_path"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."job_id_from_storage_path"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_customer_pending_contractor_requests"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_customer_pending_contractor_requests"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_customer_pending_contractor_requests"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_customer_resources_for_contractor"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_customer_resources_for_contractor"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_customer_resources_for_contractor"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."customer_resources" TO "anon";
GRANT ALL ON TABLE "public"."customer_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_resources" TO "service_role";



GRANT ALL ON FUNCTION "public"."list_customer_resources_for_owner"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_customer_resources_for_owner"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_customer_resources_for_owner"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_marketplace_contractors"("p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."list_marketplace_contractors"("p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_marketplace_contractors"("p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_customer_resource_event"("p_resource_id" "uuid", "p_event_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_customer_resource_event"("p_resource_id" "uuid", "p_event_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_customer_resource_event"("p_resource_id" "uuid", "p_event_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_team_request_redecision"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_team_request_redecision"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_team_request_redecision"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."recalc_company_status"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalc_company_status"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_company_status"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_company_status"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_customer_approval"("p_customer_id" "uuid", "p_contractor_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."request_customer_approval"("p_customer_id" "uuid", "p_contractor_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_customer_approval"("p_customer_id" "uuid", "p_contractor_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_customer_agreement_template_default"("p_template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_customer_agreement_template_default"("p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_customer_agreement_template_default"("p_template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_feedback_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_feedback_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_feedback_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_bids"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_bids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_bids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_customer_contractor_to_vendor_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_customer_contractor_to_vendor_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_customer_contractor_to_vendor_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."team_cert_count"("p_team_id" "uuid", "p_cert_type_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."team_cert_count"("p_team_id" "uuid", "p_cert_type_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."team_cert_count"("p_team_id" "uuid", "p_cert_type_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."team_meets_job_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."team_meets_job_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."team_meets_job_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."team_meets_scope_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_scope_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."team_meets_scope_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_scope_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."team_meets_scope_for_customer"("p_customer_id" "uuid", "p_team_id" "uuid", "p_scope_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_is_approved"("p_customer_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_is_approved"("p_customer_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_is_approved"("p_customer_id" "uuid", "p_company_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."bid_events" TO "anon";
GRANT ALL ON TABLE "public"."bid_events" TO "authenticated";
GRANT ALL ON TABLE "public"."bid_events" TO "service_role";



GRANT ALL ON TABLE "public"."bids" TO "anon";
GRANT ALL ON TABLE "public"."bids" TO "authenticated";
GRANT ALL ON TABLE "public"."bids" TO "service_role";



GRANT ALL ON TABLE "public"."cert_types" TO "anon";
GRANT ALL ON TABLE "public"."cert_types" TO "authenticated";
GRANT ALL ON TABLE "public"."cert_types" TO "service_role";



GRANT ALL ON TABLE "public"."company_change_request_files" TO "anon";
GRANT ALL ON TABLE "public"."company_change_request_files" TO "authenticated";
GRANT ALL ON TABLE "public"."company_change_request_files" TO "service_role";



GRANT ALL ON TABLE "public"."company_change_requests" TO "anon";
GRANT ALL ON TABLE "public"."company_change_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."company_change_requests" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_coi" TO "anon";
GRANT ALL ON TABLE "public"."contractor_coi" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_coi" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_coi_endorsements" TO "anon";
GRANT ALL ON TABLE "public"."contractor_coi_endorsements" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_coi_endorsements" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_coi_history" TO "anon";
GRANT ALL ON TABLE "public"."contractor_coi_history" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_coi_history" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_coi_insured_entities" TO "anon";
GRANT ALL ON TABLE "public"."contractor_coi_insured_entities" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_coi_insured_entities" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_coi_policies" TO "anon";
GRANT ALL ON TABLE "public"."contractor_coi_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_coi_policies" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_coi_supporting_files" TO "anon";
GRANT ALL ON TABLE "public"."contractor_coi_supporting_files" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_coi_supporting_files" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_companies" TO "anon";
GRANT ALL ON TABLE "public"."contractor_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_companies" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_insurance_policies" TO "anon";
GRANT ALL ON TABLE "public"."contractor_insurance_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_insurance_policies" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_public_profiles" TO "anon";
GRANT ALL ON TABLE "public"."contractor_public_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_public_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."customer_agreement_templates" TO "anon";
GRANT ALL ON TABLE "public"."customer_agreement_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_agreement_templates" TO "service_role";



GRANT ALL ON TABLE "public"."customer_agreements" TO "anon";
GRANT ALL ON TABLE "public"."customer_agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_agreements" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contractor_application_events" TO "anon";
GRANT ALL ON TABLE "public"."customer_contractor_application_events" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contractor_application_events" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contractor_request_messages" TO "anon";
GRANT ALL ON TABLE "public"."customer_contractor_request_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contractor_request_messages" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contractor_request_threads" TO "anon";
GRANT ALL ON TABLE "public"."customer_contractor_request_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contractor_request_threads" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contractors" TO "anon";
GRANT ALL ON TABLE "public"."customer_contractors" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contractors" TO "service_role";



GRANT ALL ON TABLE "public"."customer_insurance_config" TO "anon";
GRANT ALL ON TABLE "public"."customer_insurance_config" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_insurance_config" TO "service_role";



GRANT ALL ON TABLE "public"."customer_insurance_requirements" TO "anon";
GRANT ALL ON TABLE "public"."customer_insurance_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_insurance_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."customer_required_endorsements" TO "anon";
GRANT ALL ON TABLE "public"."customer_required_endorsements" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_required_endorsements" TO "service_role";



GRANT ALL ON TABLE "public"."customer_resource_acknowledgements" TO "anon";
GRANT ALL ON TABLE "public"."customer_resource_acknowledgements" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_resource_acknowledgements" TO "service_role";



GRANT ALL ON TABLE "public"."customer_resource_events" TO "anon";
GRANT ALL ON TABLE "public"."customer_resource_events" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_resource_events" TO "service_role";



GRANT ALL ON TABLE "public"."customer_resource_markets" TO "anon";
GRANT ALL ON TABLE "public"."customer_resource_markets" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_resource_markets" TO "service_role";



GRANT ALL ON TABLE "public"."customer_scope_requirements" TO "anon";
GRANT ALL ON TABLE "public"."customer_scope_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_scope_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."endorsement_types" TO "anon";
GRANT ALL ON TABLE "public"."endorsement_types" TO "authenticated";
GRANT ALL ON TABLE "public"."endorsement_types" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_items" TO "anon";
GRANT ALL ON TABLE "public"."feedback_items" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_items" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_messages" TO "anon";
GRANT ALL ON TABLE "public"."feedback_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_messages" TO "service_role";



GRANT ALL ON TABLE "public"."insurance_policy_data" TO "anon";
GRANT ALL ON TABLE "public"."insurance_policy_data" TO "authenticated";
GRANT ALL ON TABLE "public"."insurance_policy_data" TO "service_role";



GRANT ALL ON TABLE "public"."insurance_types" TO "anon";
GRANT ALL ON TABLE "public"."insurance_types" TO "authenticated";
GRANT ALL ON TABLE "public"."insurance_types" TO "service_role";



GRANT ALL ON TABLE "public"."job_awards" TO "anon";
GRANT ALL ON TABLE "public"."job_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."job_awards" TO "service_role";



GRANT ALL ON TABLE "public"."job_documents" TO "anon";
GRANT ALL ON TABLE "public"."job_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."job_documents" TO "service_role";



GRANT ALL ON TABLE "public"."job_files" TO "anon";
GRANT ALL ON TABLE "public"."job_files" TO "authenticated";
GRANT ALL ON TABLE "public"."job_files" TO "service_role";



GRANT ALL ON TABLE "public"."job_required_certs" TO "anon";
GRANT ALL ON TABLE "public"."job_required_certs" TO "authenticated";
GRANT ALL ON TABLE "public"."job_required_certs" TO "service_role";



GRANT ALL ON TABLE "public"."job_scopes" TO "anon";
GRANT ALL ON TABLE "public"."job_scopes" TO "authenticated";
GRANT ALL ON TABLE "public"."job_scopes" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."jobs_public" TO "anon";
GRANT ALL ON TABLE "public"."jobs_public" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs_public" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."required_company_insurance" TO "anon";
GRANT ALL ON TABLE "public"."required_company_insurance" TO "authenticated";
GRANT ALL ON TABLE "public"."required_company_insurance" TO "service_role";



GRANT ALL ON TABLE "public"."scopes" TO "anon";
GRANT ALL ON TABLE "public"."scopes" TO "authenticated";
GRANT ALL ON TABLE "public"."scopes" TO "service_role";



GRANT ALL ON TABLE "public"."team_availability_blocks" TO "anon";
GRANT ALL ON TABLE "public"."team_availability_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."team_availability_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."team_change_request_members" TO "anon";
GRANT ALL ON TABLE "public"."team_change_request_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_change_request_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_change_requests" TO "anon";
GRANT ALL ON TABLE "public"."team_change_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."team_change_requests" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."team_change_requests_with_company" TO "anon";
GRANT ALL ON TABLE "public"."team_change_requests_with_company" TO "authenticated";
GRANT ALL ON TABLE "public"."team_change_requests_with_company" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_approvals" TO "anon";
GRANT ALL ON TABLE "public"."vendor_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."work_reviews" TO "anon";
GRANT ALL ON TABLE "public"."work_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."work_reviews" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































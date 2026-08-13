create extension if not exists pgcrypto;

create type public.dossier_status as enum (
  'PROCESSING',
  'READY',
  'NEEDS_REVIEW',
  'PROCESSING_FAILED',
  'APPROVED'
);

create type public.request_type as enum (
  'BUSINESS_FINANCING',
  'INSURANCE',
  'LEASING',
  'GENERAL'
);

create table public.dossiers (
                                 id uuid primary key default gen_random_uuid(),

                                 full_name text not null,
                                 email text not null,
                                 company_name text not null,
                                 original_request text not null,

                                 status public.dossier_status not null default 'PROCESSING',

                                 request_type public.request_type,
                                 requested_amount numeric(14, 2),
                                 annual_revenue numeric(14, 2),
                                 company_age_years integer,
                                 urgency text,
                                 summary text,
                                 confidence numeric(4, 3),

                                 missing_fields jsonb not null default '[]'::jsonb,
                                 validation_warnings jsonb not null default '[]'::jsonb,

                                 ai_raw_output text,
                                 processing_error text,
                                 processing_token uuid,
                                 analysis_completed_at timestamptz,
                                 approved_at timestamptz,

                                 created_at timestamptz not null default now(),
                                 updated_at timestamptz not null default now(),

                                 constraint dossiers_full_name_not_blank
                                     check (length(btrim(full_name)) > 0),

                                 constraint dossiers_email_not_blank
                                     check (length(btrim(email)) > 0),

                                 constraint dossiers_company_name_not_blank
                                     check (length(btrim(company_name)) > 0),

                                 constraint dossiers_original_request_not_blank
                                     check (length(btrim(original_request)) > 0),

                                 constraint dossiers_requested_amount_valid
                                     check (
                                         requested_amount is null or requested_amount > 0
                                         ),

                                 constraint dossiers_annual_revenue_valid
                                     check (
                                         annual_revenue is null or annual_revenue >= 0
                                         ),

                                 constraint dossiers_company_age_years_valid
                                     check (
                                         company_age_years is null or company_age_years >= 0
                                         ),

                                 constraint dossiers_urgency_valid
                                     check (
                                         urgency is null
                                             or urgency in ('LOW', 'MEDIUM', 'HIGH')
                                         ),

                                 constraint dossiers_confidence_valid
                                     check (
                                         confidence is null
                                             or confidence between 0 and 1
                                         ),

                                 constraint dossiers_missing_fields_is_array
                                     check (jsonb_typeof(missing_fields) = 'array'),

                                 constraint dossiers_validation_warnings_is_array
                                     check (jsonb_typeof(validation_warnings) = 'array'),

                                 constraint dossiers_approval_consistent
                                     check (
                                         (status = 'APPROVED' and approved_at is not null)
                                             or
                                         (status <> 'APPROVED' and approved_at is null)
                                         )
);

create index dossiers_status_created_at_idx
    on public.dossiers (status, created_at desc);

create unique index dossiers_processing_token_idx
    on public.dossiers (processing_token)
    where processing_token is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
return new;
end;
$$;

create trigger dossiers_set_updated_at
    before update on public.dossiers
    for each row
    execute function public.set_updated_at();

alter table public.dossiers enable row level security;
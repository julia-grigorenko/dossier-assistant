insert into public.dossiers (
  full_name,
  email,
  company_name,
  original_request,
  processing_token
)
values (
  'Alex Morgan',
  'alex@example.com',
  'Morgan Services',
  'We need financing for new business equipment.',
  gen_random_uuid()
)
returning
  id,
  full_name,
  email,
  status,
  created_at,
  updated_at;
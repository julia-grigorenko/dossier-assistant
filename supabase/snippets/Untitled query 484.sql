select
  id,
  full_name,
  email,
  company_name,
  original_request,
  status,
  created_at
from public.dossiers
order by created_at desc
limit 10;
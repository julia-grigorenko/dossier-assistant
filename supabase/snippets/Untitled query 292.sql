select
  id,
  full_name,
  email,
  company_name,
  status,
  created_at
from public.dossiers
order by created_at desc;
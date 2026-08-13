select
  id,
  full_name,
  email,
  status,
  request_type,
  requested_amount,
  confidence,
  approved_at
from public.dossiers
where full_name = 'Integration Test'
order by created_at desc;
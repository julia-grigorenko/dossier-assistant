select
  approved_at,
  approved_at at time zone 'UTC' as approved_utc,
  approved_at at time zone 'Europe/Amsterdam'
    as approved_amsterdam
from public.dossiers
where id = '7c22207e-33a7-4078-b2ee-9c4d5c53919e';
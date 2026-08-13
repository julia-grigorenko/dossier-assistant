select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'dossiers'
  and grantee = 'service_role'
order by privilege_type;
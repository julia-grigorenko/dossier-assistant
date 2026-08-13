select
  type.typname as enum_name,
  enum.enumlabel as enum_value
from pg_type as type
join pg_enum as enum
  on type.oid = enum.enumtypid
join pg_namespace as namespace
  on namespace.oid = type.typnamespace
where namespace.nspname = 'public'
order by type.typname, enum.enumsortorder;
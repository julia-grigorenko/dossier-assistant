select
  constraint_name,
  check_clause
from information_schema.check_constraints
where constraint_name = 'dossiers_urgency_valid';
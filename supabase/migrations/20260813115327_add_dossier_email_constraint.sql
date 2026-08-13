alter table public.dossiers
    add constraint dossiers_email_format
        check (
            email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    );
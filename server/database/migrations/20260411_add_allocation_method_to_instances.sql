ALTER TABLE public.hod_academic_year_instances
ADD COLUMN IF NOT EXISTS allocation_method character varying(40);
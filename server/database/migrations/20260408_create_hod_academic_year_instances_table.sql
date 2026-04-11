CREATE TABLE IF NOT EXISTS public.hod_academic_year_instances
(
    id integer NOT NULL DEFAULT nextval('hod_academic_year_instances_id_seq'::regclass),
    deptid integer NOT NULL,
    academic_year character varying(20) COLLATE pg_catalog."default" NOT NULL,
    title character varying(120) COLLATE pg_catalog."default" NOT NULL,
    start_date date,
    end_date date,
    is_active boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT hod_academic_year_instances_pkey PRIMARY KEY (id),
    CONSTRAINT hod_academic_year_instances_deptid_academic_year_key UNIQUE (deptid, academic_year)
);
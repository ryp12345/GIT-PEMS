CREATE TABLE IF NOT EXISTS public.elective_list
(
    "ID" integer NOT NULL DEFAULT nextval('elective_list_id_seq'::regclass),
    "courseName" character varying(50) COLLATE pg_catalog."default",
    coursecode character varying(10) COLLATE pg_catalog."default",
    division integer,
    max integer,
    pre_req character varying(100) COLLATE pg_catalog."default",
    "DeptID" integer,
    sem integer NOT NULL,
    electivegroup character varying(20) COLLATE pg_catalog."default",
    allocation_status integer,
    cgpa_cutoff double precision,
    min integer,
    total_allocations integer,
    compulsory_prereq integer,
    instance_id integer DEFAULT 6,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT elective_list_pkey PRIMARY KEY ("ID"),
    CONSTRAINT fk_elective_instance FOREIGN KEY (instance_id)
        REFERENCES public.hod_academic_year_instances (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Migration: Create elective_preferences table
CREATE TABLE IF NOT EXISTS public.elective_preferences
(
    id integer NOT NULL,
    "USN" character varying(10) COLLATE pg_catalog."default",
    coursecode character varying(10) COLLATE pg_catalog."default",
    preference integer NOT NULL,
    status smallint,
    electivegroup character varying(20) COLLATE pg_catalog."default",
    instance_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pref_instance FOREIGN KEY (instance_id)
        REFERENCES public.hod_academic_year_instances (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);
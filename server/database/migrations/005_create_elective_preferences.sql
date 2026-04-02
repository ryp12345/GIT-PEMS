-- Migration: Create elective_preferences table
CREATE TABLE IF NOT EXISTS public.elective_preferences
(
    id integer NOT NULL,
    "USN" character varying(10) COLLATE pg_catalog."default",
    coursecode character varying(10) COLLATE pg_catalog."default",
    preference integer NOT NULL,
    status smallint,
    electivegroup character varying(20) COLLATE pg_catalog."default"
);
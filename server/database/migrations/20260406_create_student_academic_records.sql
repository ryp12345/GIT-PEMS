-- Migration: Create student_academic_records table
CREATE TABLE IF NOT EXISTS public.student_academic_records
(
    id integer NOT NULL,
    "USN" character varying(12) COLLATE pg_catalog."default",
    semester character varying(255) COLLATE pg_catalog."default",
    grade character varying(255) COLLATE pg_catalog."default",
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

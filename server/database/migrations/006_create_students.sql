-- Migration: Create students table
CREATE TABLE IF NOT EXISTS public.students
(
    id integer NOT NULL,
    "Name" character varying(50) COLLATE pg_catalog."default",
    "UID" character varying(10) COLLATE pg_catalog."default",
    "USN" character varying(10) COLLATE pg_catalog."default",
    "DeptID" integer NOT NULL,
    "CGPA" double precision NOT NULL,
    "Timestamp" timestamp without time zone NOT NULL,
    aca_year character varying(10) COLLATE pg_catalog."default",
    sem integer NOT NULL,
    diploma integer NOT NULL
);
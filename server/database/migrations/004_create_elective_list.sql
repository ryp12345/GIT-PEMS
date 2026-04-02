-- Migration: Create elective_list table
CREATE TABLE IF NOT EXISTS public.elective_list
(
    "ID" integer NOT NULL,
    "courseName" character varying(50) COLLATE pg_catalog."default",
    coursecode character varying(10) COLLATE pg_catalog."default",
    division integer,
    max integer,
    pre_req character varying(100) COLLATE pg_catalog."default",
    "DeptID" integer,
    sem integer NOT NULL,
    electivegroup character varying(20) COLLATE pg_catalog."default",
    allocation_status integer NOT NULL,
    cgpa_cutoff double precision NOT NULL,
    min integer NOT NULL,
    total_allocations integer NOT NULL,
    "Dipelective" integer NOT NULL,
    compulsory_prereq integer NOT NULL
);
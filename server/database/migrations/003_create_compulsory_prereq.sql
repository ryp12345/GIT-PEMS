-- Migration: Create compulsory_prereq table
CREATE TABLE IF NOT EXISTS public.compulsory_prereq
(
    usn character varying(10) COLLATE pg_catalog."default",
    cid integer NOT NULL
);
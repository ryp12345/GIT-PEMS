-- Migration: Create departments table
CREATE TABLE IF NOT EXISTS public.departments
(
    "DeptID" integer NOT NULL,
    "Name" character varying(50) COLLATE pg_catalog."default",
    "UserName" character varying(10) COLLATE pg_catalog."default",
    "Password" character varying(100) COLLATE pg_catalog."default",
    "DateStmp" timestamp without time zone NOT NULL
);

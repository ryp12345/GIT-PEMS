-- Migration: Create students table
CREATE TABLE IF NOT EXISTS public.students
(
    id integer NOT NULL,
    "Name" character varying(50),
    "UID" character varying(10),
    "USN" character varying(10),
    "DeptID" integer NOT NULL,
    "CGPA" double precision NOT NULL,
    "Timestamp" timestamp without time zone NOT NULL,
    sem integer NOT NULL,
    diploma integer NOT NULL,
    instance_id integer NOT NULL,
    CONSTRAINT fk_student_instance FOREIGN KEY (instance_id)
        REFERENCES public.hod_academic_year_instances (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

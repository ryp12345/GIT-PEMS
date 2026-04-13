**Elective Registration — Workflow (Student-facing + Technical mapping)**

**Explanation (stepwise)**
- **What the student sees:** On logging in, the student sees the Elective Registration form where they pick courses in order of preference (usually up to 5) for each elective group for their semester/instance.
- **What the system stores:** Each student's choices become rows in the preferences table; their personal info comes from the students table; courses come from the elective list table.
- **Step 1 — Identify student:** The system uses the student's USN/UID to find their `students` record (department, CGPA, instance).
- **Step 2 — Show valid electives:** The form lists electives from the `elective_list` table filtered by the student's department and active instance.
- **Step 3 — Collect ordered choices:** The student selects course codes in order of preference (1,2,...). The UI enforces rules: no duplicate course codes in one student's set; preference numbers are unique and usually max 5.
- **Step 4 — Submit:** On submit, the system creates/updates rows in `elective_preferences` with fields: `USN`, `coursecode`, `preference` (1..5), `status` (initially `0` meaning unprocessed), and `electivegroup` (copied from `elective_list`).
- **Step 5 — Confirmation & visibility:** After submission the student is marked as having submitted preferences; HOD pages read `elective_preferences` to show pending/registered students.

**Business rules / logic (simple terms)**
- **Scope by instance:** Preferences, students and electives are scoped by an `instance_id` (academic year/term). A student only participates in allocation for their instance.
- **One elective per group:** A student can win at most one course inside the same `electivegroup` (the allocator enforces this).
- **Preference ordering matters:** Higher preferences are processed before lower ones (1→5). If a student is allocated at preference X in a group, all other preferences in that group are updated to reflect that allocation.
- **Capacity checks:** Each course has `min` and `max`. If first-preference demand is below `min`, the course may be rejected. When a course fills, remaining applicants for that course at that preference get a negative `status` to indicate they weren't allocated that course at that preference stage.
- **Merit or FCFS:** Allocation can use CGPA-desc (merit) or FCFS ordering depending on instance allocation settings.

**Technical details (PERN mapping — files & DB used in this repo)**

**Database (tables and purpose)**
- **`public.students`**: stores student master data used to validate identity and CGPA. Important columns: `USN`, `Name`, `CGPA`, `DeptID`, `instance_id`.
- **`public.elective_list`**: list of elective courses the department offers. Important columns: `coursecode`, `courseName`, `electivegroup`, `min`, `max`, `total_allocations`, `allocation_status`, `cgpa_cutoff`, `DeptID`, `instance_id`.
- **`public.elective_preferences`**: student-submitted preferences. Important columns: `USN`, `coursecode`, `preference` (1..5), `status` (0 = pending, positive = allocated at that preference, negative = rejected at that preference), `electivegroup`, `instance_id`.
- **`public.hod_academic_year_instances`**: instance metadata (allocation method, id referenced by preference/elective rows).

**Server-side code (where the logic lives)**
- DB config and pool: `server/src/config/db.js` — Postgres connection used by models.
- Preferences read operations: `server/src/models/preferences.model.js` (queries to list and count preferences).
- Elective and allocation logic: `server/src/models/electives.model.js` (allocation loops, availability checks, CGPA cutoff updates, rejection rules).
- Student records: `server/src/models/students.model.js` (find student by USN/UID, list pending students).
- API wiring: `server/src/app.js` and route files in `server/src/routes/hod/` (e.g., `preferences.routes.js`, `elective.routes.js`, `students.routes.js`).
- Controllers & services: corresponding controllers and services live under `server/src/controllers/` and `server/src/services/` (see `hod/preferences.controller.js`, `hod/preferences.service.js`).
- Migrations / schema: SQL migrations in `server/database/migrations/` include:
	- `20260409_create_students_table.sql`
	- `20260409_create_elective_list.sql`
	- `20260411_create_elective_preferences_table.sql`

**Frontend (where the student interaction lives or should live)**
- Existing client page placeholder: `client/src/pages/Student/Registration.jsx` (currently empty in this repo). This should render the form and call an API to save preferences.
- HTTP client helpers: `client/src/api/axios.js` and other `client/src/api/*` files — place the new preferences API wrapper here (e.g., `client/src/api/preferences.api.js`).

**Typical request/response shape (recommended)**
- POST payload (student preference submission):

	{
		"usn": "1RV17CS001",
		"instance_id": 6,
		"preferences": [
			{ "coursecode": "CS401", "preference": 1 },
			{ "coursecode": "CS402", "preference": 2 }
		]
	}

- Server-side expectation:
	- Validate `usn` belongs to a student in `students` for provided `instance_id` and `DeptID`.
	- Validate each `coursecode` exists in `elective_list` for same `instance_id` and `DeptID`.
	- Ensure no duplicate coursecodes in the payload and preference numbers are sequential/unique.
	- Create or upsert rows in `elective_preferences` with `status = 0` and copy `electivegroup` from `elective_list` for each inserted row.

**Where to implement the POST handler in this repo (recommended mapping)**
- Add a student-facing route: `server/src/routes/student/preferences.routes.js` (or under `server/src/routes/` as `students.preferences`) that is called without HOD auth (or protected via student auth middleware).
- Create controller: `server/src/controllers/student/preferences.controller.js` to validate and call a service.
- Service: `server/src/services/student/preferences.service.js` that uses `server/src/models/preferences.model.js` to insert or update the rows inside a DB transaction.

**Important constraints / validation to implement server-side**
- Enforce `instance_id` and `DeptID` matches for students and elective rows.
- Limit preferences per student (e.g., max 5), prevent duplicate coursecodes.
- If using imports, allow replace semantics (delete old preference rows for the student/instance then insert new ones within a single transaction).

**How the legacy PHP page (StudentsLogin.php) maps to PERN**
- Legacy: `StudentsLogin.php` serves the registration HTML and does direct DB inserts in PHP.
- PERN: `client/src/pages/Student/Registration.jsx` renders the same form; it calls `POST /api/student/preferences` (or similar). The server validates and writes to `elective_preferences` using `preferences.model.js`.

**Quick checklist for a safe student-submission implementation**
- Validate student identity (USN/UID + instance).
- Validate courses belong to the instance and department.
- Enforce max preferences and uniqueness.
- Use a DB transaction: delete old preference rows for the student (same instance) then insert new rows and copy electivegroup.
- Return clear errors (400 for bad request, 401 for auth, 500 for DB failure).

---

If you want, I can now implement a minimal `POST /api/student/preferences` endpoint and a small `client/src/api/preferences.api.js` + basic `Registration.jsx` form wired to it. Tell me whether you want student auth enforced or an open endpoint for initial testing.


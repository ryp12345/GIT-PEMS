**Stat — How "Students Elective List" is populated**

## 1) Explanation (step-by-step)

1. You (an admin/HOD) are logged in; the application knows your department from your session (a `deptid`).
2. When you open the Statistics tab (the Students Elective List), the page looks up all elective groups that belong to your department. It does this by asking the `elective_list` table: "give me distinct elective groups for my department."
3. For each elective group found, the page fetches every course (row) in that group (again only courses belonging to your department).
4. For each course, the page counts how many students selected that course as their 1st preference, 2nd preference, and so on (usually up to 5 preferences). These counts come from the `elective_preferences` table where each student's preference row records `coursecode`, `preference` (1..5) and a `status` (e.g., 0 = pending). Only active/pending preference rows are counted.
5. The page also shows metadata for each course taken from `elective_list`: current allocation status (which preference level has been allocated), CGPA cutoff, minimum and maximum allowed seats, and total allocations done.
6. The table shows these values grouped by elective group: Elective Group, Course Code, Course Name, counts for preferences 1–5, allocated preference, CGPA cutoff, total allocated, and editable Min/Max fields.
7. If you update Min/Max in the table and submit, the page sends the arrays of `min[]`, `max[]` and `coursecode[]` back to the server; the server updates each course row in `elective_list` accordingly.

Business rules summary (layman):
- The department shown is based on your logged-in `deptid` — you only see your department's rows.
- Preference counts only include preferences with a status indicating they're still valid (code uses `status=0`).
- Allocation status shows which preference level succeeded; `-1` or other special values indicate rejected courses.
- Min/Max are editable from this screen and saved directly into `elective_list`.

## 2) Technical details (PERN-mapped, file pointers)

Overview: the PHP `estat.php` page performs a handful of SQL queries against `elective_list` and `elective_preferences`. In the PERN app (GIT-PEMS) the same domain objects exist and are handled by server services and client pages. Below is a map of where the equivalent logic lives in this repository.

- Database tables involved:
	- `elective_list` — one row per elective course. Important columns used here: `electivegroup`, `coursecode`, `courseName`, `allocation_status`, `cgpa_cutoff`, `min`, `max`, `total_allocations`, `DeptID`.
	- `elective_preferences` — individual student preference rows. Important columns: `USN`, `coursecode`, `preference` (1..5), `status`, and `electivegroup`.
	- `students` (or `students1` / `students` variants) — used elsewhere to join student details when needed.

- Key SQL operations (from `estat.php`) and their purpose:
	1. SELECT distinct elective groups for the department:
		 - SQL: `SELECT DISTINCT(electivegroup) FROM elective_list WHERE deptid = $deptid ORDER BY sem`
		 - Purpose: find groups to render as table sections.
	2. For each group, select the courses in that group:
		 - SQL: `SELECT * FROM elective_list WHERE electivegroup = ? AND DeptID = ? ORDER BY coursecode`
		 - Purpose: get course metadata to display and compute stats.
	3. For each course, count preferences by preference order:
		 - SQL used repeatedly: `SELECT * FROM elective_preferences WHERE preference = $p AND status = 0 AND coursecode = ?`
		 - Purpose: count how many students put this course at preference $p (1..5).
	4. Update min/max on submit:
		 - SQL: `UPDATE elective_list SET min = ?, max = ? WHERE coursecode = ?`

- Equivalent PERN code locations (server-side):
	- DB pool / connection: `server/src/config/db.js` — exports the `pg` Pool used for queries.
	- Elective service (elective_list queries): `server/src/services/hod/elective.service.js` — provides `list`, `create`, `update`, `remove` functions that query `elective_list`. Example: `list(deptid)` runs `SELECT * FROM elective_list WHERE DeptID = $1`.
	- Controllers and routes exposing APIs: `server/src/controllers/hod/elective.controller.js` and `server/src/routes/hod/elective.routes.js` — these map HTTP endpoints to service functions.
	- Migrations (table definitions): `server/database/migrations/00*_create_elective_list.sql` and `005_create_elective_preferences.sql` define the table schemas used by the server.

- Equivalent client-side locations (PERN frontend):
	- Electives UI and modal behavior: `client/src/pages/HOD/ElectiveInstanceViewPage.jsx` — this page renders elective groups, electives and the add/edit modal. When the PERN client needs to list electives it calls the server APIs implemented above.
	- Data flow: frontend sends/receives JSON to the server endpoints mounted under `/api/...` (see `server/src/routes/*`) and updates UI state.

- How the PERN flow would produce the same Statistics table:
	1. Client requests electives for the logged-in user's department (API call to a route served by `elective.controller.list` which calls `elective.service.list(deptid)`).
	2. Server queries `elective_list` filtered by `DeptID` and returns rows to the client.
	3. To calculate preference counts per course, either the server issues `COUNT` queries against `elective_preferences` grouped by `preference` for the list of course codes, or the client fetches preferences via a dedicated endpoint and aggregates counts client-side. In this codebase, the server-side services are the right place to perform these aggregations for performance.
	4. The client renders the results grouped by `electivegroup`, showing counts, allocation status, CGPA cutoff, and editable min/max controls. On submit the client calls an update endpoint (e.g., `PUT /api/electives/:id` or a batch update) which updates `min`/`max` in `elective_list`.

## Quick pointers for debugging or improving behavior
- If the table shows only the ME department, check the authenticated user's `deptid` — that value is used as a filter on `elective_list`.
- For accurate preference counts prefer server-side aggregation with SQL `COUNT(*)` + `GROUP BY preference, coursecode` instead of many individual `SELECT *` calls.
- Keep the domain names consistent: `electivegroup` (string label) vs `groupId` (numeric id). Choose one representation and ensure frontend and backend agree.

---
Generated on: 2026-04-07


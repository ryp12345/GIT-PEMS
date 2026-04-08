**EStud — Elective Students List (how it is populated and PERN mapping)**

**1) Layman's Explanation (what the UI shows and where data comes from)**
- **Who you are:** The app knows which department you're logged in as (the HOD/admin) and uses that department id to filter everything.
- **Groups:** The page finds all elective groups that belong to your department.
- **Courses:** For each group it lists every course (course code, name, allocation status, cgpa cutoff, min/max seats, total allocations).
- **Preference counts:** For each course the page shows how many students chose it as preference 1..5. Only active preference rows are counted (the old PHP code counts `status = 0`).
- **Editable fields:** `min` and `max` seats are editable in the table. When you submit the changes, the server updates those values in the `elective_list` table.

Business rules in simple terms:
- You only see rows for your department.
- Preference counts include only valid/active preferences (status filter).
- Updates to `min`/`max` are applied per-course and should be done as a batch so all updates succeed or none do.

**2) Technical details (where this lives in the PERN codebase and what I implemented)**

- Database tables involved:
	- `public.elective_list` — course metadata and allocation fields (columns used: `electivegroup`, `coursecode`, `courseName`, `allocation_status`, `cgpa_cutoff`, `min`, `max`, `total_allocations`, `DeptID`).
	- `public.elective_preferences` — students' preference rows (columns used: `USN`, `coursecode`, `preference`, `status`, `electivegroup`).
	- `public.students` — student details when needed.
	- `public.departments` — department / login mapping (HOD username -> DeptID).

- Server-side (what I added/where to look):
	- DB pool: `server/src/config/db.js` (existing) — provides `pg` Pool used for raw SQL queries.
	- Electives model: `server/src/models/electives.model.js` — functions:
		- `getDistinctGroups(deptid)` — returns elective groups for a department (ordered by min semester).
		- `getCoursesByGroup(deptid, group)` — returns course metadata for a group.
		- `getPreferenceCountsForCourses(coursecodes)` — aggregated `COUNT(*)` grouped by `coursecode, preference` for `status = 0`.
		- `updateMinMaxBatch(updates, deptid)` — transactional updates to `min`/`max` per course.
	- Preferences model/service: `server/src/models/preferences.model.js` and `server/src/services/hod/preferences.service.js` — helpers to list preferences and counts.
	- Students model/service: `server/src/models/students.model.js` and `server/src/services/hod/students.service.js` — basic student lookups.
	- Stats service/controller/routes:
		- `server/src/services/hod/stats.service.js` — aggregates groups → courses → prefs and builds response.
		- `server/src/controllers/hod/stats.controller.js` — HTTP handlers.
		- `server/src/routes/hod/stats.routes.js` — mounted at `/api/hod/stats` in `server/src/app.js`.

- API endpoints (server):
	- `GET /api/hod/stats/electives` — returns grouped data for the authenticated user's `deptid`: `{ groups: [{ electivegroup, courses: [{ coursecode, courseName, allocation_status, cgpa_cutoff, min, max, total_allocations, prefs: {1,2,3,4,5} }] }] }`.
	- `PUT /api/hod/stats/electives/minmax` — accepts `{ updates: [{ coursecode, min, max }, ...] }` and applies updates for the logged-in department inside a DB transaction.
	- (helpers) `GET /api/hod/preferences?coursecodes=C1,C2` and `GET /api/hod/preferences/counts?coursecodes=...` — lower-level preference endpoints.
	- `GET /api/hod/students` and `GET /api/hod/students/:usn` — student lookups.

- Client-side (what I added):
	- `client/src/pages/HOD/StatsPage.jsx` — UI that mirrors the PHP `estat.php` / `estudents.php` layout: left-aligned `Welcome [DepartmentName]`, centered `[DepartmentName] Students Elective List`, groups, course rows, Pref 1–5, allocation status, CGPA cutoff, total allocations, editable `Min`/`Max`, and an `Update` button which sends the batch update then reloads.
	- `client/src/api/hod/stats.api.js` — `getElectivesStats()` and `updateMinMax()` wrappers.
	- Sidebar / routing updated so the page is reachable at `/elective-stats`.

- Important implementation notes / business rules enforced in PERN implementation:
	- Department scoping: endpoints use `authMiddleware` (JWT) to get `req.user.deptid` and only return/update rows for that `DeptID`.
	- Preference counting: server runs a single aggregated SQL query `SELECT coursecode, preference, COUNT(*) FROM elective_preferences WHERE status = 0 AND coursecode = ANY($1) GROUP BY coursecode, preference` for efficiency, then pivots results into `prefs: {1..5}` in JS.
	- Atomic updates: batch updates use a DB transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) to ensure all or nothing.
	- Raw SQL (pg) used throughout — consistent with the existing codebase (no ORM introduced).

**Status — is this implemented?**
- Server: the stats endpoints and supporting models/services/controllers/routes have been added and mounted in `server/src/app.js`.
- Client: `client/src/pages/HOD/StatsPage.jsx` was added and wired into the HOD dashboard and sidebar.
- Testing: manual testing has not yet been completed by me in this environment — you can follow the test checklist in the repo README or use the curl/UI steps described in `Stat.md` to validate. I left the implementation in place and ready for you to test.

**Is it crystal clear what you meant?**
- Yes — you asked that the PERN implementation reproduce the PHP `estudents.php` / `estat.php` behavior for the department-scoped Students Elective List. The server and client pieces are implemented accordingly.

**Planned next steps (I will not change anything until you confirm):**
1. You test the endpoints and UI locally and report any mismatches/bugs.
2. If you confirm, I will refine UI styling and any missing fields to match `estudents.php` exactly (e.g., column order, text labels, exact formatting).
3. Optionally add small unit/integration tests or adjust SQL for performance if needed.

If you want me to proceed now with any of the steps above (run smoke tests, tweak formatting, or add tests), say "Proceed" and specify which step.

**Undo Allocations (button in PHP UI)**

- Layman's description:
	- The "Undo Allocations" button resets the allocation results so you can run allocation again from a clean state. If allocations were applied (students assigned to electives), clicking this will clear those assignments and put students back into the pool of active preferences.

- Technical description:
	- In the PHP app the UI calls `reset_allocations.php`. That script runs a SQL `UPDATE` that sets preference `status` back to `0` for rows belonging to elective_list rows in the current department. Example (PHP/SQL logic):
		- `UPDATE elective_preferences ep, elective_list el SET ep.status = 0 WHERE el.coursecode = ep.coursecode AND el.deptid = $deptid`.
	- Effects/semantics:
		- For each `elective_preferences` row, `status` is restored to `0` (pending). Any `status` values that were positive (allocated preference) or negative (rejected) are reverted.
		- `elective_list` fields like `allocation_status`, `cgpa_cutoff`, and `total_allocations` are typically left as-is by a simple reset script, but the PHP site may also reset those fields depending on the implementation. Confirm which fields you want cleared when resetting allocations.
	- Where to implement in PERN:
		- Add a server endpoint `POST /api/hod/stats/reset-allocations` protected by `authMiddleware` that will run one or more SQL statements inside a transaction. Example SQL steps:
			1. `UPDATE public.elective_preferences ep SET status = 0 FROM public.elective_list el WHERE el.coursecode = ep.coursecode AND el."DeptID" = $1;` (param: deptid)
			2. Optionally reset per-course allocation metadata: `UPDATE public.elective_list SET allocation_status = 0, cgpa_cutoff = NULL, total_allocations = 0 WHERE "DeptID" = $1;` — only if you want those cleared as part of undo.
		- Wrap in a transaction (`BEGIN` / statements / `COMMIT`) so the reset is atomic.
		- Return a concise JSON result: `{ success: true, message: 'Allocations reset' }` or an error.
	- Client changes:
		- Hook the existing "Undo Allocations" button (in `estudents.php` it used a GET to `reset_allocations.php`) to call the new endpoint, show a confirmation modal, and then reload the page or refresh data.

**Export to Excel (button in PHP UI)**

- Layman's description:
	- The "Export to Excel" button generates an Excel-compatible `.xls` file containing the Students Elective List (USN, Name, Course Code, Course Title, Preference). Clicking it prompts a download so you can open or save the spreadsheet.

- Technical description:
	- In the PHP app the page builds a tab-separated string and sends headers to the browser to force a download as an Excel file (Content-Type: `application/vnd.ms-excel`). The code collects rows and prints the data; the browser saves it as `.xls` which Excel can open.
	- Where to implement in PERN:
		- Server endpoint: `GET /api/hod/stats/elective-students/export` (protected). It will accept the same department scoping and parameters as the normal list endpoint and return a file download. Two common approaches:
			1. Simple TSV/CSV download (quick): generate a CSV/TSV string server-side and return it with headers:
				 - `Content-Type: text/csv` (or `application/vnd.ms-excel` for legacy Excel)
				 - `Content-Disposition: attachment; filename="${deptName}_Students_Elective_List.xls"`
				 - Body: rows joined with `\r\n` and columns separated by tabs or commas. This works well and matches PHP behavior.
			2. True Excel generation (recommended for more complex exports): use a library like `exceljs` or `xlsx` to build a real `.xlsx` workbook with proper cell formatting, then stream the binary file with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
		- Example quick TSV implementation (pseudo-code):
			- Query same data as `GET /api/hod/stats/elective-students` (groups → courses → students) or the flattened student list used by the PHP `estudents.php` export.
			- Build header row: `Sl.No\tUSN\tName\tCourse Code\tCourse Title\tPreference`.
			- Append each row escaped for tabs/newlines.
			- Send response with proper headers so browser downloads file.
	- Client changes:
		- Wire the `Export to Excel` button to either open the export URL in a new tab or fetch the blob and trigger a download using JavaScript (createObjectURL + anchor download). For example:
			- `window.location = '/api/hod/stats/elective-students/export';` — quick way that works with `GET` and browser download.

**Security and UX notes**
- The reset endpoint is destructive; require confirmation from the user (modal + typed confirmation optional). Limit access to authorized HOD/admin users via existing `authMiddleware` and server-side `DeptID` scoping.
- The export endpoint should also be protected and rate-limited as needed. When exporting large datasets, consider streaming the response rather than building very large strings in memory.

---

If you want, I can implement the PERN endpoints and client wiring for both features now (non-destructive default: only reset `elective_preferences.status` to `0` and leave `elective_list` metadata untouched), or implement the more aggressive reset that also clears `elective_list` aggregation columns. Which behavior do you prefer for Undo Allocations?


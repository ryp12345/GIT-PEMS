1. Layman's explanation — what happens when you click the "Allocate" tab in the PHP app

- Tables involved:
  - `elective_list` — list of electives (coursecode, courseName, electivegroup, DeptID, min, max, total_allocations, allocation_status, cgpa_cutoff, ...)
  - `elective_preferences` — student preferences (USN, coursecode, preference 1..5, status)
  - `students` (or `students1` in one script) — student records (USN, CGPA, DeptID, Name, ...)

- High-level business rules (stepwise):
  1. Access control: only a logged-in HOD (deptid in session) can run allocation.
 2. Quick checks: if there are no preferences to allocate for electives in this department, show "No preferences available to allocate".
 3. If all electives already have allocation_status != 0, show "Allocation is already Done".
 4. Reject under-subscribed electives first: for each elective group, any elective whose count of first-preference (preference=1 & status=0) students is less than its `min` is marked rejected: `allocation_status = -1` and all its preferences set to `status = -1`.
 5. Preference rounds 1→5: for preference = 1..5 do:
     - For each elective group, iterate each elective in the group that was not rejected.
     - Compute availability = `max - total_allocations`.
     - Find number of waiting preferences for this elective at the current preference level (status = 0 and preference = current round).
     - If no waiting students, mark elective's `allocation_status` to the current preference (advance it).
     - If waiting students exist:
         * If availability <= number of waiting students: pick the top `availability` students ordered by CGPA (descending) and mark their preference `status = <preference>` (allocated at that preference). Elective's `cgpa_cutoff` is set to last allocated student's CGPA and `total_allocations` becomes `max` (full). Any remaining waiting students for that course are marked `status = -<preference>`.
         * If availability > number of waiting students: allocate all waiting students (set their preference `status = <preference>`), set elective's `cgpa_cutoff` to the last allocated CGPA and increment `total_allocations` by the number allocated.
  6. Continue to next preference round; the algorithm stops after preference 5 or when electives are exhausted.

- `status` semantics (observed from code):
  - `0` — not yet processed for allocation
  - positive `p` (1..5) — student has been allocated this elective at preference `p`
  - negative `-p` — student was considered but not allocated at preference `p` (rejected)

2. Technical details — mapping PHP behavior to the GIT-PEMS (PERN) implementation

- Relevant GIT-PEMS server modules (existing files)
  - models/electives.model.js — queries for `elective_list` (grouping, course rows, min/max, allocation fields)
  - models/preferences.model.js — queries for `elective_preferences` (counts, lists, student joins)
  - models/students.model.js — student lookups (USN, CGPA, DeptID)

- Implementation strategy (stepwise) to reproduce PHP `allocateall.php` behavior in the Node/Express server:
  1. Authorization: require HOD session or valid token and obtain `deptid` from the request context.
 2. Pre-checks:
     - Use `electives.getDistinctGroups(deptid)` to get elective groups.
     - Use `preferences.countPreferencesByCoursecodes(coursecodes)` (or `getPreferenceCountsForCourses`) for initial existence check: if there are no preferences with `total_allocations = 0`, return a 200 with message "No preferences available to allocate".
 3. Reject under-subscribed electives (the same logic as PHP):
     - For each group, call `getCoursesByGroup(deptid, group)` and for each course call `countPreferencesByCoursecodes([coursecode])` filtering preference=1, status=0.
     - If first-preference count < course.min: update the row in `public.elective_list` (allocation_status = -1) and bulk update `public.elective_preferences` for that course to status = -1.
 4. Run preference rounds 1..5. For each round:
     - For each group, get courses in group where allocation_status != -1.
     - For each course compute availability = `max - total_allocations`.
     - Query waiting students (status = 0 and preference = round) joined to `public.students`, filtered by DeptID, order by CGPA desc. Use LIMIT when availability applies.
     - For the selected students: perform a transaction that:
         a. Updates `public.elective_preferences` rows for those students to set `status = <round>` (or set by id to be precise).
         b. Updates `public.elective_list` to set `allocation_status = <round>`, `cgpa_cutoff = last_allocated_cgpa`, and update `total_allocations` (set to max if filled, else increment by allocated count).
         c. For the same course, any remaining `status = 0` rows should be updated to `status = -<round>`.
     - Use parameterized queries and a DB transaction to ensure atomicity of updates for a course.

- Notes about differences and safe improvements (recommended):
  - The PHP code updates preferences using an IN (SELECT coursecode FROM elective_list WHERE electivegroup=...) which can update multiple course preferences for the same student. In GIT-PEMS prefer updating by `id` or by matching both `USN` and `coursecode` to avoid accidental multi-course updates.
  - Use explicit transactions and row-level locking (SELECT FOR UPDATE) in Postgres for each course's allocation round to prevent race conditions if allocations can be triggered concurrently.
  - Consolidate `students` vs `students1` references; in the PERN models `public.students` is canonical.
  - Return structured JSON responses from the API (progress, counts, and final allocation summary) rather than HTML strings so the React front end can present progress and results.

- Minimal mapping to endpoints / functions to implement in GIT-PEMS server:
  - POST `/api/allocations/run` — trigger full allocation for deptid (body or derived from auth). Internally: run reject-under-subscribed, then rounds 1..5, return allocation summary.
  - GET `/api/allocations/status` — return current allocation status and per-course cgpa cutoffs / totals.
  - Helpers already in models: `getDistinctGroups`, `getCoursesByGroup`, `countPreferencesByCoursecodes`, `getStudentListsForCoursecodes` will cover the necessary reads.

3. Where to inspect/extend in this repo

- Look at these files to implement/trace the same logic in Node/Postgres:
  - [server/src/models/electives.model.js](server/src/models/electives.model.js)
  - [server/src/models/preferences.model.js](server/src/models/preferences.model.js)
  - [server/src/models/students.model.js](server/src/models/students.model.js)
  - Add a controller `server/src/controllers/allocations.controller.js` that orchestrates the transaction per-course using the models above.

4. Short checklist to convert PHP `allocateall.php` to PERN

- Read: distinct groups -> courses by group
- Pre-reject: first-preference counts < min -> mark allocation_status=-1 and set preferences.status=-1
- For preference = 1..5: for each course compute availability, select students ordered by CGPA, update preferences.status, update elective_list fields, mark remaining as -preference
- Use DB transactions per-course, parameterized queries, return JSON

If you want, I can now implement a new `allocations.controller.js` that follows this flow and add an endpoint `/api/allocations/run` using the existing models. Would you like me to create that controller and tests?

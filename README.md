# PEMS Allocation Logic

This document explains the elective allocation logic implemented in this project.

The current implementation is designed to match the legacy PHP allocation behavior as closely as possible, with one intentional enhancement:

- allocation is scoped by `instance_id`

In the PHP project, allocation is department-wide.
In this project, allocation is department-wide within a selected elective instance.

## Purpose

The allocation process assigns students to electives based on:

- elective group
- student preference order
- CGPA merit order
- elective minimum and maximum capacity

The logic is intended to preserve the original legacy behavior so that results remain familiar and predictable.

## Source Of Truth

The main allocation implementation lives in:

- `server/src/models/electives.model.js`

Related API flow lives in:

- `server/src/controllers/hod/stats.controller.js`
- `server/src/services/hod/stats.service.js`
- `server/src/routes/hod/stats.routes.js`
- `client/src/api/hod/stats.api.js`
- `client/src/pages/HOD/ElectiveInstanceViewPage.jsx`

Legacy PHP reference:

- `../allocateall.php` in the old PHP project root

## Data Used By Allocation

The allocation logic depends mainly on three tables.

### 1. `elective_list`

Important fields:

- `coursecode`
- `courseName`
- `electivegroup`
- `min`
- `max`
- `allocation_status`
- `total_allocations`
- `cgpa_cutoff`
- `DeptID`
- `instance_id`

### 2. `elective_preferences`

Important fields:

- `USN`
- `coursecode`
- `preference`
- `status`
- `electivegroup`

### 3. `students`

Important fields:

- `USN`
- `Name`
- `CGPA`
- `DeptID`
- `instance_id`

## Meaning Of `status` In `elective_preferences`

The `status` field is central to the allocation process.

- `0` means not yet allocated or decided
- positive value `1..5` means allocated at that preference level
- negative value `-1..-5` means not allocated for that course at that preference stage

Examples:

- `status = 1` means the student got their first preference in that elective group
- `status = 3` means the student got their third preference in that elective group
- `status = -2` means the student was not allotted that course when second-preference allocation was evaluated

## Meaning Of `allocation_status` In `elective_list`

This field tracks how far allocation has progressed for a course.

- `0` means allocation has not started for that course
- `1..5` means allocation has been processed up to that preference level
- `-1` means the course was rejected before normal allocation because first-preference demand was below `min`

## High-Level Allocation Flow

Allocation runs in the following order:

1. Validate that preferences exist for the selected department and instance.
2. Validate that allocation is not already complete.
3. Reject electives whose first-preference demand is below minimum strength.
4. For each preference level from `1` to `5`:
5. For each elective group:
6. For each non-rejected elective in that group:
7. Count unprocessed students for that preference and course.
8. Allocate students by descending CGPA.
9. Update elective totals and cutoffs.
10. Mark remaining unallocated students for a full course as negative status.

## Exact Step-By-Step Logic

### Step 1. Check whether preferences exist

The system first counts preference rows joined to the current department and instance.

If no matching preferences exist, allocation stops with:

- `No preferences available to allocate`

This matches the legacy PHP behavior, but uses `instance_id` scoping.

### Step 2. Check whether allocation is already done

The system checks whether any course in the current department and instance still has:

- `allocation_status = 0`

If none remain, allocation stops with:

- `Allocation is already done`

### Step 3. Reject electives below minimum first-preference demand

For every course in the current instance:

- count only first-preference rows with `preference = 1` and `status = 0`
- only count students belonging to the same `DeptID` and `instance_id`

If:

- `first_preference_count < min`

then:

- set `elective_list.allocation_status = -1`
- set matching `elective_preferences.status = -1`

This mirrors the PHP logic exactly, except that the count is instance-scoped.

### Step 4. Iterate preference levels `1..5`

The allocator runs this loop:

- preference `1`
- preference `2`
- preference `3`
- preference `4`
- preference `5`

This order is important because once a student is allocated in a group, all their preferences inside that group are updated to the winning preference value.

### Step 5. Iterate elective groups

For each preference level, the system processes each `electivegroup` independently.

This preserves the rule that a student should receive at most one elective from the same elective group.

### Step 6. Iterate courses inside the group

For each group, only courses with:

- `allocation_status != -1`

are considered.

Rejected courses are skipped.

### Step 7. Compute availability

For each course:

- `availability = max - total_allocations`

This is the number of remaining seats available at the moment that preference is evaluated.

### Step 8. Count demand for the current preference

For the current course and preference level, the system counts rows where:

- `status = 0`
- `preference = current_preference`
- `coursecode = current_course`
- student belongs to current `DeptID` and `instance_id`

This is the set of still-unprocessed students requesting that course at the current preference level.

### Step 9. If no students exist for that preference

If demand count is zero:

- update `allocation_status = current_preference`

No other state changes happen.

This exactly matches the PHP behavior.

### Step 10. If demand is greater than or equal to available seats

If:

- `availability <= no_of_preferences`

then the course is effectively full at this preference level.

The system:

1. selects the top students ordered by `CGPA DESC`
2. limits the result to `availability`
3. for each selected student:
   - update all preferences in the same elective group to `status = current_preference`
4. store the last selected student's CGPA as `cgpa_cutoff`
5. set:
   - `allocation_status = current_preference`
   - `cgpa_cutoff = last_selected_cgpa`
   - `total_allocations = max`
6. mark all remaining unprocessed preferences for that course as:
   - `status = -current_preference`

This is the same behavior as PHP.

### Step 11. If demand is lower than available seats

If:

- `availability > no_of_preferences`

then all students requesting that course at the current preference level are allocated.

The system:

1. selects all matching students ordered by `CGPA DESC`
2. for each selected student:
   - update all preferences in the same elective group to `status = current_preference`
3. store the last selected student's CGPA as `cgpa_cutoff`
4. set:
   - `allocation_status = current_preference`
   - `cgpa_cutoff = last_selected_cgpa`
   - `total_allocations = total_allocations + allocated_count`

This matches the PHP implementation.

## Why Group-Level Preference Updates Matter

When a student is allocated to one course inside an elective group, the system updates all of that student's preferences in the same group to the winning positive preference value.

Example:

- elective group: `Elective-I`
- student preferences:
  - Course A -> preference 1
  - Course B -> preference 2
  - Course C -> preference 3

If the student is allocated Course B at preference 2, the allocator updates all rows in that group for that student to:

- `status = 2`

This is how the system indicates the student has already received a course in that group.

## Why Negative Status Updates Matter

When a course fills up at a given preference level, the remaining unprocessed rows for that course are marked negative.

Example:

- current preference = `2`
- course becomes full
- remaining unprocessed students for that course get `status = -2`

This means they were not allocated that course at the second-preference stage, but they may still be considered for other courses in the same group if their other rows are still unresolved.

## PHP Parity

The current Node implementation is intentionally aligned to the legacy PHP algorithm.

Parity points:

- same rejection rule
- same preference loop `1..5`
- same group-based allocation strategy
- same `CGPA DESC` ranking
- same full-course negative marking behavior
- same positive status propagation inside the same elective group
- same `allocation_status`, `total_allocations`, and `cgpa_cutoff` updates

The only intended difference is:

- Node scopes the process by `instance_id`

## API Endpoints Used By The New UI

### Get allocation data

- `GET /api/hod/stats/elective-students?instanceId=<id>`

Returns:

- allocated student groups
- unallocated students by group
- pending students with no preferences

### Run allocation

- `POST /api/hod/stats/elective-students/allocate?instanceId=<id>`

Runs the full allocation algorithm.

### Reset allocation

- `POST /api/hod/stats/elective-students/reset?instanceId=<id>`

Resets:

- `elective_preferences.status` back to `0`
- `elective_list.total_allocations` back to `0`
- `elective_list.allocation_status` back to `0`
- `elective_list.cgpa_cutoff` back to `0`

### Export allocated students

- `GET /api/hod/stats/elective-students/export?instanceId=<id>`

Exports the allocated rows shown in the UI.

## UI Behavior In The Instance View

The allocation tab in the instance page now includes:

- allocation summary by elective
- allocated students table
- unallocated students table
- run allocation action
- undo allocations action
- export action
- search and pagination for all major tables

The page is implemented in:

- `client/src/pages/HOD/ElectiveInstanceViewPage.jsx`

## Reset Behavior

Reset is instance-scoped.

Only rows connected to the selected `instance_id` are reset.

This is important because the old PHP system had no instance separation, but the new system must avoid affecting allocations from other instances.

## Important Assumptions

The logic assumes:

- students belong to exactly one active `instance_id` row in the current workflow
- electives belong to one `instance_id`
- preference rows are interpreted through joined student and elective instance scope
- `coursecode` can be reused across instances, so every allocation query must be filtered using current instance-linked joins

## Edge Cases

### 1. No preferences exist

Allocation does not run.

### 2. Allocation already completed

Allocation does not re-run unless reset first.

### 3. All courses in a group are rejected

No allocation happens for that group.

### 4. Equal CGPA values

The logic follows PHP behavior and sorts only by `CGPA DESC`.

### 5. Pending students with no preferences

They are shown in the instance flow, but they do not participate in allocation.

## Troubleshooting

If allocation output looks wrong, check these first:

1. `students.instance_id` matches the selected instance
2. `elective_list.instance_id` matches the selected instance
3. `elective_preferences.coursecode` belongs to electives in that same instance
4. `elective_preferences.electivegroup` matches the elective group stored on the elective rows
5. `min` and `max` values are set correctly before allocation
6. duplicate or stale preference rows are not present from old imports

## Quick Summary

The allocator is a merit-based, preference-driven, group-constrained process.

- low-demand electives are rejected first
- higher preferences are processed before lower preferences
- higher CGPA gets priority
- one winning course per student per elective group
- full courses generate negative status rows for leftovers
- the new system behaves like the PHP version, but inside a selected `instance_id`

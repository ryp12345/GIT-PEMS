# Preference and FCFS Based Allocation

This document describes the Preference and FCFS Based Allocation process used in the system.

## Overview

This method keeps the same preference-based allocation flow as the existing process, but changes the ranking rule for oversubscribed courses.

The process is still preference-based. FCFS is used only when a course is oversubscribed within a preference round.

## Allocation Flow

### 1. Preconditions

- Allocation runs only for the selected academic year instance.
- Student preferences must be available for that instance.
- Allocation runs only if courses still have `allocation_status = 0`.
- If allocation is already completed, the process stops.

### 2. Rejection Step

Before the actual allocation begins, the system checks each course.

- It counts how many students selected the course as first preference.
- If that count is less than the course minimum (`min`), the course is rejected.
- Rejected courses receive `allocation_status = -1`.
- Related student preferences are marked with `status = -1`.

### 3. Preference-wise Processing

After the rejection step, allocation is processed in rounds:

- Preference 1
- Preference 2
- Preference 3
- Preference 4
- Preference 5

For each preference round, the system processes each elective group and each course in that group.

For every course:

- Remaining seats are calculated as `max - total_allocations`.
- The system checks how many unallocated students currently want that course at the current preference level.
- If there are no applicants in that round, the course allocation status is advanced.
- If seats are enough, all applicants in that round are allocated.
- If seats are fewer than applicants, the system ranks students using FCFS.

### 4. Ranking Rule

If a course is oversubscribed in a preference round, students are ranked by:

- earlier preference submission time first
- if timestamps are equal, lower preference row id first

Current implementation uses:

```sql
ORDER BY ep.created_at ASC NULLS LAST, ep.id ASC
```

### 5. Group Locking Rule

Once a student is allocated in one course of an elective group:

- the student's preference records for all courses in that same group are updated,
- the student is treated as allocated for that group,
- and the student is not allocated to another course within the same group.

### 6. Course Status Update

After processing a course, the system updates:

- `allocation_status`
- `total_allocations`
- `cgpa_cutoff`

In this method, the actual selection rule is FCFS based on preference submission time, even though the existing course update path still updates `cgpa_cutoff`.

### 7. Reset Behavior

When allocations are reset for an instance:

- relevant preference `status` values are reset to `0`,
- course allocation values are reset,
- and the saved allocation method is cleared.

## Example

- A course has 2 seats left.
- 5 students selected it in Preference 1.
- The system compares when each preference was submitted.
- The 2 students who submitted earlier are allocated.

## Important Clarification

This is not a pure global FCFS process across the entire allocation.

It means:

- preference-based allocation with FCFS ranking inside oversubscribed preference rounds.

It does not mean:

- one single queue across all preferences and all courses.

## Summary

Preference and FCFS Based Allocation works as follows:

- preference round is the primary rule,
- FCFS is the tie-break and selection rule for oversubscribed courses,
- the rest of the allocation flow remains the standard allocation process.
# Excluded persons (internal / owner traffic)

Every analytics query MUST exclude these `person_id`s. They are the owner's own
devices, not users, and they dominate low-frequency signals (they were ~72% of
all `favorite_toggled` saves in the 14 days to 2026-07-09). Add
`AND person_id NOT IN (<ids below>)` to any query, or filter equivalently.

This is the analysis-side backstop. The ingestion-side backstop is
`localStorage['ptw-internal'] = "1"` on each device (dropped by `before_send`,
see `components/PostHogProvider.tsx`). Both are needed: the flag only stops
*future* events on a device where it's set; this list also removes *historical*
events and covers devices/partitions where the flag isn't set.

| person_id | device | why excluded | first seen |
|---|---|---|---|
| `11a83b86-4d73-565f-8b70-2f2847d865be` | iOS 18.7 / Mobile Safari / standalone PWA | Owner's phone: saved spots, opted in, clicked own push notifications. Identified 2026-07-09 by the owner. | 2026-06-15 |
| `0faaad14-aa87-5cda-a76c-a3f59e0fa4d1` | Mac OS X / Chrome / Desktop | Owner's dev/test machine: 2,281 events (largest single contaminant), 14 saves, 1 alert click. Presumed-internal; confirm if a real second user ever surfaces. | 2026-06-27 |

Note on the iOS PWA identity split: the owner's phone did **not** fan out into a
separate Safari-partition person_id (checked 2026-07-09); `11a83b86` carries both
its browser and standalone events. If a standalone-only twin appears later, add
it here.

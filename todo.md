# TODO — Scheduler MVP (Living)

_Last updated: 2025-10-29 UTC_

## 0) Meta & Infra
- [ ] Pre-commit hooks (lint/tests/format)
- [ ] CI/CD: build + test + lint pipelines
- [ ] Dev docs: overrides, tip-pool, imports

## 1) Theming & Design System
- [ ] (UX) Implement `prefers-color-scheme` detection
- [ ] (UX) Theme toggle + persisted preference
- [ ] (UI) Color tokens + contrast validation
- [ ] (UX) Motion/keyboard accessibility

## 2) User Profiles & Permissions
- [ ] (DB) User: role, has_day_job, day_job_cutoff, is_lead, preferred_venues_order, status
- [ ] (UI) Drag-and-drop venues
- [ ] (API) Restrict cutoff edits (self/manager only)
- [ ] (UI) Default schedule + auto-submit toggle

## 3) Venue Management
- [ ] (DB) Venue: networked, priority, manager_ids[], created_by_super_admin
- [ ] (UI) Create + assign managers
- [ ] (API) Manager invite flow

## 4) Shift Management
- [ ] (DB) Shift: venue_id, date, start_time, end_time, bartenders_required, barbacks_required, leads_required
- [ ] (UI) Grid scheduler + inline validations
- [ ] (VAL) Double-booking prevention
- [ ] (VAL) Staffing checks
- [ ] (ERR-UX) Suggested resolutions inline

## 5) Overrides & Audit
- [ ] (DB) Override: reason, approvals[], history[]
- [ ] (FLOW) Dual confirmation before activation
- [ ] (UI) Manager/Staff approvals + badges
- [ ] (LOG) Immutable audit entries

## 6) Availability
- [ ] (CFG) `availability_deadline_day`
- [ ] (UI) Month datepicker + quick actions
- [ ] (LOGIC) Auto-submit defaults (off by default)
- [ ] (LOCK) Post-deadline edit restriction

## 7) Shift Trading
- [ ] (API) Propose/accept trade + manager approval
- [ ] (VAL) Role match + lead compliance
- [ ] (UI) Mobile trade flow
- [ ] (NOTIF) Trade updates

## 8) External Schedules
- [ ] (SPEC) CSV/JSON import template
- [ ] (UI) Import preview
- [ ] (VAL) Imported blocks unavailable

## 9) Reports
- [ ] Monthly user shift counts + averages
- [ ] Venue summaries (total/unique/avg)
- [ ] Lead compliance stats

## 10) Tip Pool (Optional)
- [ ] (DB) TipPayout: shift_id, user_id, amount, currency, entered_by, timestamps
- [ ] (CFG) Venue flag to enable
- [ ] (UI) Manager entry; staff read-only
- [ ] (LOG) Edit history + pending badge
- [ ] (NOTIF) Publish/update alerts

## 11) Notifications
- [ ] (CFG) User prefs + quiet hours
- [ ] (EVT) Availability, deadlines, shifts, trades, overrides, tips

## 12) Errors & Suggestions
- [ ] Copy: Not enough leads → add lead staff / adjust requirement / pick lead
- [ ] Copy: Double-booked → select different user / shift / override
- [ ] Copy: Cutoff violation → later start / other user / override
- [ ] Copy: Requested-off → pick other user / override
- [ ] Copy: Missing tip → draft + alert manager

## 13) Mobile vs Desktop
- [ ] (MOBILE) Staff flows: availability, trades, overrides, notifications
- [ ] (DESKTOP) Manager tools: scheduler, reports, tip entry

## Done (Changelog)
<!-- Example:
- [x] 2025-10-30 (abc1234) Tip pool model + UI baseline complete
-->


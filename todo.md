# TODO — Scheduler MVP (Living)

_Last updated: 2025-10-29 UTC_

## 0) Meta & Infra
- [ ] Pre-commit hooks (lint/tests/format)
- [ ] CI/CD: build + test + lint pipelines
- [x] Dev docs: overrides, tip-pool, imports

## 1) Theming & Design System
- [x] (UX) Implement `prefers-color-scheme` detection
- [x] (UX) Theme toggle + persisted preference
- [x] (UI) Color tokens + contrast validation
- [x] (UX) Motion/keyboard accessibility

## 2) User Profiles & Permissions
- [x] (DB) User: role, has_day_job, day_job_cutoff, is_lead, preferred_venues_order, status
- [ ] (UI) Drag-and-drop venues
- [ ] (API) Restrict cutoff edits (self/manager only)
- [ ] (UI) Default schedule + auto-submit toggle

## 3) Venue Management
- [x] (DB) Venue: networked, priority, manager_ids[], created_by_super_admin
- [ ] (UI) Create + assign managers
- [ ] (API) Manager invite flow

## 4) Shift Management
- [x] (DB) Shift: venue_id, date, start_time, end_time, bartenders_required, barbacks_required, leads_required
- [ ] (UI) Grid scheduler + inline validations
- [ ] (VAL) Double-booking prevention
- [ ] (VAL) Staffing checks
- [ ] (ERR-UX) Suggested resolutions inline

## 5) Overrides & Audit
- [x] (DB) Override: reason, approvals[], history[]
- [ ] (FLOW) Dual confirmation before activation
- [ ] (UI) Manager/Staff approvals + badges
- [x] (LOG) Immutable audit entries

## 6) Availability
- [x] (CFG) `availability_deadline_day`
- [ ] (UI) Month datepicker + quick actions
- [ ] (LOGIC) Auto-submit defaults (off by default)
- [ ] (LOCK) Post-deadline edit restriction

## 7) Shift Trading
- [x] (DB) ShiftTrade model with manager approval
- [ ] (API) Propose/accept trade + manager approval
- [ ] (VAL) Role match + lead compliance
- [ ] (UI) Mobile trade flow
- [ ] (NOTIF) Trade updates

## 8) External Schedules
- [x] (DB) ExternalBlock model for imports
- [ ] (SPEC) CSV/JSON import template
- [ ] (UI) Import preview
- [ ] (VAL) Imported blocks unavailable

## 9) Reports
- [ ] Monthly user shift counts + averages
- [ ] Venue summaries (total/unique/avg)
- [ ] Lead compliance stats

## 10) Tip Pool (Optional)
- [x] (DB) TipPayout: shift_id, user_id, amount, currency, entered_by, timestamps
- [x] (CFG) Venue flag to enable
- [ ] (UI) Manager entry; staff read-only
- [x] (LOG) Edit history + pending badge
- [ ] (NOTIF) Publish/update alerts

## 11) Notifications
- [x] (DB) Notification model with types
- [x] (CFG) User prefs + quiet hours
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
- [x] 2025-10-29 (1cbdbfe) Initial project setup: Next.js, TypeScript, TailwindCSS, Prisma, ESLint, Prettier, Jest
- [x] 2025-10-29 (1cbdbfe) Complete Prisma schema: User, Venue, Shift, ShiftAssignment, Override, Availability, ShiftTrade, ExternalBlock, TipPayout, Notification, AuditLog models
- [x] 2025-10-29 (1cbdbfe) Theme system complete: light/dark/system preference detection, CSS variables, ThemeProvider, ThemeToggle component
- [x] 2025-10-29 (1cbdbfe) Accessibility: WCAG AA contrast, focus-visible styles, keyboard navigation, motion reduction support
- [x] 2025-10-29 (1cbdbfe) Validation schemas with Zod for all data models
- [x] 2025-10-29 (1cbdbfe) Utility functions: time formatting, date handling, debounce
- [x] 2025-10-29 (1cbdbfe) TypeScript type definitions for all domain models
- [x] 2025-10-29 (721a5af) Comprehensive development documentation (DEVELOPMENT.md, SETUP.md)


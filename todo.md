# TODO — Scheduler MVP (Living)

_Last updated: 2025-10-29 UTC_

---

## Implementation Order (by dependency)

### ✅ Phase 0: Foundation (COMPLETE)
- [x] Meta & Infra
- [x] Theming & Design System
- [x] Database Schema (all models)
- [x] Validation & Type Safety

### ✅ Phase 1: Authentication & Core User Management (COMPLETE)
- [x] Authentication system (NextAuth.js with credentials provider)
- [x] Login/logout/session management
- [x] Protected routes & API authorization
- [x] Role-based middleware (SUPER_ADMIN, MANAGER, BARTENDER, BARBACK)
- [x] User registration flow (invite-based utility + seed script)

### 🔄 Phase 2: User Profiles & Settings (NEXT)
- [ ] (UI) User profile page (view/edit)
- [ ] (UI) Day job settings: toggle + cutoff time picker
- [ ] (UI) Lead status indicator
- [ ] (UI) Drag-and-drop venue preference ordering
- [ ] (API) Profile update endpoints with role restrictions
- [ ] (UI) Default availability patterns
- [ ] (UI) Auto-submit toggle for availability
- [ ] (UI) Notification preferences + quiet hours

### 🏢 Phase 3: Venue Management
- [ ] (UI) Venue list page (filtered by role)
- [ ] (UI) Create venue form (Super Admin only)
- [ ] (UI) Edit venue (name, networked, priority, deadline day, tip pool)
- [ ] (UI) Assign/remove managers (Super Admin only)
- [ ] (API) Venue CRUD with authorization
- [ ] (API) Manager invite flow (email + onboarding)
- [ ] (VAL) Prevent deletion of venues with active shifts

### 📅 Phase 4: Availability System
- [ ] (UI) Month calendar picker (next month view by default)
- [ ] (UI) Quick actions: select all available/unavailable, weekends, etc.
- [ ] (UI) Venue-specific deadline indicator (e.g., "Due by Nov 10")
- [ ] (API) Save/retrieve availability by user + month
- [ ] (LOGIC) Auto-submit defaults on deadline (if enabled)
- [ ] (LOCK) Lock availability after deadline
- [ ] (API) Manager override to unlock availability
- [ ] (NOTIF) Reminders at T-7, T-3, T-1 days before deadline
- [ ] (VAL) Prevent scheduling users with unavailable dates

### 📊 Phase 5: Shift Management & Scheduling
- [ ] (UI) Calendar grid scheduler (manager view)
- [ ] (UI) Create shift modal: venue, date, times, requirements (bartenders, barbacks, leads)
- [ ] (UI) Assign staff to shifts with role selection
- [ ] (UI) Visual indicators: staffing complete/incomplete, lead coverage
- [ ] (VAL) Double-booking prevention (same user, overlapping times)
- [ ] (VAL) Staffing requirement checks (min bartenders, barbacks, leads)
- [ ] (VAL) Day job cutoff validation (warn if shift starts before user's cutoff)
- [ ] (VAL) Availability check (warn if user marked unavailable)
- [ ] (VAL) Lead requirement validation (assigned user must have isLead=true)
- [ ] (ERR-UX) "Not enough leads" → suggest: add lead / adjust requirement / pick different user
- [ ] (ERR-UX) "Double-booked" → suggest: select different user / change time / use override
- [ ] (ERR-UX) "Cutoff violation" → suggest: later start time / different user / use override
- [ ] (ERR-UX) "Requested off" → suggest: pick different user / use override
- [ ] (API) Shift CRUD with validation
- [ ] (API) Shift assignment create/update/delete
- [ ] (NOTIF) Notify users when assigned to shifts
- [ ] (NOTIF) Notify users when shift times change

### ⚠️ Phase 6: Override System
- [ ] (UI) Override request modal: reason, violation type
- [ ] (FLOW) Trigger override when validation fails but manager wants to proceed
- [ ] (UI) Manager approval interface (list pending overrides)
- [ ] (UI) Staff approval interface (approve/decline with comment)
- [ ] (FLOW) Dual confirmation: both manager + staff must approve
- [ ] (FLOW) Activate override only after both approvals
- [ ] (UI) Override badges on shifts: pending/active/declined
- [ ] (LOG) Immutable audit trail for all override actions
- [ ] (API) Override CRUD with approval workflow
- [ ] (NOTIF) Notify manager when override requested
- [ ] (NOTIF) Notify staff when override approval needed
- [ ] (NOTIF) Notify both when override approved/declined

### 🔄 Phase 7: Shift Trading
- [ ] (UI) Staff: "Trade this shift" button (mobile-optimized)
- [ ] (UI) Select recipient from eligible staff list
- [ ] (API) Propose trade endpoint
- [ ] (VAL) Role compatibility check (bartender ↔ bartender, barback ↔ barback)
- [ ] (VAL) Lead requirement check (if shift needs lead, receiver must be lead)
- [ ] (VAL) Availability check for receiver
- [ ] (VAL) No double-booking for receiver
- [ ] (UI) Receiver: accept/decline trade proposal
- [ ] (UI) Manager: approve/decline trade with reason
- [ ] (API) Trade acceptance flow
- [ ] (API) Manager approval endpoint
- [ ] (UI) Trade status badges: proposed/accepted/approved/declined
- [ ] (NOTIF) Notify receiver when trade proposed
- [ ] (NOTIF) Notify proposer when receiver responds
- [ ] (NOTIF) Notify manager when trade accepted (needs approval)
- [ ] (NOTIF) Notify both users when manager approves/declines

### 📥 Phase 8: External Schedule Imports
- [ ] (SPEC) Define CSV format: date, start_time, end_time, description
- [ ] (SPEC) Define JSON format: same fields as CSV
- [ ] (UI) Import page: file upload + preview
- [ ] (UI) Preview table: show parsed entries with validation
- [ ] (API) Parse CSV/JSON and create ExternalBlock records
- [ ] (VAL) Date/time validation on import
- [ ] (VAL) Mark imported times as unavailable for scheduling
- [ ] (UI) View/manage external blocks (list, delete)
- [ ] (API) Manual external block creation (manager override)

### 📈 Phase 9: Reports & Analytics
- [ ] (UI) Monthly shift equity report
  - User name, total shifts, lead shifts, shifts by venue
- [ ] (UI) Venue summary report
  - Total shifts, unique staff count, avg shifts/user, lead coverage %
- [ ] (UI) Lead compliance report
  - Shifts requiring leads, coverage %, overrides used
- [ ] (UI) Override summary report
  - Count by type, most frequent users, approval rate
- [ ] (API) Report generation endpoints with date ranges
- [ ] (UI) Export reports as CSV/PDF

### 💰 Phase 10: Tip Pool (Optional)
- [ ] (UI) Manager: tip entry form per shift assignment
- [ ] (UI) Manager: bulk tip entry for entire shift
- [ ] (API) Tip payout create/update endpoints (manager only)
- [ ] (LOG) Track edit history: who changed amount, when, old/new value
- [ ] (UI) Staff: read-only tip view (by shift, by month total)
- [ ] (UI) Pending badge: tips entered but not yet published
- [ ] (API) "Publish tips" action (makes visible to staff)
- [ ] (NOTIF) Notify staff when tips published
- [ ] (NOTIF) Notify staff when tips updated
- [ ] (ERR-UX) "Missing tip entry" → suggest: draft amount + alert manager

### 🔔 Phase 11: Notification System (Ongoing)
- [ ] (API) Notification creation service
- [ ] (API) Mark notification as read
- [ ] (API) Bulk mark all read
- [ ] (UI) Notification bell icon with unread count
- [ ] (UI) Notification dropdown/page with list
- [ ] (LOGIC) Respect quiet hours (no push during quiet time, queue for email)
- [ ] (LOGIC) Push → email fallback if push fails
- [ ] (EMAIL) Email notification templates
- [ ] (PUSH) Web push notification setup (service worker)
- [ ] ✅ (DB) All notification types already defined

### 📱 Phase 12: Mobile & Desktop Optimization (Ongoing)
- [ ] (MOBILE) Optimize availability calendar for touch
- [ ] (MOBILE) Optimize trade flow for small screens
- [ ] (MOBILE) Optimize notification view
- [ ] (MOBILE) Bottom navigation for staff views
- [ ] (DESKTOP) Optimize scheduler grid for large screens
- [ ] (DESKTOP) Multi-column layouts for reports
- [ ] (DESKTOP) Keyboard shortcuts for shift creation
- [ ] (RESPONSIVE) Test all flows on mobile/tablet/desktop

---

## Done (Changelog)
- [x] 2025-10-29 (1cbdbfe) Initial project setup: Next.js, TypeScript, TailwindCSS, Prisma, ESLint, Prettier, Jest
- [x] 2025-10-29 (1cbdbfe) Complete Prisma schema: User, Venue, Shift, ShiftAssignment, Override, Availability, ShiftTrade, ExternalBlock, TipPayout, Notification, AuditLog models
- [x] 2025-10-29 (1cbdbfe) Theme system complete: light/dark/system preference detection, CSS variables, ThemeProvider, ThemeToggle component
- [x] 2025-10-29 (1cbdbfe) Accessibility: WCAG AA contrast, focus-visible styles, keyboard navigation, motion reduction support
- [x] 2025-10-29 (1cbdbfe) Validation schemas with Zod for all data models
- [x] 2025-10-29 (1cbdbfe) Utility functions: time formatting, date handling, debounce
- [x] 2025-10-29 (1cbdbfe) TypeScript type definitions for all domain models
- [x] 2025-10-29 (721a5af) Comprehensive development documentation (DEVELOPMENT.md)
- [x] 2025-10-29 (f322109) Pre-commit hooks with Husky and lint-staged
- [x] 2025-10-29 (f322109) CI/CD pipelines: GitHub Actions for linting, testing, building, and deployment
- [x] 2025-10-29 (PENDING) NextAuth.js authentication with credentials provider and bcrypt password hashing
- [x] 2025-10-29 (PENDING) Role-based middleware with route protection
- [x] 2025-10-29 (PENDING) Login page with error handling and accessibility
- [x] 2025-10-29 (PENDING) Dashboard page with role-based content
- [x] 2025-10-29 (PENDING) User creation utilities and invite system
- [x] 2025-10-29 (PENDING) Database seed script with test accounts (admin, manager, bartender, barback)

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

### ✅ Phase 2: User Profiles & Settings (COMPLETE)

- [x] (UI) User profile page (view/edit)
- [x] (UI) Day job settings: toggle + cutoff time picker
- [x] (UI) Lead status indicator
- [x] (UI) Drag-and-drop venue preference ordering
- [x] (API) Profile update endpoints with role restrictions
- [ ] (UI) Default availability patterns
- [x] (UI) Auto-submit toggle for availability
- [x] (UI) Notification preferences + quiet hours

### ✅ Phase 3: Venue Management (COMPLETE)

- [x] (UI) Venue list page (filtered by role)
- [x] (UI) Create venue form (Super Admin only)
- [x] (UI) Edit venue (name, networked, priority, deadline day, tip pool)
- [x] (UI) Assign/remove managers (Super Admin only)
- [x] (API) Venue CRUD with authorization
- [ ] (API) Manager invite flow (email + onboarding)
- [x] (VAL) Prevent deletion of venues with active shifts

### ✅ Phase 4: Availability System (COMPLETE)

- [x] (UI) Month calendar picker (next month view by default)
- [x] (UI) Quick actions: select all available/unavailable, weekends, etc.
- [ ] (UI) Venue-specific deadline indicator (e.g., "Due by Nov 10")
- [x] (API) Save/retrieve availability by user + month
- [ ] (LOGIC) Auto-submit defaults on deadline (if enabled)
- [x] (LOCK) Lock availability after deadline
- [ ] (API) Manager override to unlock availability
- [ ] (NOTIF) Reminders at T-7, T-3, T-1 days before deadline
- [ ] (VAL) Prevent scheduling users with unavailable dates

### ✅ Phase 5: Shift Management & Scheduling (COMPLETE)

- [x] (UI) Calendar grid scheduler (manager view)
- [x] (UI) Create shift modal: venue, date, times, requirements (bartenders, barbacks, leads)
- [x] (UI) Assign staff to shifts with role selection
- [x] (UI) Visual indicators: staffing complete/incomplete, lead coverage
- [x] (VAL) Double-booking prevention (same user, overlapping times)
- [x] (VAL) Staffing requirement checks (min bartenders, barbacks, leads)
- [x] (VAL) Day job cutoff validation (warn if shift starts before user's cutoff)
- [x] (VAL) Availability check (warn if user marked unavailable)
- [x] (VAL) Lead requirement validation (assigned user must have isLead=true)
- [x] (ERR-UX) "Not enough leads" → suggest: add lead / adjust requirement / pick different user
- [x] (ERR-UX) "Double-booked" → suggest: select different user / change time / use override
- [x] (ERR-UX) "Cutoff violation" → suggest: later start time / different user / use override
- [x] (ERR-UX) "Requested off" → suggest: pick different user / use override
- [x] (API) Shift CRUD with validation
- [x] (API) Shift assignment create/update/delete
- [ ] (NOTIF) Notify users when assigned to shifts
- [ ] (NOTIF) Notify users when shift times change

### ✅ Phase 6: Override System (COMPLETE)

- [x] (UI) Override request modal: reason, violation type
- [x] (FLOW) Trigger override when validation fails but manager wants to proceed
- [x] (UI) Manager approval interface (list pending overrides)
- [x] (UI) Staff approval interface (approve/decline with comment)
- [x] (FLOW) Dual confirmation: both manager + staff must approve
- [x] (FLOW) Activate override only after both approvals
- [x] (UI) Override badges on shifts: pending/active/declined
- [x] (LOG) Immutable audit trail for all override actions
- [x] (API) Override CRUD with approval workflow
- [ ] (NOTIF) Notify manager when override requested
- [ ] (NOTIF) Notify staff when override approval needed
- [ ] (NOTIF) Notify both when override approved/declined

### ✅ Phase 7: Shift Trading (COMPLETE)

- [x] (UI) Staff: "Trade this shift" button (mobile-optimized)
- [x] (UI) Select recipient from eligible staff list
- [x] (API) Propose trade endpoint
- [x] (VAL) Role compatibility check (bartender ↔ bartender, barback ↔ barback)
- [x] (VAL) Lead requirement check (if shift needs lead, receiver must be lead)
- [x] (VAL) Availability check for receiver
- [x] (VAL) No double-booking for receiver
- [x] (UI) Receiver: accept/decline trade proposal
- [x] (UI) Manager: approve/decline trade with reason
- [x] (API) Trade acceptance flow
- [x] (API) Manager approval endpoint
- [x] (UI) Trade status badges: proposed/accepted/approved/declined
- [ ] (NOTIF) Notify receiver when trade proposed
- [ ] (NOTIF) Notify proposer when receiver responds
- [ ] (NOTIF) Notify manager when trade accepted (needs approval)
- [ ] (NOTIF) Notify both users when manager approves/declines

### 🔄 Phase 8: External Schedule Imports (NEXT)

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
- [x] 2025-10-29 (PENDING) NPM dependencies installed (node v18.20.8, npm v10.8.2, --legacy-peer-deps for next-auth peer conflicts)
- [x] 2025-10-30 (PENDING) Profile API endpoint (GET /api/profile, PATCH /api/profile) with profile update validation
- [x] 2025-10-30 (PENDING) Profile page UI with comprehensive settings: basic info, day job, venue preferences, availability, notifications
- [x] 2025-10-30 (PENDING) Drag-and-drop venue preference ordering with visual feedback
- [x] 2025-10-30 (PENDING) Venues API endpoint (GET /api/venues) for fetching all venues
- [x] 2025-10-30 (PENDING) Enhanced seed script with 4 test venues (Downtown Bar, Rooftop Lounge, Speakeasy Club, Beachside Restaurant)
- [x] 2025-10-30 (PENDING) Notification preferences UI with email, push, and quiet hours configuration
- [x] 2025-10-30 (PENDING) Venue management: list, create, edit, delete with role-based authorization
- [x] 2025-10-30 (PENDING) Venue detail API endpoint (GET/PATCH/DELETE /api/venues/[id]) with Super Admin authorization
- [x] 2025-10-30 (PENDING) Manager assignment to venues with multi-select UI
- [x] 2025-10-30 (PENDING) Users API endpoint (GET /api/users) for fetching users by role
- [x] 2025-10-30 (PENDING) Active shifts validation prevents deletion of venues with upcoming shifts
- [x] 2025-10-30 (PENDING) Availability API endpoints (GET/POST /api/availability) with month-based queries
- [x] 2025-10-30 (PENDING) Availability submit endpoint (POST /api/availability/submit) to finalize availability
- [x] 2025-10-30 (PENDING) Availability calendar UI with month navigation and visual day selection
- [x] 2025-10-30 (PENDING) Quick actions for availability: select all available/unavailable, select weekends
- [x] 2025-10-30 (PENDING) Locked availability prevents changes after deadline
- [x] 2025-10-30 (PENDING) Draft/submitted/locked status indicators on availability calendar
- [x] 2025-10-30 (PENDING) Shift management API endpoints (GET/POST /api/shifts, GET/PATCH/DELETE /api/shifts/[id])
- [x] 2025-10-30 (PENDING) Shift assignment API with comprehensive validation (POST /api/shifts/[id]/assignments)
- [x] 2025-10-30 (PENDING) Shift assignment deletion endpoint (DELETE /api/shifts/[id]/assignments/[assignmentId])
- [x] 2025-10-30 (PENDING) Week-view calendar scheduler for managers with venue filtering
- [x] 2025-10-30 (PENDING) Create shift form with staffing requirements (bartenders, barbacks, leads)
- [x] 2025-10-30 (PENDING) Shift detail page with staff assignment UI and modal
- [x] 2025-10-30 (PENDING) Validation: double-booking detection, day job cutoff, availability check, lead requirements
- [x] 2025-10-30 (PENDING) Visual staffing indicators (fully staffed vs needs staff) on calendar
- [x] 2025-10-30 (PENDING) Comprehensive error messages with actionable suggestions for validation failures
- [x] 2025-10-30 (PENDING) Override system API endpoints (GET/POST /api/overrides, GET /api/overrides/[id], POST /api/overrides/[id]/approve)
- [x] 2025-10-30 (PENDING) Override request modal with reason and violation type tracking
- [x] 2025-10-30 (PENDING) Staff approval interface for override requests
- [x] 2025-10-30 (PENDING) Manager override list page with filtering by status
- [x] 2025-10-30 (PENDING) Dual approval workflow: manager creates, staff approves, then becomes active
- [x] 2025-10-30 (PENDING) Immutable audit trail in override history (JSON array)
- [x] 2025-10-30 (PENDING) Shift assignment accepts overrideId to bypass validation
- [x] 2025-10-30 (PENDING) Override status badges (pending/approved/active/declined)
- [x] 2025-10-30 (PENDING) Validation errors include violationType for override categorization
- [x] 2025-10-30 (PENDING) Shift trade API endpoints (GET/POST /api/trades, GET/PATCH /api/trades/[id], POST /api/trades/[id]/approve)
- [x] 2025-10-30 (PENDING) Trade proposal with comprehensive validation (role compatibility, lead requirements, availability, double-booking)
- [x] 2025-10-30 (PENDING) Three-step trade workflow: propose → receiver accepts → manager approves
- [x] 2025-10-30 (PENDING) Trade list page with status filtering and role-based views
- [x] 2025-10-30 (PENDING) Trade This Shift button on shift detail page for assigned staff
- [x] 2025-10-30 (PENDING) Trade proposal modal with receiver selection and reason
- [x] 2025-10-30 (PENDING) Receiver interface to accept/decline trade proposals
- [x] 2025-10-30 (PENDING) Manager approval interface for accepted trades
- [x] 2025-10-30 (PENDING) Automatic assignment swap when trade is approved
- [x] 2025-10-30 (PENDING) Trade status badges (proposed/accepted/approved/declined/cancelled)

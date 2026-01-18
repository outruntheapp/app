# OUTRUN — MVP / Proof of Concept

OUTRUN is a virtual running challenge web application that integrates with Strava to automatically validate runner activities against predefined GPX routes and compute deterministic leaderboards.

This repository represents a **validation-focused MVP / proof of concept**, designed to prove automation, verification, and competition mechanics — not to serve as a fully hardened production system.

---

## Core Principles

- Fully automated (no uploads, no submissions)
- Deterministic leaderboards (no manual ranking)
- Silent failure for invalid activities
- Minimal admin intervention
- Mobile-first web experience
- Audit-first backend design

---

## Tech Stack

- **Frontend**: React / Next.js / JavaScript / MUI
- **Backend & DB**: Supabase (Postgres + Edge Functions)
- **Maps & GPX**: Mapbox
- **Hosting**: Vercel
- **External API**: Strava

---

## Repository Structure

```txt
outrun_poc/
├── instructions/      # Documentation (deployment, setup, troubleshooting)
│   ├── DEMO_MODE.md
│   ├── DEPLOYMENT.md
│   ├── STRAVA_ERROR_FIX.md
│   └── ... (other setup guides)
│
├── src/
│   ├── components/        # Reusable UI components (no data access)
│   │   ├── auth/          # OAuth / authentication UI
│   │   ├── dashboard/     # Runner-facing components
│   │   ├── leaderboard/  # Public leaderboard components
│   │   ├── admin/         # Admin-only UI
│   │   └── common/        # Shared UI (loading, empty states, countdown, rules)
│   │
│   ├── pages/             # Route-level pages (Next.js)
│   │   ├── index.js       # Landing / login (fixed-height, centered)
│   │   ├── dashboard.js   # Runner dashboard
│   │   ├── leaderboard.js # Public leaderboards
│   │   └── admin.js       # Admin panel
│   │
│   ├── services/          # Business logic + Supabase access
│   │   ├── supabaseClient.js
│   │   ├── authService.js
│   │   ├── activityService.js
│   │   ├── leaderboardService.js
│   │   ├── adminService.js
│   │   ├── auditService.js
│   │   ├── challengeService.js
│   │   ├── participantService.js  # Participant validation
│   │   └── userService.js
│   │
│   ├── utils/             # Pure helpers (no side effects)
│   │   ├── geo.js
│   │   ├── time.js
│   │   ├── logger.js
│   │   ├── guards.js
│   │   └── demoMode.js    # Demo mode utilities
│   │
│   ├── constants/         # Static configuration and enums
│   │   ├── challenge.js
│   │   ├── routes.js
│   │   ├── stages.js
│   │   └── roles.js
│   │
│   └── styles/
│       └── theme.js       # MUI theme configuration
│
├── supabase/
│   ├── functions/         # Edge functions (Deno/TypeScript)
│   └── migrations/       # SQL schema migrations
│
└── routes/               # GPX route files for challenges
````
---

## Architectural Rules

### Pages

* Own routing and layout
* Call components only
* No direct Supabase access

### Components

* Render UI only
* Call services via props or hooks
* Never write to database directly

### Services

* All Supabase reads/writes live here
* All `try/catch` lives here
* All audit logs originate here

### Utils

* Pure, stateless helpers
* No Supabase, no side effects

---

## Logging & Auditing

* Frontend uses centralized logging helpers
* Backend writes immutable audit logs
* Leaderboards are derived from views
* No manual result manipulation is supported

---

## MVP Scope Constraints (Intentional)

* One active challenge at a time (but structure to easily do multiple in the future)
* No payments (ticket purchase flow planned but not implemented)
* No notifications
* No manual activity approval 
* No activity-level edits
* Admins may only exclude participants
* **Demo Mode**: Available in production for testing without Strava API approval

These constraints preserve determinism and auditability.

---

## Extending Beyond MVP

This architecture cleanly supports future additions:

* Multiple concurrent challenges
* Ticketing / payment gating
* Notifications
* Appeals tooling
* Historical challenges

Without refactoring core logic.

---

## Styling

* App Background: ./src/assets/splash.png
* Primary background colour: #C45A2A
* Secondary background colour: #2A2A2A
* Text colours: #F4F1EC and #0B0B0B
* Branded header for pages: ./src/assets/header.png

---

# What Is STILL Outstanding (Final Truth List)

---

## 🔴 Required (Cannot Launch Without)

1. **Strava App Approval**

   * External dependency
   * Timeline risk

2. **Supabase Project Setup**

   * Create project
   * Apply SQL schema
   * Enable extensions (`pg_cron`, `net`)

3. **Environment Variables**

   * Populate real secrets
   * Deploy Edge Functions

4. **Real GPX Upload**

   * Convert GPX → `LineString`
   * Insert into `routes`

---

## 🟡 Strongly Recommended (Before Public Use)

5. **Single Active Challenge Enforcement**

   * DB constraint or trigger

6. **Strava Webhooks**

   * Reduce polling
   * Faster updates

7. **Basic Monitoring**

   * Supabase logs
   * Cron failure alerts

---

## 🟢 Explicitly NOT Required for MVP

* Payments
* Notifications
* Appeals
* Manual approvals
* Mobile apps
* Social features

---

# ✅ Final Status

**At this point:**

* 🧱 Architecture is locked
* 🔐 Security is correct
* 🔁 Automation is real
* 🧾 Auditing is complete
* 🧠 Logic is deterministic
* 📦 Remaining work is wiring + approvals
* 🎨 UI/UX improvements completed (landing page, demo mode, participant validation)
* 📚 Documentation organized in `instructions/` directory

> This is now a **legitimate, defensible MVP/POC**, not a prototype.

---

## 🆕 Recent Updates

### Demo Mode Feature
- **Available in production** for testing without Strava API approval
- Toggle visible in top-right corner of landing page
- Allows developers and testers to explore the app without Strava authentication
- See `instructions/DEMO_MODE.md` for details

### Landing Page Improvements
- Fixed-height, centered layout (no scrolling)
- Countdown timer for challenge start date
- "Join Challenge" and "Rules" buttons
- Participant validation before Strava connection
- Removed AppHeader for cleaner landing experience
- Logo positioned directly beneath name (no extra spacing)

### New Components & Services
- `CountdownTimer`: Displays time until challenge starts
- `RulesDialog`: Shows challenge rules and information
- `participantService`: Validates user participation status
- `demoMode` utility: Manages demo mode state

### Documentation
- All documentation moved to `instructions/` directory
- Added `STRAVA_ERROR_FIX.md` for CORS troubleshooting
- Updated deployment guides with latest fixes

### Technical Fixes
- Fixed CORS issues in `auth-strava-callback` edge function
- Improved error handling and user feedback
- Auto-push Git hook configured (pushes to GitHub after commits on main branch)

---

## 🚀 Quick Start

1. **Setup**: See `instructions/DEPLOYMENT_QUICK_START.md`
2. **Demo Mode**: Click "Demo Mode OFF" chip in top-right corner to enable
3. **Development**: All documentation in `instructions/` directory
4. **Troubleshooting**: Check `instructions/STRAVA_ERROR_FIX.md` for common issues

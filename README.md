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
src/
├── components/        # Reusable UI components (no data access)
│   ├── auth/          # OAuth / authentication UI
│   ├── dashboard/     # Runner-facing components
│   ├── leaderboard/  # Public leaderboard components
│   ├── admin/         # Admin-only UI
│   └── common/        # Shared UI (loading, empty states)
│
├── pages/             # Route-level pages (Next.js)
│   ├── index.js       # Landing / login
│   ├── dashboard.js   # Runner dashboard
│   ├── leaderboard.js # Public leaderboards
│   └── admin.js       # Admin panel
│
├── services/          # Business logic + Supabase access
│   ├── supabaseClient.js
│   ├── authService.js
│   ├── activityService.js
│   ├── leaderboardService.js
│   ├── adminService.js
│   └── auditService.js
│
├── utils/             # Pure helpers (no side effects)
│   ├── geo.js
│   ├── time.js
│   ├── logger.js
│   └── guards.js
│
├── constants/         # Static configuration and enums
│   ├── challenge.js
│   ├── routes.js
│   ├── stages.js
│   └── roles.js
│
└── styles/
    └── theme.js       # MUI theme configuration
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

* One active challenge at a time
* No payments
* No notifications
* No manual activity approval
* No activity-level edits
* Admins may only exclude participants

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

> This is now a **legitimate, defensible MVP/POC**, not a prototype.

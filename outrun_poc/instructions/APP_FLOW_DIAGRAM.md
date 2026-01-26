# OUTRUN Application Flow Diagram

This document provides a visual roadmap of the OUTRUN application flow, user journeys, and system architecture. Use this as a reference for understanding the current implementation and planning future changes.

---

## 🗺️ Application Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        OUTRUN APPLICATION                       │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Landing    │    │  Dashboard   │    │ Leaderboard  │    │
│  │    Page      │───▶│    Page       │───▶│    Page      │    │
│  │    (/)       │    │  (/dashboard) │    │(/leaderboard)│    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                   │                    │            │
│         │                   │                    │            │
│         ▼                   ▼                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │    Routes    │    │    Admin     │    │   Strava     │    │
│  │    Page      │    │    Page      │    │   OAuth      │    │
│  │   (/routes)  │    │   (/admin)   │    │  Callback    │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Journey Flow

### 1. Landing Page → Authentication → Dashboard

```
┌─────────────────┐
│  Landing Page   │
│      (/)        │
│                 │
│  - Challenge    │
│    countdown    │
│  - Join Button  │
│  - Demo Mode    │
└────────┬────────┘
         │
         │ User clicks "Join Challenge"
         ▼
┌─────────────────┐
│  Email Input    │
│     Field       │
└────────┬────────┘
         │
         │ User enters email & clicks "Continue"
         ▼
┌─────────────────┐
│ Check Strava    │
│  Connection     │
│   by Email      │
└────────┬────────┘
         │
         ├─── Has Strava? ───┐
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│   ENTER Button  │  │ Connect Strava  │
│                 │  │     Button      │
└────────┬────────┘  └────────┬────────┘
         │                    │
         │                    │ User clicks "Connect Strava"
         │                    ▼
         │
         │ User clicks "ENTER"
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Strava OAuth   │─────▶│  OAuth Callback  │
│   Redirect      │      │   (/auth/callback)│
└─────────────────┘      └────────┬──────────┘
                                  │
                                  │ Edge Function:
                                  │ auth-strava-callback
                                  ▼
                         ┌─────────────────┐
                         │  Create User    │
                         │  Store Tokens   │
                         │  Create         │
                         │  Participant    │
                         └────────┬─────────┘
                                  │
                                  │ Redirect
                                  ▼
                         ┌─────────────────┐
                         │   Dashboard     │
                         │  (/dashboard)   │
                         │                 │
                         │  - User Info    │
                         │  - Stage        │
                         │    Progress    │
                         │  - Rank         │
                         │  - CTA to       │
                         │    Leaderboard  │
                         └─────────────────┘
```

### 2. Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AppHeader (Full Width)                    │
│                                                              │
│  [OUTRUN Logo]            [Dashboard] [Routes]  [Leaderboard] │
│                                                              │
│  (Centered)                      (Navigation Links)         │
│                                                              │
│  - Visible on all pages except landing                       │
│  - Mobile: Hamburger menu                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Dashboard    │    │    Routes     │    │  Leaderboard  │
│               │    │               │    │               │
│  - Summary    │    │  - Stage 1    │    │  - Overall    │
│  - Progress   │    │  - Stage 2    │    │  - Stage 1    │
│  - Rank       │    │  - Stage 3    │    │  - Stage 2    │
│  - CTA        │    │  - Maps       │    │  - Stage 3    │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 🔐 Authentication & User Creation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Strava OAuth Flow                         │
└──────────────────────────────────────────────────────────────┘

User clicks "Connect Strava" (or "ENTER" if already connected)
         │
         │ Email stored in localStorage
         ▼
┌────────────────────┐
│ Redirect to Strava │
│  Authorization     │
│  (Client ID)       │
└─────────┬──────────┘
          │
          │ User authorizes
          ▼
┌────────────────────┐
│ Strava redirects   │
│ with code          │
│ /auth/callback?    │
│ code=XXX           │
└─────────┬──────────┘
          │
          │ Read email from localStorage
          ▼
┌─────────────────────────────────────────┐
│  Edge Function: auth-strava-callback   │
│                                         │
│  1. Exchange code for tokens            │
│  2. Fetch athlete data                  │
│  3. Create/update Supabase auth user    │
│     (email: strava_{id}@strava.local)  │
│  4. Create/update users table record   │
│     (email: user-provided email)       │
│  5. Store Strava tokens                 │
│  6. Create participant record          │
│  7. Write audit log                     │
└─────────┬───────────────────────────────┘
          │
          │ Returns success
          │ Clear email from localStorage
          ▼
┌────────────────────┐
│ Redirect to        │
│ /dashboard         │
└────────────────────┘
```

---

## 📊 Data Flow: Activities → Leaderboards

```
┌──────────────────────────────────────────────────────────────┐
│                    Activity Processing Flow                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Cron Job        │
│  (Every 30 min)  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Edge Function: sync-strava-activities │
│                                         │
│  1. Get all users with Strava tokens   │
│  2. Refresh tokens if expired          │
│  3. Fetch activities from Strava API   │
│  4. Filter: Run, non-virtual, GPS      │
│  5. Insert into activities table       │
│     (processed_at = NULL)              │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Edge Function: process-activities     │
│  (Runs immediately after sync)         │
│                                         │
│  1. Get unprocessed activities          │
│  2. Filter by challenge date window    │
│  3. Filter by participant status       │
│  4. Match activity to route            │
│     (PostGIS function)                 │
│  5. If match: Create/update           │
│     stage_results                      │
│  6. Mark activity as processed         │
│  7. Write audit log                    │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Database Views (Auto-updated)         │
│                                         │
│  - leaderboard_overall                  │
│  - leaderboard_stage                    │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Frontend Pages                        │
│                                         │
│  - Dashboard: User rank only         │
│  - Leaderboard: Full leaderboard       │
└─────────────────────────────────────────┘
```

---

## 🗂️ Page Responsibilities

### Landing Page (`/`)
- **Purpose**: Entry point, authentication
- **Features**:
  - Challenge countdown timer
  - "Join Challenge" button
    - Clicking reveals email input field
    - User enters email (validated for format)
    - System checks if user has Strava connected by email
    - FUTURE ADDITION: Enter code from ticket (bookmarked for future)
  - "Connect Strava" button 
    - Shown if user doesn't have Strava connected
    - Uses email entered on "Join Challenge" for Strava Auth
    - Email stored in `users.email` field
  - "ENTER" button
    - Shown if user already has Strava connected (by email check)
    - Checks authentication status
    - Redirects to dashboard (authenticated) or dashboard handles auth state
  - Demo mode toggle
  - Rules dialog
- **No navigation header**

### Dashboard (`/dashboard`)
- **Purpose**: User overview and summary
- **Features**:
  - User profile (name, avatar)
  - Challenge summary
  - Stage progress (1/3, 2/3, 3/3)
  - User's current rank (overview only)
  - "View Full Leaderboard" CTA
- **Does NOT show**: Full leaderboard tables, other users' data

### Leaderboard (`/leaderboard`)
- **Purpose**: Full leaderboard display
- **Features**:
  - Overall leaderboard
  - Per-stage leaderboards (Stage 1, 2, 3)
  - Gender filters (All, Male, Female, Unknown)
  - Tabs for switching views
- **Shows**: All participants, full rankings

### Routes (`/routes`)
- **Purpose**: Visual route inspection
- **Features**:
  - Display GPX maps for each stage
  - One section per stage (1, 2, 3)
  - Map preview with Google Maps embed
  - Route metadata (buffer, overlap ratio)
- **Read-only**: No upload or editing

### Admin (`/admin`)
- **Purpose**: Participant management
- **Features**:
  - Participant table
  - Exclude/include participants
  - Export winners

---

## 🔧 Component Architecture

```
Pages (Route-level)
    │
    ├── Call Components
    │   └── Components (UI only)
    │       └── Call Services
    │           └── Services (Business Logic + Supabase)
    │               └── Supabase Client
    │
    └── No direct Supabase access
```

### Component Hierarchy

```
AppHeader (common)
    ├── Navigation Links
    │   ├── Dashboard
    │   ├── Routes
    │   └── Leaderboard
    └── Mobile Menu (responsive)

Dashboard Page
    ├── RunnerSummaryCard
    ├── StageProgressList
    ├── RankCard
    └── CTA Button

Leaderboard Page
    ├── Tabs (Overall, Stage 1, 2, 3)
    ├── Gender Filters
    ├── OverallLeaderboardTable
    └── StageLeaderboardTable

Routes Page
    ├── Challenge Info
    └── RouteMap (per stage)
        └── Google Maps Embed
```

---

## 🗄️ Database Schema Overview

```
users
    ├── id (uuid, PK)
    ├── full_name
    ├── strava_athlete_id
    └── is_demo

challenges
    ├── id (uuid, PK)
    ├── name
    ├── starts_at
    ├── ends_at
    └── is_active

participants
    ├── id (uuid, PK)
    ├── user_id (FK → users)
    ├── challenge_id (FK → challenges)
    └── excluded (boolean)

routes
    ├── id (uuid, PK)
    ├── challenge_id (FK → challenges)
    ├── stage_number
    └── gpx_geo (PostGIS geography)

activities
    ├── id (uuid, PK)
    ├── user_id (FK → users)
    ├── strava_activity_id
    ├── polyline (encoded)
    └── processed_at

stage_results
    ├── id (uuid, PK)
    ├── user_id (FK → users)
    ├── challenge_id (FK → challenges)
    ├── stage_number
    └── best_time_seconds

leaderboard_overall (VIEW)
    └── Derived from stage_results

leaderboard_stage (VIEW)
    └── Derived from stage_results
```

---

## 🔄 Edge Functions Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge Functions                            │
└─────────────────────────────────────────────────────────────┘

1. auth-strava-callback
   └── OAuth callback handler
       └── Creates user, stores tokens, creates participant

2. sync-strava-activities
   └── Cron: Every 30 minutes
       └── Fetches activities from Strava, inserts into DB

3. process-activities
   └── Cron: Every 30 minutes (after sync)
       └── Matches activities to routes, creates stage_results

4. admin-exclude-user
   └── Admin action
       └── Excludes participant, writes audit log

5. init-demo-data (Demo Mode)
   └── Creates demo user, participant, activities, results

6. demo-auth (Demo Mode)
   └── Returns demo user credentials for sign-in
```

---

## 🔐 Supabase roles and scripts by stage

| Stage | Supabase role / client | RPC / DB functions | Edge functions | Migrations / scripts |
|--------|-------------------------|---------------------|----------------|----------------------|
| **Landing – check Strava by email** | `anon` or `authenticated` (browser) | `check_strava_connection_by_email(email)` (SECURITY DEFINER) | — | `04_check_strava_by_email.sql` |
| **Landing – OAuth callback** | `anon` (Bearer anon key) | — | `auth-strava-callback` (uses service_role internally) | `01_initial_schema.sql` (users, participants, strava_tokens); `06_ensure_participants_for_existing_users.sql` (backfill) |
| **Dashboard – current user & rank** | `authenticated` | — | — | RLS: `users_read_self`, `users_read_leaderboard`; `leaderboard_overall` view |
| **Leaderboard** | `authenticated` | — | — | RLS: `users_read_leaderboard`, `participants_read_leaderboard`, `stage_results_read_leaderboard`; views: `leaderboard_overall`, `leaderboard_stage` |
| **Routes page – from DB** | `authenticated` | — | — | `01_initial_schema` (routes table); `02_insert_routes_challenge_1.sql`, `03_demo_test_route.sql` |
| **Routes page – from files** | — | — | — | Next.js API route `pages/api/routes.js` (reads `./routes/challenge_1/stage-*.gpx`) |
| **Sync activities** | service_role (Edge) | — | `sync-strava-activities` (cron) | `01_initial_schema` (activities, strava_tokens) |
| **Process activities** | service_role (Edge) | `match_activity_to_route(activity_polyline, route_id)` | `process-activities` (cron) | `match_activity_to_route.sql`; `01_initial_schema` (routes, stage_results) |
| **Admin exclude user** | `authenticated` (admin JWT) | — | `admin-exclude-user` | RLS: `participants_admin_update`; `01_initial_schema` (audit_logs) |
| **Demo mode** | `anon` then `authenticated` | — | `init-demo-data`, `demo-auth` | `01_initial_schema`; demo data in `init-demo-data` |
| **Seed routes from GPX** | — | — | — | Script: `scripts/upload-routes.js` (generates SQL from `routes/challenge_*/stage-*.gpx`) |

**Roles summary:**
- **anon**: Landing (check Strava by email, trigger OAuth callback).
- **authenticated**: Dashboard, leaderboard, routes (DB), admin exclude; RLS policies limit rows to permitted data.
- **service_role** (Edge only): sync-strava-activities, process-activities, auth-strava-callback (create user/tokens/participant).

---

## 🎯 Future Enhancement Areas

### Planned Features (Not in MVP)
- [ ] Payment/ticketing system
- [ ] Notifications (email, push)
- [ ] Appeals system
- [ ] Multiple concurrent challenges
- [ ] Historical challenges archive
- [ ] Social features (sharing, comments)
- [ ] Mobile apps (iOS/Android)

### Technical Improvements
- [ ] Strava webhooks (reduce polling)
- [ ] Real-time leaderboard updates
- [ ] Advanced route visualization
- [ ] Activity replay/visualization
- [ ] Performance optimizations
- [ ] Enhanced error handling
- [ ] Monitoring and alerting

### UI/UX Enhancements
- [ ] Activity detail pages
- [ ] Route comparison tools
- [ ] Personal statistics dashboard
- [ ] Achievement badges
- [ ] Social sharing features
- [ ] Dark/light theme toggle

---

## 📝 Notes for Developers

### Adding New Pages
1. Create page in `src/pages/`
2. Add route to navigation in `AppHeader.js`
3. Update this diagram

### Adding New Services
1. Create service in `src/services/`
2. Follow existing patterns (try/catch, logging)
3. Update this diagram

### Modifying Data Flow
1. Update edge functions if needed
2. Update database schema if needed
3. Update this diagram

### Testing Flow Changes
1. Test authentication flow
2. Test activity processing
3. Test leaderboard updates
4. Test navigation between pages

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Maintainer**: OUTRUN Development Team

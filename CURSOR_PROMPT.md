# 🚀 Cursor Project Context Prompt — OUTRUN POC

You are working on a structured MVP/POC called **OUTRUN**, a virtual running challenge web application that integrates with Strava to automatically validate runner activities against predefined GPX routes and compute deterministic leaderboards.

This project is already architected. Your job is to **complete and wire what is specified**, not redesign or invent new features.

All technical specifications are documented in:

* `/outrun_poc/SQL_SCHEMA.md` → Supabase schema, views, RLS, audit structure
* `/outrun_poc/EDGE_FUNCTIONS.md` → Edge Functions, responsibilities, flow
* `/outrun_poc/DEPLOYMENT.md` → Checklist of completed vs pending items

You must strictly follow those documents as the source of truth unless specifically instructed otherwise.

---

## Core Product Rules (Do NOT change)

* Only Strava OAuth authentication is allowed (no manual accounts)
* Only real GPS runs count
* Virtual runs, manual runs, cycling, walking must be ignored
* Route completion is validated via GPX overlap logic (≥80%)
* Silent failure for invalid/non-matching activities
* Leaderboards are fully derived from validated stage results
* No manual activity approval exists
* Admins can only exclude participants, delete entries and export winners
* Only one active challenge exists at this time (must be able to handle in future)
* Challenge duration = 21 days, 3 stages

---

## Architecture Rules (Critical)

* Frontend: Next.js + React + MUI
* Backend: Supabase + Edge Functions (service-role controlled)
* No business logic in UI components
* Pages compose components only
* Components never directly access Supabase
* Services are only for frontend reads
* Edge Functions handle:

  * Strava sync
  * Token refresh
  * Activity ingestion
  * GPX validation
  * Stage completion
  * Audit logging

Do NOT move logic to the client.

---

## What is already done

* UI structure and components
* Theme & branding
* Header layout
* Env setup
* Project structure
* Documentation for schema & edge functions

---

## Your tasks

Using the docs as the blueprint, you must:

1. Implement Supabase SQL schema exactly as defined
2. Implement Edge Functions exactly as described
3. Ensure env variable names use:

   * DB_URL
   * SERVICE_ROLE_KEY
   * ANON_KEY
   * APP_BASE_URL
4. Ensure activity ingestion filters:

   * Run only
   * Non-virtual
   * Not manual
   * Has GPS polyline
5. Ensure processing:

   * Only participants
   * Only within challenge dates
   * Only valid GPX matches
6. Ensure leaderboards rely ONLY on stage_results
7. Ensure audit logs are written for:

   * Strava connect
   * Stage completion
   * Admin exclusion

---

## Constraints

* Never add features outside SQL_SCHEMA.md and EDGE_FUNCTIONS.md
* Never modify existing frontend logic unless required for integration
* Never simplify validation logic
* Never bypass Supabase security model
* Always prefer deterministic behaviour
* Silent ignore over throwing errors for invalid activities

---

## Goal

Produce a fully working MVP/POC that:

* Connects Strava users
* Syncs valid activities
* Validates against 3 GPX routes
* Computes stage + overall leaderboards
* Runs entirely via Supabase Edge Functions
* Deploys cleanly on Vercel

No extra product decisions. Follow the docs.

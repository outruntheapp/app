# Demo Mode Data

This directory contains demo mode utilities and data for testing the app without Strava authentication.

## Overview

Demo mode creates a complete test environment with:
- Demo user account
- Demo participant in active challenge
- Demo activities (3 runs matching challenge_1 stages)
- Demo stage results

All demo data is clearly marked and separate from production data.

## Files

- `demoData.js` - Demo data generation utilities
- `demoService.js` - Service to create/manage demo data in Supabase

## Usage

Demo mode is enabled via the toggle on the landing page. When enabled, it automatically:
1. Creates demo user if needed
2. Creates demo participant
3. Creates demo activities and stage results
4. Allows viewing dashboard, leaderboard, etc. without Strava auth

## Demo Data Structure

- **User**: Demo Runner (demo-user-id)
- **Activities**: 3 runs with polylines matching challenge_1 GPX routes
- **Times**: Average completion times for each stage
- **Stage Results**: Best times for each of the 3 stages

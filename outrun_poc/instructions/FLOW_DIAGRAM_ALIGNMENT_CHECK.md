# APP_FLOW_DIAGRAM.md Alignment Check

**Date**: [Current Date]  
**Status**: ⚠️ **Partial Alignment** - Some features documented but not implemented

---

## ✅ Aligned Features

### 1. Navigation Flow
- ✅ **AppHeader**: Full-width header with navigation links (Dashboard, Routes, Leaderboard)
- ✅ **Mobile Responsive**: Hamburger menu on small screens
- ✅ **Hidden on Landing**: Navigation not shown on landing page (`/`)
- ✅ **Visible on Other Pages**: Navigation shown on dashboard, routes, leaderboard, admin

### 2. Dashboard Page (`/dashboard`)
- ✅ User profile (name, avatar) - via `RunnerSummaryCard`
- ✅ Challenge summary - via `RunnerSummaryCard`
- ✅ Stage progress (1/3, 2/3, 3/3) - via `StageProgressList`
- ✅ User's current rank (overview only) - via `RankCard`
- ✅ "View Full Leaderboard" CTA button
- ✅ Does NOT show full leaderboard tables

### 3. Leaderboard Page (`/leaderboard`)
- ✅ Overall leaderboard
- ✅ Per-stage leaderboards (Stage 1, 2, 3)
- ✅ Gender filters (All, Male, Female, Unknown)
- ✅ Tabs for switching views
- ✅ Shows all participants, full rankings

### 4. Routes Page (`/routes`)
- ✅ Display GPX maps for each stage
- ✅ One section per stage (1, 2, 3)
- ✅ Map preview with Google Maps embed
- ✅ Route metadata (buffer, overlap ratio)
- ✅ Read-only (no upload or editing)

### 5. Authentication Flow
- ✅ Strava OAuth redirect
- ✅ OAuth callback handler (`/auth/callback`)
- ✅ Edge function creates user, stores tokens, creates participant
- ✅ Redirects to dashboard after successful auth

### 6. Data Flow
- ✅ Activity processing via cron jobs
- ✅ Edge functions: `sync-strava-activities`, `process-activities`
- ✅ Database views: `leaderboard_overall`, `leaderboard_stage`
- ✅ Frontend pages consume views correctly

### 7. Component Architecture
- ✅ Pages call components, components call services
- ✅ No direct Supabase access from pages
- ✅ Component hierarchy matches diagram

---

## ⚠️ Discrepancies (Documented but Not Implemented)

### 1. Landing Page Flow - Email Collection

**Documented in APP_FLOW_DIAGRAM.md:**
```
- "Join Challenge" button (reveals Strava button)
  - User enters email
  - FUTURE ADDITION: Enter code from ticket 
  - reveals Strava button
- "Connect Strava" button 
  - only first time, use email entered on "Join Challenge" for Strava Auth
  - if user already connected Strava, show "ENTER"
```

**Current Implementation:**
- ❌ **No email input** - "Join Challenge" button simply reveals Strava button
- ❌ **No ticket code entry** - Not implemented (marked as FUTURE)
- ❌ **No email collection** - Email is not collected or used
- ❌ **No "ENTER" button** - Strava button always shows "Connect with Strava"
- ❌ **No check for existing Strava connection** - Button doesn't detect if user already connected

**Files to Check:**
- `src/pages/index.js` - Landing page implementation
- `src/components/auth/StravaConnectButton.js` - Strava button component

**Current Behavior:**
1. User clicks "Join Challenge" → Reveals "Connect with Strava" button
2. User clicks "Connect with Strava" → Redirects to Strava OAuth
3. No email collection or ticket code entry
4. No differentiation between first-time and returning users

---

## 📋 Recommendations

### Option 1: Update Diagram to Match Implementation
If the email collection and "ENTER" button are not needed for MVP, update `APP_FLOW_DIAGRAM.md` to reflect current implementation:

```markdown
### Landing Page (`/`)
- **Purpose**: Entry point, authentication
- **Features**:
  - Challenge countdown timer
  - "Join Challenge" button (reveals Strava button)
  - "Connect Strava" button (always visible after "Join Challenge")
  - Demo mode toggle
  - Rules dialog
- **No navigation header**
```

### Option 2: Implement Missing Features
If email collection and returning user detection are required:

1. **Add Email Input to Landing Page**
   - Add email input field when "Join Challenge" is clicked
   - Store email in state/localStorage
   - Pass email to Strava auth flow (if needed)

2. **Add "ENTER" Button for Returning Users**
   - Check if user has existing Strava connection
   - Show "ENTER" button instead of "Connect with Strava"
   - Redirect directly to dashboard if authenticated

3. **Add Ticket Code Entry (Future)**
   - Add ticket code input field
   - Validate ticket code before revealing Strava button
   - Store ticket code for future reference

---

## 🔍 Detailed Comparison

### Landing Page Features

| Feature | Diagram | Implementation | Status |
|---------|---------|---------------|--------|
| Challenge countdown | ✅ | ✅ | Aligned |
| "Join Challenge" button | ✅ | ✅ | Aligned |
| Email input | ✅ | ❌ | **Missing** |
| Ticket code entry | ✅ (Future) | ❌ | Not implemented |
| "Connect Strava" button | ✅ | ✅ | Aligned |
| "ENTER" for returning users | ✅ | ❌ | **Missing** |
| Demo mode toggle | ✅ | ✅ | Aligned |
| Rules dialog | ✅ | ✅ | Aligned |
| No navigation header | ✅ | ✅ | Aligned |

### Authentication Flow

| Step | Diagram | Implementation | Status |
|------|---------|----------------|--------|
| User clicks "Connect Strava" | ✅ | ✅ | Aligned |
| Redirect to Strava | ✅ | ✅ | Aligned |
| OAuth callback | ✅ | ✅ | Aligned |
| Create/update user | ✅ | ✅ | Aligned |
| Store tokens | ✅ | ✅ | Aligned |
| Create participant | ✅ | ✅ | Aligned |
| Redirect to dashboard | ✅ | ✅ | Aligned |
| Use email from "Join Challenge" | ✅ | ❌ | **Not implemented** |

---

## ✅ Conclusion

**Overall Alignment**: ~85% aligned

**Main Issues**:
1. Email collection on landing page is documented but not implemented
2. "ENTER" button for returning users is documented but not implemented
3. Ticket code entry is marked as "FUTURE" but included in current flow description

**Recommendation**: 
- **For MVP**: Update `APP_FLOW_DIAGRAM.md` to match current implementation (remove email collection and "ENTER" button from current flow, mark as future enhancements)
- **For Production**: Implement email collection and returning user detection if required

**Next Steps**:
1. Decide if email collection is required for MVP
2. If yes, implement email input and "ENTER" button logic
3. If no, update diagram to reflect current simplified flow
4. Mark ticket code entry clearly as future enhancement

---

**Last Updated**: [Current Date]  
**Checked By**: Development Team

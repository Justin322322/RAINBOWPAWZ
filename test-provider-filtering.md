# Bug Fix: Cremation Centers Showing When Pending

## Issue Description

Cremation centers were displaying in the services list even when their application status was still "pending". When users clicked on these pending providers, they would get a "provider not found" error.

## Root Cause

The service providers listing API (`/api/service-providers`) was incorrectly including providers with `application_status = 'pending'` in the results, while the individual provider API (`/api/service-providers/[id]`) correctly filtered them out.

## Files Changed

- `src/app/api/service-providers/route.ts`

## Changes Made

1. **Line 162-164**: Removed `'pending'` from the allowed application statuses

   - **Before**: `"(application_status = 'approved' OR application_status = 'verified' OR application_status = 'pending')"`
   - **After**: `"(application_status = 'approved' OR application_status = 'verified')"`

2. **Line 167**: Also fixed the fallback verification_status condition
   - **Before**: `"(verification_status = 'verified' OR verification_status = 'pending')"`
   - **After**: `"verification_status = 'verified'"`

## Expected Behavior After Fix

- Only approved/verified cremation centers will appear in the services listing
- Users will no longer see pending applications in the search results
- Restricted cremation centers are also properly filtered out (already working correctly)
- No more "provider not found" errors when clicking on cremation centers
- Consistent filtering between listing and individual provider endpoints

## Testing

To test this fix:

1. Navigate to the services page as a fur parent
2. Verify that only approved cremation centers are displayed
3. Click on any cremation center - it should load successfully without "provider not found" errors
4. Check that pending applications are not visible to regular users (only admins should see them in the admin panel)
5. Verify that restricted cremation centers are also not visible to regular users

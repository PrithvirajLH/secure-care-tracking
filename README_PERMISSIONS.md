# Permission System for Edit Completed Date Feature

This document explains how to configure role-based access control for the "Edit Completed Date" feature.

## Overview

The edit completed date feature (clicking on blue badges to edit completed dates) is now protected by a permission system. Only users in the allowed list can use this feature.

## Configuration

### Step 1: Add Users to Permission List

Add user emails to the `EDIT_COMPLETED_DATE_PERMISSIONS` environment variable in your `.env` file (or Azure App Service Configuration):

**For local development** (`backend/.env`):
```env
EDIT_COMPLETED_DATE_PERMISSIONS=user1@example.com,user2@example.com
```

**For Azure App Service**:
1. Go to Azure Portal → Your App Service
2. Navigate to **Configuration** → **Application settings**
3. Add a new application setting:
   - **Name**: `EDIT_COMPLETED_DATE_PERMISSIONS`
   - **Value**: `user1@example.com,user2@example.com` (comma-separated)
4. Click **Save** and restart the app

**Note**: Emails are comma-separated. Whitespace is automatically trimmed.

### Step 2: User Identification

The system identifies users from request headers in this order:

1. **Azure Easy Auth** (Production): `x-ms-client-principal-name` header
2. **Custom Header** (Development): `x-user-email` header
3. **Query Parameter** (Testing only): `?user=email@example.com`

### Step 3: Testing Permissions

#### For Development/Testing:

You can test permissions by:

1. **Using a custom header:**
   ```bash
   curl -H "x-user-email: user1@example.com" http://localhost:3001/api/securecare/permissions/edit-completed-date
   ```

2. **Using query parameter:**
   ```
   http://localhost:3001/api/securecare/permissions/edit-completed-date?user=user1@example.com
   ```

#### For Production (Azure):

Azure Easy Auth automatically sets the `x-ms-client-principal-name` header with the authenticated user's email. The permission system will automatically use this.

## How It Works

1. **Frontend**: The Training page checks permissions on load using the `useEditCompletedDatePermission()` hook
2. **Backend**: The `/api/securecare/edit-completed` route is protected by `requireEditCompletedDatePermission` middleware
3. **UI Behavior**:
   - Users **with permission**: Blue badges are clickable, date picker appears on click
   - Users **without permission**: Blue badges are disabled, no date picker appears, tooltip shows "You do not have permission"

## API Endpoints

### Check Permissions
```
GET /api/securecare/permissions/edit-completed-date
```

Response:
```json
{
  "hasPermission": true,
  "userIdentifier": "user@example.com"
}
```

### Edit Completed Date (Protected)
```
POST /api/securecare/edit-completed
Headers: x-ms-client-principal-name (Azure) or x-user-email (dev)
Body: {
  "employeeId": "123",
  "scheduleColumn": "scheduleStandingVideo",
  "completeColumn": "standingVideo",
  "date": "2024-01-15"
}
```

## Adding More Permissions

To add more permission types in the future:

1. Add a new permission array in `backend/config/permissions.js`
2. Create a new middleware function in `backend/middleware/permissions.js`
3. Add a new permission check endpoint in `backend/routes/securecare.js`
4. Create a new hook in `src/hooks/usePermissions.ts`
5. Use the hook in the relevant component

## Security Notes

- Permissions are checked on both frontend (UI) and backend (API)
- Backend validation is the source of truth - frontend checks are for UX only
- User identification relies on Azure Easy Auth headers in production
- Never trust client-side permission checks alone


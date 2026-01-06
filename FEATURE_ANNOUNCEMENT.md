# Feature Update: Edit Completed Dates

## 🎉 New Feature Available

We're excited to announce a new feature that gives authorized users the ability to edit completed training dates directly from the Training dashboard.

## ✨ What's New

### Edit Completed Dates
- **Click on blue badges** (completed dates) to open a date picker
- **Select a new date** to reschedule the training
- The system will automatically:
  - Update the schedule date with your selected date
  - Clear the completion date (sets it back to NULL)
  - Transition the item back to "scheduled" status (yellow badge)

### Workflow
1. **Blue Badge** (Completed) → Click → Date Picker opens
2. **Select New Date** → Schedule updated, completion cleared
3. **Yellow Badge** (Scheduled) → Click → Reschedule or Mark Complete options

## 🔐 Role-Based Access Control

This feature is available only to **authorized users** with special permissions. 

- **Authorized users**: Blue badges are clickable (pointer cursor) and date picker opens on click
- **Other users**: Blue badges appear normal but are not clickable (default cursor)

## 🚀 Benefits

- **Flexibility**: Easily reschedule completed training items
- **Efficiency**: No need to manually clear and reschedule - it's done in one action
- **Control**: Only authorized personnel can make these changes
- **Immediate Updates**: Changes reflect instantly in the UI

## 📋 Technical Details

- **Backend**: Protected API endpoint with permission middleware
- **Frontend**: Permission-based UI that adapts based on user access
- **Security**: User identification via Azure Easy Auth headers
- **Configuration**: Permissions managed via environment variables

## 🎯 How to Use

1. Navigate to the **Training** page
2. Find a training item with a **blue badge** (completed date)
3. If you have permission, the badge will show a **pointer cursor** on hover
4. **Click the blue badge** to open the date picker
5. **Select a new date** to reschedule
6. The item will transition to **yellow badge** (scheduled) status
7. From there, you can **Reschedule** or **Mark Complete** as usual

## 🔧 For Administrators

User permissions are configured via the `EDIT_COMPLETED_DATE_PERMISSIONS` environment variable in Azure App Service Configuration.

**To add authorized users:**
1. Go to Azure Portal → App Service → Configuration
2. Edit `EDIT_COMPLETED_DATE_PERMISSIONS` 
3. Add user emails (comma-separated): `user1@example.com,user2@example.com`
4. Save and restart the app

## 📝 Notes

- This feature maintains data integrity by updating both schedule and completion columns in a single transaction
- All changes are logged and tracked
- The feature respects existing workflow: items must be scheduled before they can be marked complete

---

**Questions or Issues?** Contact the development team for support.


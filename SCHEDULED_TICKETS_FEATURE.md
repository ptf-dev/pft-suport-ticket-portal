# Scheduled Ticket Handling Feature

## Overview
This feature allows tickets to be scheduled for specific dates, improving planning, prioritization, and workload management. Tickets can be scheduled for today, tomorrow, or any custom date, with powerful filtering options to view tickets by their scheduled dates.

## Features Implemented

### 1. Database Schema Update
**File:** `prisma/schema.prisma`

Added `scheduledDate` field to the Ticket model:
```prisma
model Ticket {
  // ... existing fields
  scheduledDate DateTime? // Date when ticket is scheduled to be worked on
  // ... rest of fields
  
  @@index([scheduledDate]) // Index for efficient filtering
}
```

**Migration:** `prisma/migrations/20260507124905_add_scheduled_date_to_tickets/migration.sql`

### 2. API Endpoint for Scheduling
**File:** `app/api/admin/tickets/[id]/schedule/route.ts`

**Endpoint:** `PATCH /api/admin/tickets/[id]/schedule`

**Features:**
- Admin-only access
- Set, update, or clear scheduled dates
- Validates dates are not in the past
- Prevents scheduling deleted tickets

**Request Body:**
```json
{
  "scheduledDate": "2026-05-08" // ISO date string or null to clear
}
```

**Response (Success - 200):**
```json
{
  "message": "Ticket scheduled successfully",
  "ticket": {
    "id": "ticket-123",
    "title": "Fix login bug",
    "scheduledDate": "2026-05-08T00:00:00.000Z",
    "updatedAt": "2026-05-07T12:49:05.000Z"
  }
}
```

### 3. Schedule Ticket Modal
**File:** `app/admin/tickets/schedule-ticket-modal.tsx`

A beautiful modal component for scheduling tickets with:
- **Quick Select Buttons:**
  - 📌 Today
  - ⏭️ Tomorrow
  - 📆 Next Week
- **Custom Date Picker:** Choose any future date
- **Current Schedule Display:** Shows existing scheduled date
- **Clear Schedule:** Remove scheduled date
- **Success/Error Feedback:** Clear user feedback
- **Auto-refresh:** Page refreshes after successful update

### 4. Schedule Ticket Button
**File:** `app/admin/tickets/[id]/schedule-ticket-button.tsx`

A smart button component that:
- Shows current scheduled date if set
- Displays "📌 Today" for today's date
- Displays "⏭️ Tomorrow" for tomorrow's date
- Displays "📅 [Date]" for other dates
- Opens the schedule modal on click
- Changes appearance based on schedule status

### 5. Schedule Filters
**File:** `app/admin/tickets/ticket-filters.tsx`

Added comprehensive schedule filtering options:

**Quick Filters:**
- **📌 Today:** Tickets scheduled for today
- **⏭️ Tomorrow:** Tickets scheduled for tomorrow
- **📅 This Week:** Tickets scheduled for the current week (Monday-Sunday)
- **❓ Unscheduled:** Tickets without a scheduled date

**Custom Date Filter:**
- Date picker to view tickets scheduled for any specific date

### 6. Tickets Page Integration
**File:** `app/admin/tickets/page.tsx`

Updated to support schedule filtering:
- Added `scheduleFilter` and `scheduleDate` query parameters
- Implemented filtering logic for all schedule options
- Passes schedule filters to the TicketFilters component

## Usage

### For Administrators:

#### Scheduling a Ticket:
1. Navigate to a ticket detail page (`/admin/tickets/[id]`)
2. Click the "📅 Schedule" button (or the current schedule date)
3. Choose a quick option (Today, Tomorrow, Next Week) or pick a custom date
4. Click "Save Schedule"
5. The ticket is now scheduled!

#### Viewing Scheduled Tickets:
1. Navigate to `/admin/tickets?view=table`
2. Use the "Scheduled For" filters:
   - Click "📌 Today" to see today's tickets
   - Click "⏭️ Tomorrow" to see tomorrow's tickets
   - Click "📅 This Week" to see this week's tickets
   - Click "❓ Unscheduled" to see tickets without a schedule
   - Or pick a specific date using the date picker

#### Clearing a Schedule:
1. Open the schedule modal for a ticket
2. Click "Clear Schedule"
3. The scheduled date is removed

## Benefits

✅ **Improved Planning:** Schedule tickets for specific days to plan workload
✅ **Better Prioritization:** Focus on today's scheduled tickets
✅ **Workload Distribution:** See how tickets are distributed across days
✅ **Reduced Missed Tickets:** Clear visibility of what needs attention
✅ **Flexible Scheduling:** Quick options + custom dates for any scenario
✅ **Easy Filtering:** Powerful filters to view tickets by schedule

## Database Migration

To apply the database changes, run:

```bash
# Apply the migration
npx prisma migrate deploy

# Or for development
npx prisma migrate dev

# Regenerate Prisma Client
npx prisma generate
```

## Technical Details

### Database Index
An index on `scheduledDate` ensures efficient filtering:
```sql
CREATE INDEX "tickets_scheduledDate_idx" ON "tickets"("scheduledDate");
```

### Date Filtering Logic
The system uses precise date ranges for filtering:

**Today:**
```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
where.scheduledDate = { gte: today, lt: tomorrow }
```

**This Week:**
```typescript
const now = new Date()
const dayOfWeek = now.getDay()
const monday = new Date(now)
monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
monday.setHours(0, 0, 0, 0)
const sunday = new Date(monday)
sunday.setDate(sunday.getDate() + 7)
where.scheduledDate = { gte: monday, lt: sunday }
```

### Validation
- Scheduled dates cannot be in the past
- Deleted tickets cannot be scheduled
- Only admins can schedule tickets

## UI/UX Features

### Visual Indicators
- Scheduled tickets show the date in the button
- Different icons for different time periods (📌 Today, ⏭️ Tomorrow, 📅 Date)
- Active filter buttons are highlighted
- Clear visual feedback for success/error states

### Responsive Design
- Modal works on all screen sizes
- Filters adapt to mobile layouts
- Touch-friendly buttons and date pickers

### Accessibility
- Proper label associations
- Keyboard navigation support
- Clear focus states
- ARIA-compliant structure

## Future Enhancements

Potential improvements for future versions:
- **Calendar View:** Visual calendar showing scheduled tickets
- **Drag-and-Drop Scheduling:** Drag tickets to dates on a calendar
- **Recurring Schedules:** Schedule tickets to repeat
- **Schedule Notifications:** Remind admins of scheduled tickets
- **Bulk Scheduling:** Schedule multiple tickets at once
- **Schedule History:** Track schedule changes over time
- **Overdue Indicators:** Highlight tickets past their scheduled date
- **Schedule Analytics:** Reports on scheduling patterns

## Testing

### Manual Testing Checklist:
- [ ] Schedule a ticket for today
- [ ] Schedule a ticket for tomorrow
- [ ] Schedule a ticket for next week
- [ ] Schedule a ticket for a custom date
- [ ] Clear a scheduled date
- [ ] Filter tickets by "Today"
- [ ] Filter tickets by "Tomorrow"
- [ ] Filter tickets by "This Week"
- [ ] Filter tickets by "Unscheduled"
- [ ] Filter tickets by a specific date
- [ ] Verify scheduled date shows in ticket detail
- [ ] Verify scheduled date updates in real-time
- [ ] Test with deleted tickets (should not allow scheduling)

### API Testing:
```bash
# Schedule a ticket
curl -X PATCH http://localhost:3000/api/admin/tickets/[id]/schedule \
  -H "Content-Type: application/json" \
  -d '{"scheduledDate": "2026-05-08"}'

# Clear a schedule
curl -X PATCH http://localhost:3000/api/admin/tickets/[id]/schedule \
  -H "Content-Type: application/json" \
  -d '{"scheduledDate": null}'
```

## Security Considerations

1. **Admin-only access:** Only administrators can schedule tickets
2. **Date validation:** Prevents scheduling in the past
3. **Deleted ticket protection:** Cannot schedule deleted tickets
4. **Audit trail:** Updates `updatedAt` timestamp for tracking
5. **Input validation:** Zod schema validates all inputs

## Performance Considerations

1. **Database Index:** `scheduledDate` is indexed for fast filtering
2. **Efficient Queries:** Uses precise date ranges instead of full table scans
3. **Optimized Rendering:** Modal only renders when opened
4. **Debounced Updates:** Prevents excessive API calls

---

**Status:** ✅ Ready for deployment (after running migrations)
**Migration Required:** Yes - Run `npx prisma migrate deploy`
**Breaking Changes:** None
**Backward Compatible:** Yes - existing tickets will have `scheduledDate = null`

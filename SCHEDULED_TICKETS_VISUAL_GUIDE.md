# Scheduled Tickets - Visual User Guide

## 🎯 Quick Start Guide

### How to Schedule a Ticket

**Step 1:** Open a ticket
```
Navigate to: /admin/tickets/[ticket-id]
```

**Step 2:** Click the Schedule button
```
┌─────────────────────────────────────────────────┐
│ Ticket #abc12345 • Acme Inc                     │
│ Fix login authentication bug                    │
├─────────────────────────────────────────────────┤
│ [✏️ Edit] [📎 Add] [📅 Schedule] [🔗 Share]    │
└─────────────────────────────────────────────────┘
                         ↑
                    Click here!
```

**Step 3:** Choose when to schedule
```
┌───────────────────────────────────────────────┐
│  📅  Schedule Ticket                          │
│      Fix login authentication bug             │
├───────────────────────────────────────────────┤
│                                               │
│  Quick Select                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │📌 Today  │ │⏭️ Tomorrow│ │📆 Next   │     │
│  │          │ │           │ │  Week    │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│                                               │
│  Or Choose Custom Date                        │
│  ┌─────────────────────────────────────────┐ │
│  │ [Date Picker: May 8, 2026]              │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ ⚠️ Warning: This will schedule the      │ │
│  │ ticket for the selected date            │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  [Cancel]              [Save Schedule]        │
│                                               │
└───────────────────────────────────────────────┘
```

**Step 4:** See the result
```
┌─────────────────────────────────────────────────┐
│ Ticket #abc12345 • Acme Inc                     │
│ Fix login authentication bug                    │
├─────────────────────────────────────────────────┤
│ [✏️ Edit] [📎 Add] [📌 Today] [🔗 Share]       │
└─────────────────────────────────────────────────┘
                         ↑
                  Now shows "Today"!
```

---

## 🔍 How to Find Scheduled Tickets

### View Today's Tickets

**Step 1:** Go to tickets table view
```
Navigate to: /admin/tickets?view=table
```

**Step 2:** Click "Today" filter
```
┌─────────────────────────────────────────────────────────┐
│ Scheduled For:                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │📌 Today  │ │⏭️ Tomorrow│ │📅 This   │ │❓ Unsched│  │
│ │  (5)     │ │  (3)      │ │  Week    │ │  uled    │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│      ↑                                                  │
│  Click here to see today's tickets!                    │
└─────────────────────────────────────────────────────────┘
```

**Step 3:** See filtered results
```
┌─────────────────────────────────────────────────────────┐
│ Showing 5 tickets scheduled for today                   │
├─────────────────────────────────────────────────────────┤
│ 🎫 Fix login bug          │ OPEN    │ HIGH   │ 📌 Today│
│ 🎫 Update documentation   │ IN_PROG │ MEDIUM │ 📌 Today│
│ 🎫 Review pull request    │ OPEN    │ LOW    │ 📌 Today│
│ 🎫 Deploy to staging      │ OPEN    │ URGENT │ 📌 Today│
│ 🎫 Client meeting prep    │ OPEN    │ MEDIUM │ 📌 Today│
└─────────────────────────────────────────────────────────┘
```

---

## 📅 Filter Options Explained

### Quick Filters

#### 📌 Today
Shows all tickets scheduled for today (current date)
```
Use case: "What do I need to work on today?"
Example: May 7, 2026 → Shows tickets scheduled for May 7, 2026
```

#### ⏭️ Tomorrow
Shows all tickets scheduled for tomorrow
```
Use case: "What's coming up tomorrow?"
Example: Today is May 7 → Shows tickets scheduled for May 8, 2026
```

#### 📅 This Week
Shows all tickets scheduled for the current week (Monday-Sunday)
```
Use case: "What's on my plate this week?"
Example: Today is Wednesday, May 7
         Shows tickets from Monday, May 5 to Sunday, May 11
```

#### ❓ Unscheduled
Shows all tickets WITHOUT a scheduled date
```
Use case: "What tickets haven't been scheduled yet?"
Shows: All tickets where scheduledDate is null
```

### Custom Date Filter

Pick any specific date to see tickets scheduled for that day
```
┌─────────────────────────────────────────────┐
│ Specific Date: [📅 May 15, 2026] [Apply]   │
└─────────────────────────────────────────────┘
                      ↑
              Pick any date here!
```

---

## 🎨 Visual Indicators

### Schedule Button States

**Unscheduled Ticket:**
```
[📅 Schedule]
```

**Scheduled for Today:**
```
[📌 Today]
```

**Scheduled for Tomorrow:**
```
[⏭️ Tomorrow]
```

**Scheduled for Future Date:**
```
[📅 May 15, 2026]
```

### Filter Button States

**Inactive Filter:**
```
┌──────────┐
│📌 Today  │  ← Gray/outline style
└──────────┘
```

**Active Filter:**
```
┌──────────┐
│📌 Today  │  ← Blue/filled style
└──────────┘
```

---

## 🔄 Common Workflows

### Daily Planning Workflow

**Morning Routine:**
1. Open `/admin/tickets?view=table`
2. Click "📌 Today" filter
3. Review today's scheduled tickets
4. Start working on highest priority items

**End of Day:**
1. Check if all today's tickets are completed
2. Reschedule incomplete tickets to tomorrow
3. Click "⏭️ Tomorrow" to preview tomorrow's work

### Weekly Planning Workflow

**Monday Morning:**
1. Click "📅 This Week" filter
2. Review all tickets scheduled for the week
3. Adjust schedules as needed
4. Ensure workload is balanced

**Throughout the Week:**
1. Use "📌 Today" filter daily
2. Move tickets between days as priorities change
3. Schedule new tickets as they come in

### Unscheduled Tickets Workflow

**Regular Review:**
1. Click "❓ Unscheduled" filter
2. Review all unscheduled tickets
3. Schedule important tickets
4. Keep unscheduled list manageable

---

## 💡 Pro Tips

### Tip 1: Combine Filters
You can combine schedule filters with other filters:
```
Example: Show today's HIGH priority tickets
1. Click "📌 Today"
2. Select "HIGH" from Priority dropdown
3. See only high-priority tickets scheduled for today
```

### Tip 2: Quick Rescheduling
To reschedule a ticket:
```
1. Click the current schedule button (e.g., "📌 Today")
2. Click "⏭️ Tomorrow" in the modal
3. Click "Save Schedule"
Done in 3 clicks!
```

### Tip 3: Clear Schedule
To remove a schedule:
```
1. Click the schedule button
2. Click "Clear Schedule" button
3. Ticket returns to unscheduled state
```

### Tip 4: Keyboard Navigation
```
Tab       → Navigate between buttons
Enter     → Activate button/save
Escape    → Close modal
```

---

## 📊 Dashboard View (Coming Soon)

Future enhancement will include a calendar dashboard:
```
┌─────────────────────────────────────────────────────┐
│              May 2026                               │
├─────────────────────────────────────────────────────┤
│ Mon    Tue    Wed    Thu    Fri    Sat    Sun      │
├─────────────────────────────────────────────────────┤
│        1      2      3      4      5      6         │
│                                                     │
│ 7      8      9      10     11     12     13        │
│ 🎫×5   🎫×3   🎫×2   🎫×1   🎫×4                   │
│ TODAY                                               │
│                                                     │
│ 14     15     16     17     18     19     20        │
│        🎫×2                                         │
└─────────────────────────────────────────────────────┘
```

---

## ❓ FAQ

**Q: Can I schedule a ticket for the past?**
A: No, the system prevents scheduling tickets for past dates.

**Q: What happens to the schedule if I delete a ticket?**
A: Deleted tickets cannot be scheduled. If a ticket is already scheduled and then deleted, the schedule is preserved but the ticket won't appear in filters.

**Q: Can I schedule multiple tickets at once?**
A: Not yet, but bulk scheduling is planned for a future update.

**Q: Do scheduled dates affect ticket status?**
A: No, scheduling is independent of status. A ticket can be scheduled for today but still be in "OPEN" status.

**Q: Can clients see scheduled dates?**
A: No, scheduling is admin-only. Clients don't see scheduled dates.

**Q: What timezone is used for scheduling?**
A: The system uses the server's timezone. All dates are stored in UTC and displayed in your local timezone.

---

## 🎯 Best Practices

### ✅ Do:
- Schedule tickets as soon as you know when you'll work on them
- Review and adjust schedules daily
- Use "Unscheduled" filter regularly to catch missed tickets
- Schedule high-priority tickets first
- Balance workload across days

### ❌ Don't:
- Don't over-schedule (be realistic about capacity)
- Don't forget to reschedule if priorities change
- Don't leave important tickets unscheduled
- Don't schedule too far in advance (things change)

---

## 🆘 Need Help?

If you encounter issues:
1. Check that you're logged in as an admin
2. Refresh the page
3. Clear browser cache
4. Check the documentation
5. Contact support

---

**Happy Scheduling! 🎉**

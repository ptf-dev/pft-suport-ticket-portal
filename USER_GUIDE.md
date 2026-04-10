# PropFirmsTech Support Portal - User Guide

This guide explains how to use the PropFirmsTech Support Portal for both administrators and client users.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Guide](#admin-guide)
3. [Client Guide](#client-guide)
4. [Common Tasks](#common-tasks)
5. [FAQ](#faq)

---

## Getting Started

### Accessing the Portal

- **Admin Access**: Navigate to the admin dashboard URL provided by your organization
- **Client Access**: Navigate to your company's portal URL (typically `yourcompany.propfirmstech.com/portal`)

### First Time Login

1. Enter your email address and password
2. Click "Sign In"
3. You'll be redirected to your dashboard based on your role

### Forgot Password

Contact your administrator to reset your password.

---

## Admin Guide

Administrators have full access to manage companies, users, and all support tickets across the platform.

### Admin Dashboard

The admin dashboard provides an overview of all support activity:

- **Ticket Status Cards**: View counts of tickets by status (Open, In Progress, Waiting Client, Resolved, Closed)
- **Recent Tickets Table**: See the 10 most recent tickets across all companies
- **Quick Actions**: Access companies, users, and tickets from the navigation bar

### Managing Companies

#### Viewing Companies

1. Click "Companies" in the navigation bar
2. View list of all prop firm clients
3. See user count and ticket count for each company

#### Creating a New Company

1. Navigate to Companies → "Create Company"
2. Fill in required fields:
   - **Company Name**: The prop firm's name
   - **Contact Email**: Primary contact email
   - **WhatsApp Link** (optional): Link to WhatsApp support
   - **Notes** (optional): Internal notes about the company
3. Click "Create Company"

#### Editing a Company

1. Navigate to Companies
2. Click on a company name
3. Update fields as needed
4. Click "Save Changes"

### Managing Users

#### Viewing Users

1. Click "Users" in the navigation bar
2. View list of all users (admins and clients)
3. See user role and associated company

#### Creating a New User

1. Navigate to Users → "Create User"
2. Fill in required fields:
   - **Name**: User's full name
   - **Email**: User's email address (must be unique)
   - **Password**: Initial password (user should change this)
   - **Role**: Select ADMIN or CLIENT
   - **Company** (for CLIENT role): Select the user's company
3. Click "Create User"

**Important Notes:**
- Admin users don't need a company assignment
- Client users MUST be assigned to a company
- Email addresses must be unique across the system

### Managing Tickets

#### Viewing All Tickets

1. Click "Tickets" in the navigation bar
2. View all tickets across all companies
3. Use filters to narrow results:
   - Filter by Company
   - Filter by Status
   - Filter by Priority

#### Viewing Ticket Details

1. Click on any ticket in the list
2. View full ticket information:
   - Title and description
   - Current status and priority
   - Company and creator information
   - All comments (public and internal)
   - Attached images

#### Updating Ticket Status

1. Open a ticket detail page
2. In the sidebar, find "Change Status"
3. Select new status from dropdown
4. Click "Update Status"

**Status Options:**
- **OPEN**: New ticket, not yet addressed
- **IN_PROGRESS**: Team is actively working on it
- **WAITING_CLIENT**: Waiting for client response
- **RESOLVED**: Issue has been fixed
- **CLOSED**: Ticket is complete and archived

#### Updating Ticket Priority

1. Open a ticket detail page
2. In the sidebar, find "Change Priority"
3. Select new priority from dropdown
4. Click "Update Priority"

**Priority Levels:**
- **LOW**: Minor issues, no urgency
- **MEDIUM**: Standard priority (default)
- **HIGH**: Important issues requiring prompt attention
- **URGENT**: Critical issues requiring immediate action

#### Adding Comments

1. Open a ticket detail page
2. Scroll to the comments section
3. Type your comment in the text area
4. **Optional**: Check "Internal note" to hide comment from client
5. Click "Add Comment"

**Comment Types:**
- **Public Comments**: Visible to both admins and clients
- **Internal Notes**: Only visible to admins (use for internal discussion)

#### Viewing Attached Images

1. Open a ticket detail page
2. Scroll to "Attached Images" section
3. Click on any image to view full size
4. Images show filename and file size

---

## Client Guide

Client users can create and manage support tickets for their company.

### Client Dashboard

Your dashboard shows an overview of your company's support tickets:

- **Summary Statistics**: Total tickets, open tickets, in progress, and resolved
- **Recent Tickets**: Your 10 most recent tickets
- **Quick Actions**: Create new ticket, view all tickets

### Creating a Support Ticket

1. Click "New Ticket" in the navigation bar
2. Fill in the ticket form:
   - **Title**: Brief description of the issue (required)
   - **Description**: Detailed explanation of the problem (required)
   - **Priority**: Select urgency level (Low, Medium, High, Urgent)
   - **Category**: Optional category (e.g., Technical, Billing, Account)
3. Click "Create Ticket"
4. You'll be redirected to the ticket detail page

**Tips for Good Tickets:**
- Use clear, descriptive titles
- Provide step-by-step details in the description
- Include error messages if applicable
- Set appropriate priority level

### Viewing Your Tickets

1. Click "Tickets" in the navigation bar
2. View all tickets for your company
3. Click on any ticket to see details

**Note**: You can only see tickets belonging to your company.

### Viewing Ticket Details

1. Click on a ticket from your dashboard or tickets list
2. View complete ticket information:
   - Title, description, and category
   - Current status and priority
   - Creation date and last update
   - All public comments
   - Attached images

### Adding Comments to Tickets

1. Open a ticket detail page
2. Scroll to the comments section at the bottom
3. Type your comment or question
4. Click "Add Comment"

**Note**: All your comments are public and visible to the support team.

### Tracking Ticket Status

Tickets progress through these statuses:

1. **OPEN**: Your ticket has been received
2. **IN_PROGRESS**: Support team is working on it
3. **WAITING_CLIENT**: Support team needs more information from you
4. **RESOLVED**: Issue has been fixed (please verify)
5. **CLOSED**: Ticket is complete

**When status is "WAITING_CLIENT":**
- Check the latest comment from support
- Provide requested information
- Add a comment to notify support you've responded

### Notification Settings

Configure how you receive email notifications:

1. Click "Settings" in the navigation bar
2. Toggle notification preferences:
   - Email notifications enabled/disabled
   - Notify on status changes
   - Notify on new comments
   - Notify on ticket assignment
   - Notify on ticket resolution
3. Click "Save Settings"

**Note**: Email notifications require SMTP configuration by your administrator.

---

## Common Tasks

### Responding to a Support Request

**For Clients:**
1. Check your email for notification (if enabled)
2. Log into the portal
3. Navigate to the ticket
4. Read the support team's comment
5. Add your response as a comment
6. Wait for the support team to update the ticket

**For Admins:**
1. Review new tickets on the dashboard
2. Open the ticket detail page
3. Update status to "IN_PROGRESS"
4. Add a comment with your response or questions
5. If waiting for client, update status to "WAITING_CLIENT"
6. When resolved, update status to "RESOLVED"

### Escalating a Ticket

**For Clients:**
1. Open the ticket
2. Add a comment explaining the urgency
3. Contact your account manager if critical

**For Admins:**
1. Open the ticket
2. Update priority to "HIGH" or "URGENT"
3. Add an internal note about escalation
4. Notify relevant team members

### Closing a Ticket

**For Admins:**
1. Verify the issue is resolved
2. Confirm with client if needed
3. Update status to "RESOLVED"
4. After client confirmation, update to "CLOSED"

**For Clients:**
- You cannot close tickets directly
- Confirm resolution in a comment
- Admin will close the ticket

### Searching for Tickets

**For Admins:**
1. Navigate to Tickets page
2. Use filters:
   - Select company from dropdown
   - Select status from dropdown
   - Select priority from dropdown
3. Filters combine to narrow results

**For Clients:**
- All tickets shown are already filtered to your company
- Use browser search (Ctrl+F / Cmd+F) to find specific tickets

---

## FAQ

### General Questions

**Q: How do I reset my password?**
A: Contact your administrator. They can reset your password or create a new account.

**Q: Can I change my email address?**
A: Contact your administrator to update your email address.

**Q: How long does it take to get a response?**
A: Response times vary by priority level. Urgent tickets are addressed first.

### For Clients

**Q: Can I see other companies' tickets?**
A: No. You can only see tickets belonging to your company.

**Q: Can I delete a ticket?**
A: No. Only administrators can manage ticket lifecycle. You can add a comment requesting closure.

**Q: Can I upload files to tickets?**
A: Image uploads are supported. Contact your administrator for other file types.

**Q: Why can't I see some comments?**
A: Internal notes are only visible to administrators. You see all public comments.

**Q: Can I assign tickets to specific support staff?**
A: No. Ticket assignment is managed by administrators.

### For Admins

**Q: Can I delete tickets?**
A: Tickets should not be deleted to maintain audit trail. Use "CLOSED" status instead.

**Q: How do I handle spam tickets?**
A: Close the ticket and add an internal note. Consider deactivating the user if needed.

**Q: Can I transfer a ticket to another company?**
A: No. Tickets are permanently associated with their company for data integrity.

**Q: How do I export ticket data?**
A: Use Prisma Studio or database queries. Contact your database administrator.

**Q: Can I customize email templates?**
A: Email template customization is available in the notification settings (requires SMTP setup).

---

## Getting Help

### For Clients

If you need assistance using the portal:
1. Contact your company's designated support liaison
2. Email your PropFirmsTech account manager
3. Create a ticket in the portal about portal usage

### For Admins

If you need technical assistance:
1. Refer to the README.md for technical documentation
2. Check DEPLOYMENT.md for deployment issues
3. Contact the development team
4. Review application logs for errors

---

## Best Practices

### For Clients

1. **Be Specific**: Provide detailed descriptions in tickets
2. **Use Priority Wisely**: Don't mark everything as urgent
3. **Respond Promptly**: Reply quickly when status is "WAITING_CLIENT"
4. **Confirm Resolution**: Let support know when issues are fixed
5. **One Issue Per Ticket**: Create separate tickets for different issues

### For Admins

1. **Update Status Regularly**: Keep ticket status current
2. **Use Internal Notes**: Document internal discussions
3. **Set Appropriate Priority**: Triage tickets based on impact
4. **Communicate Clearly**: Write clear, professional comments
5. **Close Resolved Tickets**: Keep the ticket list clean
6. **Monitor Dashboard**: Check for new tickets regularly

---

## Keyboard Shortcuts

Currently, the portal does not have keyboard shortcuts. This may be added in future updates.

---

## Mobile Access

The portal is responsive and works on mobile devices:
- Use your mobile browser to access the portal
- All features are available on mobile
- Optimized for touch interactions

---

## Updates and Changes

This user guide reflects the current version of the portal. Features and workflows may change with updates. Check back regularly for the latest information.

---

**Last Updated**: January 2024
**Version**: 1.0

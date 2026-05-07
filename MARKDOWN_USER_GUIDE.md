# Markdown Formatting Guide

## 📝 What is Markdown?

Markdown is a simple way to format text. Instead of clicking buttons, you type special characters to make text **bold**, *italic*, create lists, and more!

## ✨ Quick Examples

### Make Text Bold
```
**This text will be bold**
```
Result: **This text will be bold**

### Make Text Italic
```
*This text will be italic*
```
Result: *This text will be italic*

### Create Headings
```
# Large Heading
## Medium Heading
### Small Heading
```
Result:
# Large Heading
## Medium Heading
### Small Heading

### Create Lists

**Bullet List:**
```
- First item
- Second item
- Third item
```
Result:
- First item
- Second item
- Third item

**Numbered List:**
```
1. First step
2. Second step
3. Third step
```
Result:
1. First step
2. Second step
3. Third step

### Add Links
```
[Click here](https://example.com)
```
Result: [Click here](https://example.com)

### Add Code
**Inline code:**
```
Use the `console.log()` function
```
Result: Use the `console.log()` function

**Code block:**
````
```
function hello() {
  console.log("Hello!");
}
```
````
Result:
```
function hello() {
  console.log("Hello!");
}
```

### Create Quotes
```
> This is a quote
> It can span multiple lines
```
Result:
> This is a quote
> It can span multiple lines

### Create Tables
```
| Name    | Role   |
|---------|--------|
| Alice   | Admin  |
| Bob     | Client |
```
Result:

| Name    | Role   |
|---------|--------|
| Alice   | Admin  |
| Bob     | Client |

### Add Horizontal Lines
```
---
```
Result:
---

## 🎯 Where Can I Use Markdown?

You can use markdown in:
- ✅ Ticket descriptions
- ✅ Comments
- ✅ Internal notes

## 💡 Tips & Tricks

### Combine Formatting
```
**Bold and *italic* together**
```
Result: **Bold and *italic* together**

### Nested Lists
```
- Main item
  - Sub item
  - Another sub item
- Another main item
```
Result:
- Main item
  - Sub item
  - Another sub item
- Another main item

### Multiple Paragraphs
Just leave a blank line between paragraphs:
```
First paragraph.

Second paragraph.
```

### Strikethrough
```
~~This text is crossed out~~
```
Result: ~~This text is crossed out~~

## 🖊️ Editing Comments with Markdown

### Step 1: Click the Edit Button
Click the pencil icon (✏️) next to any comment.

### Step 2: Edit in the Modal
A large editor window opens with two tabs:
- **✏️ Write** - Edit your comment
- **👁️ Preview** - See how it will look

### Step 3: Use the Quick Reference
At the bottom of the editor, you'll see a quick reference:
```
**bold** → bold
*italic* → italic
# Heading → Heading
- List → • List
[Link](url) → Link
`code` → code
```

### Step 4: Preview Your Changes
Click the "👁️ Preview" tab to see how your markdown will render.

### Step 5: Save
Click "Save Changes" to update the comment.

## 📋 Common Use Cases

### Bug Reports
```
## Bug Description
The login button doesn't work on mobile devices.

## Steps to Reproduce
1. Open the app on mobile
2. Navigate to login page
3. Click the login button
4. Nothing happens

## Expected Behavior
User should be logged in.

## Actual Behavior
Button click has no effect.
```

### Feature Requests
```
# Feature Request: Dark Mode

## Overview
Add a dark mode option to reduce eye strain.

## Benefits
- Easier on the eyes at night
- Saves battery on OLED screens
- Modern look and feel

## Proposed Implementation
- Toggle in settings
- Automatic based on system preference
- Remember user choice
```

### Status Updates
```
## Update - May 7, 2026

**Progress:**
- ✅ Database migration completed
- ✅ API endpoints tested
- 🔄 Frontend integration in progress
- ⏳ Documentation pending

**Next Steps:**
1. Complete frontend
2. Write tests
3. Deploy to staging
```

### Technical Documentation
```
## API Endpoint

**URL:** `/api/tickets/:id`
**Method:** `GET`

**Response:**
```json
{
  "id": "123",
  "title": "Bug report",
  "status": "OPEN"
}
```

**Error Codes:**
- `404` - Ticket not found
- `403` - Unauthorized
```

## 🚫 What Markdown Can't Do

Markdown is for formatting text, not:
- ❌ Changing colors
- ❌ Changing fonts
- ❌ Embedding videos
- ❌ Complex layouts

For these, you'll need other tools.

## 🆘 Need Help?

### Quick Reference in Editor
When editing a comment, look at the bottom of the modal for a quick reference guide.

### Preview Before Saving
Always use the "👁️ Preview" tab to check your formatting before saving.

### Common Mistakes

**Mistake 1: Forgetting spaces**
```
#Heading (wrong)
# Heading (correct)
```

**Mistake 2: Not leaving blank lines**
```
First paragraph.
Second paragraph. (wrong - will be on same line)

First paragraph.

Second paragraph. (correct)
```

**Mistake 3: Wrong link syntax**
```
(Link)[https://example.com] (wrong)
[Link](https://example.com) (correct)
```

## 📚 Learn More

Want to learn more about markdown?
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)

## 🎉 Practice Makes Perfect!

The best way to learn markdown is to use it! Try it out in your next ticket or comment.

---

**Happy Formatting! ✨**

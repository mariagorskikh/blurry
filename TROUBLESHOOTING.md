# 🔧 Troubleshooting Guide

## Current Issue: Extension Shows "Unknown" Status on LinkedIn

Based on your screenshot, the popup shows:
- **Pick Mode: Unknown**
- **Redactions: -**

This indicates the content script isn't communicating with the popup. Let's fix this!

---

## 🚀 Step-by-Step Debugging

### Step 1: Reload the Extension

1. Go to `chrome://extensions/`
2. Find **Live Redactor**
3. Click the **reload icon** (🔄) on the extension card
4. Go back to LinkedIn and **refresh the page** (F5 or Cmd+R)

### Step 2: Check if Content Script Loaded

1. On LinkedIn, press **F12** to open DevTools
2. Go to the **Console** tab
3. Look for logs starting with `[Live Redactor]`
4. You should see:
   ```
   [Live Redactor] Initializing Live Redactor on www.linkedin.com
   [Live Redactor] Styles injected
   [Live Redactor] Loaded rules for www.linkedin.com : []
   [Live Redactor] Toolbar created
   [Live Redactor] Live Redactor initialized
   ```

**If you DON'T see these logs:**
- Content script didn't load
- Try Step 3 below

**If you DO see these logs:**
- Content script is working!
- Skip to Step 4

### Step 3: Manually Inject Content Script (If Needed)

If content script didn't load automatically:

1. Open DevTools Console (F12) on LinkedIn
2. Paste this code and press Enter:

```javascript
// Check if extension is already loaded
if (document.getElementById('lr-toolbar')) {
  console.log('Extension already loaded!');
} else {
  console.log('Extension not found. Check chrome://extensions/');
}
```

3. If extension isn't loaded, go to `chrome://extensions/`
4. Make sure **Live Redactor** is:
   - ✅ **Enabled** (toggle on)
   - ✅ Has **"On all sites"** permission
5. Refresh LinkedIn page

### Step 4: Look for the Toolbar on the PAGE

**IMPORTANT:** The floating toolbar appears on the **webpage itself**, NOT in the popup!

1. Close the popup (click outside it)
2. Look at the **top-right corner** of the LinkedIn page
3. You should see a white floating toolbar with buttons:
   - 🟠 **Pick: Off**
   - **Undo**
   - **Clear**
   - **Export**
   - **×**

**Can't see the toolbar?**
- Scroll to the top of the page
- Check if it's hidden behind LinkedIn's header
- Try zooming out (Cmd/Ctrl + minus)
- Check Console for errors

### Step 5: Test on Simple Page First

LinkedIn is complex. Let's test on a simpler page:

1. Open the test page: `file:///Users/mariagorskikh/demo_redactor/test.html`
   - Copy that path and paste it into Chrome's address bar
   - OR: Open Finder, navigate to the folder, drag `test.html` into Chrome

2. You should immediately see:
   - Floating toolbar in top-right
   - Test page with sample profiles

3. Try the extension:
   - Click "Pick: Off" → should turn green "Pick: On"
   - Hover over "John Doe" → orange outline appears
   - Click "John Doe" → text blurs immediately

**If it works on test.html but NOT on LinkedIn:**
- LinkedIn might be blocking it (CSP issues)
- Extension is working, just needs adjustment for LinkedIn

**If it DOESN'T work on test.html either:**
- There's an issue with the extension itself
- Continue to Step 6

### Step 6: Check Extension Permissions

1. Go to `chrome://extensions/`
2. Click **Details** on Live Redactor
3. Scroll to **"Site access"**
4. Make sure it says: **"On all sites"**
5. If not, click **"On all sites"** radio button

### Step 7: Check for Console Errors

1. Open DevTools Console (F12) on LinkedIn
2. Look for RED error messages
3. Common errors and fixes:

**Error: "Cannot read properties of null"**
- Content script loaded before DOM was ready
- Refresh the page

**Error: "Extension context invalidated"**
- Extension was reloaded while page was open
- Refresh the page

**Error: "Could not establish connection"**
- Content script isn't running
- Reload extension, then refresh page

**No errors, no logs:**
- Content script didn't load at all
- Check manifest.json permissions

---

## 🧪 Quick Test Commands

Open Console on LinkedIn (F12) and try these:

### Check if content script loaded:
```javascript
document.getElementById('lr-toolbar') ? 'Extension loaded!' : 'Not loaded'
```

### Check if styles injected:
```javascript
document.getElementById('lr-styles') ? 'Styles loaded!' : 'No styles'
```

### Manually trigger toolbar creation:
```javascript
// Only works if content.js loaded but toolbar didn't appear
if (window.createToolbar) {
  window.createToolbar();
} else {
  console.log('Content script not loaded');
}
```

---

## 🔍 Common Issues on LinkedIn Specifically

### Issue 1: LinkedIn's CSP (Content Security Policy)
**Symptom:** Extension works on other sites but not LinkedIn

**Solution:** LinkedIn has strict CSP. Our extension should work, but verify:
1. Check Console for CSP errors
2. Our extension only injects inline styles, which should be allowed

### Issue 2: LinkedIn's React SPA Behavior
**Symptom:** Toolbar appears briefly then disappears

**Solution:** LinkedIn's SPA might be removing our toolbar

**Fix:** Make toolbar more resilient:
- Our toolbar has very high z-index (2147483647)
- Should re-attach on navigation

### Issue 3: LinkedIn Lazy Loading
**Symptom:** Blurs don't persist on scrolling

**Solution:** This is expected!
- Extension will re-apply blurs within 300ms
- Check Console for "DOM mutation detected" logs

---

## ✅ Expected Behavior Checklist

After following steps above, you should have:

- [ ] Extension shows up in `chrome://extensions/` as **Enabled**
- [ ] Console shows initialization logs on page load
- [ ] Floating toolbar visible on page (top-right)
- [ ] Pick mode toggles on/off (green when on)
- [ ] Orange outline follows cursor in pick mode
- [ ] Click blurs element immediately
- [ ] ESC exits pick mode
- [ ] Refresh page → blurs persist

---

## 🆘 Still Not Working?

### Share Debug Info:

Open Console (F12) and run:
```javascript
console.log('=== LIVE REDACTOR DEBUG ===');
console.log('Toolbar exists:', !!document.getElementById('lr-toolbar'));
console.log('Styles exist:', !!document.getElementById('lr-styles'));
console.log('Location:', window.location.hostname);
console.log('Extensions:', chrome.runtime ? 'API Available' : 'Not available');
```

Copy the output and report the issue.

---

## 🎯 Next Steps

1. **Try the test page first** (`test.html`) - if it works there, extension is fine
2. **Enable DEBUG mode** (already done!) - check Console for detailed logs
3. **Test on simple sites** (news.ycombinator.com, example.com) before LinkedIn
4. **Check permissions** - make sure extension can access all sites

Let me know what you see in the Console! 🚀


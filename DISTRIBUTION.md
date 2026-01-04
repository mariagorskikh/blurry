# 📦 Distribution Guide

## How to Share This Extension

Chrome extensions **cannot be deployed to hosting platforms** like Railway, Vercel, or Netlify. They run entirely in users' browsers. Here's how to distribute:

---

## ✅ Option 1: Chrome Web Store (Recommended for Public Release)

**Best for:** Wide distribution, automatic updates, user trust

**Steps:**
1. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/register)
2. Pay **$5 one-time developer fee**
3. Click "New Item"
4. Upload `live-redactor-v1.0.zip`
5. Fill in store listing:
   - Name: Live Redactor
   - Description: Interactive element blur tool with liquid glass UI
   - Category: Productivity
   - Screenshots: Take screenshots of the extension in action
6. Submit for review (usually 1-3 days)
7. Once approved, users install from: `https://chrome.google.com/webstore/detail/your-extension-id`

**Pros:**
- ✅ Official distribution
- ✅ Automatic updates
- ✅ User trust (verified by Google)
- ✅ Discoverable in Chrome Web Store

**Cons:**
- ❌ $5 one-time fee
- ❌ Review process (1-3 days)
- ❌ Must follow store policies

---

## ✅ Option 2: GitHub Releases (Best for Testing & Open Source)

**Best for:** Beta testing, open source projects, free distribution

**Steps:**
1. Go to https://github.com/mariagorskikh/blurry/releases/new
2. Create new release:
   - Tag: `v1.0.0`
   - Title: `Live Redactor v1.0.0`
   - Description: Release notes
   - Attach: `live-redactor-v1.0.zip`
3. Publish release
4. Users download zip and install:
   ```bash
   1. Download zip from GitHub releases
   2. Unzip the file
   3. Open chrome://extensions/
   4. Enable Developer Mode
   5. Click "Load unpacked"
   6. Select unzipped folder
   ```

**Pros:**
- ✅ Free
- ✅ Immediate distribution
- ✅ No review process
- ✅ Good for open source

**Cons:**
- ❌ Manual installation (not one-click)
- ❌ No automatic updates
- ❌ Developer mode warning in Chrome

---

## ✅ Option 3: Direct Sharing (For Teams/Testing)

**Best for:** Internal tools, company use, specific teams

**Share the zip file via:**
- Email
- Slack/Teams
- Google Drive / Dropbox
- Internal file server

**Installation:**
```bash
1. Send them live-redactor-v1.0.zip
2. They unzip it
3. Load unpacked in Chrome (Developer Mode)
```

**Pros:**
- ✅ Quick sharing
- ✅ Full control

**Cons:**
- ❌ Manual distribution
- ❌ No auto-updates
- ❌ Requires Developer Mode

---

## ❌ What DOESN'T Work

### Railway / Vercel / Netlify
These are for **server applications**. Chrome extensions run in browsers, not servers.

### npm / pip / brew
These are for **command-line tools** and **libraries**. Chrome extensions have their own distribution channels.

### Docker / Kubernetes
These are for **containerized applications**. Chrome extensions are client-side code.

---

## 🔄 Updates

### Chrome Web Store
- Upload new version with incremented version number in `manifest.json`
- Users get automatic updates

### GitHub Releases
- Create new release with new version
- Users must manually download and reinstall

### Direct Sharing
- Send new zip file
- Users must manually replace

---

## 📊 Analytics (Optional)

If you publish to Chrome Web Store, you get:
- Install count
- Active users
- User reviews
- Crash reports

For GitHub releases:
- Download count
- Stars
- Issues/feedback

---

## 🔐 Security

**Never publish:**
- API keys or tokens
- Passwords or credentials
- Private user data
- Unobfuscated sensitive code

**Current status:** ✅ This extension is clean and safe to publish

---

## 📝 Versioning

Follow semantic versioning:
- `1.0.0` - Initial release
- `1.0.1` - Bug fixes
- `1.1.0` - New features
- `2.0.0` - Breaking changes

Update version in:
1. `manifest.json` → `"version": "1.0.0"`
2. Git tag → `v1.0.0`
3. Release title

---

## 🚀 Recommended Approach

**For public release:**
1. Test with GitHub releases first
2. Get feedback from beta users
3. Fix bugs and iterate
4. Submit to Chrome Web Store once stable

**For private/internal use:**
- Use GitHub releases or direct sharing
- Skip Chrome Web Store unless needed

---

## 📞 Questions?

- Chrome Web Store: https://developer.chrome.com/docs/webstore/
- GitHub Releases: https://docs.github.com/en/repositories/releasing-projects-on-github/
- Extension docs: https://developer.chrome.com/docs/extensions/


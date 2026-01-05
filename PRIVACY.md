# Privacy Policy for Live Redactor

**Last Updated:** January 4, 2026

## Overview

Live Redactor is a Chrome extension that allows users to interactively blur elements on web pages for privacy and presentation purposes.

## Data Collection

**We do not collect, store, or transmit any personal data.**

Specifically:
- ❌ No personal information
- ❌ No browsing history
- ❌ No analytics or tracking
- ❌ No cookies
- ❌ No third-party services
- ❌ No remote servers
- ❌ No internet connection required

## Local Storage

The extension stores blur rules **locally on your device only** using Chrome's `chrome.storage.local` API. This data includes:

- Website hostnames (e.g., "linkedin.com")
- CSS selectors for elements you chose to blur
- Unique rule IDs

**This data:**
- ✅ Never leaves your device
- ✅ Is not transmitted to any server
- ✅ Is not accessible to the extension developer
- ✅ Can be cleared at any time by uninstalling the extension
- ✅ Remains private to your browser

## Permissions Explained

The extension requests the following permissions:

### `storage`
**Why:** To save your blur rules locally so they persist across browser sessions.
**Data:** Only CSS selectors and hostnames, stored locally.

### `activeTab`
**Why:** To access the current webpage and apply blur effects to elements you select.
**Data:** No data is collected or transmitted.

### `scripting`
**Why:** To inject the element picker interface into web pages.
**Data:** No data is collected or transmitted.

### `host_permissions` (<all_urls>)
**Why:** To work on any website you visit, since you may need privacy features anywhere.
**Data:** No data is collected or transmitted.

## Third Parties

We do not share, sell, or transfer any data to third parties because **we do not collect any data**.

## Changes to This Policy

If we ever change our data practices, we will update this policy and notify users through the Chrome Web Store.

## Contact

- **GitHub:** https://github.com/mariagorskikh/blurry
- **Issues:** https://github.com/mariagorskikh/blurry/issues

## Your Rights

You have complete control over your data:
- All data is stored locally on your device
- You can clear all blur rules using the "Clear All" button
- You can uninstall the extension at any time to remove all data

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)

---

**Summary:** Live Redactor is a privacy-first extension. We don't collect, store, or transmit any user data. Everything stays on your device.


# 🎯 Live Redactor

A minimal Manifest V3 Chrome extension that lets you interactively pick DOM elements on any webpage and blur them in real-time with DevTools-inspect style interaction. Perfect for privacy, presentations, and screenshots.

## ✨ Features

- **Interactive Element Picker**: Click to select any element on the page (DevTools-inspect style)
- **Real-time Blur**: Instantly blur selected elements with visual feedback
- **Persistent Storage**: Redactions are saved per-domain and auto-applied on page reload
- **SPA Support**: Works seamlessly with dynamic sites like LinkedIn, Twitter/X, and other Single Page Applications
- **Smart Selector Generation**: Creates stable CSS selectors that survive page updates
- **Container Detection**: Automatically finds the right parent container for small elements (text, icons)
- **Floating Toolbar**: Clean, minimal UI that stays out of your way
- **Keyboard Shortcuts**: ESC to exit, Alt+Click to remove blur
- **Export/Import**: Copy selector rules as JSON for backup or sharing

## 🚀 Installation

### Method 1: Load Unpacked (Development)

1. **Download or clone** this repository to your local machine
2. Open **Chrome** and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `demo_redactor` folder
6. The Live Redactor icon should appear in your extensions toolbar

### Method 2: Pack Extension

1. In `chrome://extensions/`, click **"Pack extension"**
2. Select the `demo_redactor` folder as the extension root
3. Click **"Pack Extension"** to generate a `.crx` file
4. Drag and drop the `.crx` file into Chrome to install

## 📖 Usage Guide

### Quick Start

1. **Navigate** to any webpage (e.g., LinkedIn, Twitter, news site)
2. **Click** the Live Redactor extension icon OR look for the floating toolbar (top-right)
3. **Click** the "Pick: Off" button to enter **Pick Mode**
4. **Hover** over elements to preview the selection (orange outline)
5. **Click** any element to blur it immediately
6. **Repeat** for additional elements
7. **Press ESC** or click "Pick: On" to exit Pick Mode

### Floating Toolbar

The toolbar appears on every page (top-right corner) with these controls:

| Button | Action |
|--------|--------|
| **Pick: Off/On** | Toggle element picker mode |
| **Undo** | Remove the last redaction |
| **Clear** | Remove all redactions for this site |
| **Export** | Copy selector rules to clipboard as JSON |
| **×** | Hide toolbar (reload page to show again) |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **ESC** | Exit pick mode |
| **Alt + Click** (or **Option + Click** on Mac) | Remove blur from clicked element |

### Advanced Features

#### Remove Specific Redaction
- Enter **Pick Mode**
- Hold **Alt/Option** and click on a blurred element
- The blur will be removed and the rule deleted

#### Export Rules
- Click **Export** in the toolbar
- Rules are copied to clipboard as JSON
- Share with teammates or save as backup

Example export:
```json
[
  {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "selector": "div.profile-photo > img",
    "createdAt": 1704384000000
  }
]
```

#### Persistence
- Redactions are **automatically saved** per hostname
- Reload the page → blurs are **reapplied automatically**
- Works across browser restarts
- Clear rules per-site or manually edit via `chrome://extensions` → Live Redactor → Storage

## 🎨 Customization

### Change Blur Intensity

Edit `content.js` and modify the `.lr-redact-blur` class:

```css
.lr-redact-blur {
  filter: blur(20px) !important;  /* Change from 10px to 20px */
  background: rgba(0, 0, 0, 0.1) !important;
}
```

### Change Highlight Color

Edit the `.lr-redact-highlight` class:

```css
.lr-redact-highlight {
  outline: 2px solid #00c853 !important;  /* Change to green */
}
```

### Move Toolbar Position

Edit `#lr-toolbar` positioning:

```css
#lr-toolbar {
  top: 10px !important;
  left: 10px !important;  /* Move to top-left */
}
```

## 🛠️ Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **No Frameworks**: Pure vanilla JavaScript (no React, Vue, etc.)
- **Content Script**: Runs on every page, handles all interactions
- **Service Worker**: Background script for extension lifecycle
- **Popup**: Optional UI for controlling the extension

### Selector Generation

The extension uses a sophisticated selector generator that prioritizes:

1. **Stable IDs**: Uses `#id` if available and not randomly generated
2. **Stable Classes**: Filters out hash-like classes (e.g., `css-a1b2c3d4`)
3. **Structural Context**: Includes parent selectors for specificity
4. **nth-of-type**: Adds position when needed to ensure uniqueness
5. **Container Heuristics**: Climbs DOM tree for small elements (spans, icons)

### SPA Support

Works seamlessly on dynamic sites via:

- **MutationObserver**: Watches DOM changes and reapplies blurs
- **Throttled Re-application**: On scroll/resize (300-500ms throttle)
- **Event Capture**: Intercepts clicks before site handlers
- **Persistent Storage**: Rules keyed by hostname

### Storage Schema

```javascript
{
  "rulesByHost": {
    "www.linkedin.com": [
      {
        "id": "uuid-here",
        "selector": "div.profile-card img.avatar",
        "createdAt": 1704384000000
      }
    ],
    "twitter.com": [...]
  }
}
```

## 🐛 Troubleshooting

### Toolbar Not Appearing
- **Refresh the page** after installing the extension
- Check if the extension is **enabled** in `chrome://extensions/`
- Some sites may have **CSP restrictions** (rare)

### Blur Not Persisting
- Check **Chrome DevTools Console** for errors
- Verify **storage permissions** are granted
- Clear extension storage and try again: `chrome://extensions` → Details → "Remove extension data"

### Pick Mode Not Working
- Make sure you're on a **web page** (not chrome:// or extension pages)
- Check if another extension is **intercepting events**
- Try **reloading the page**

### Elements Re-appear After Scroll
- This is normal for **infinite scroll** sites
- The extension will **reapply blurs** within 300-500ms
- Some lazy-loaded elements may briefly show before being blurred

## 🔒 Privacy

- **No data leaves your browser**: All storage is local
- **No tracking**: No analytics or telemetry
- **No external requests**: Extension runs entirely offline
- **No permissions abuse**: Only requests necessary permissions

## 🤝 Contributing

Contributions welcome! To modify:

1. Edit source files in the extension folder
2. Reload extension in `chrome://extensions/`
3. Test on various sites (LinkedIn, Twitter, Gmail, etc.)
4. Submit pull request

## 📋 Permissions Explained

| Permission | Why Needed |
|------------|-----------|
| `storage` | Save redaction rules locally |
| `activeTab` | Access current tab when extension icon clicked |
| `scripting` | Inject content script on demand |
| `<all_urls>` | Run on any website |

## 🎯 Use Cases

- **Privacy**: Blur sensitive info during screen shares
- **Presentations**: Hide personal details in demos
- **Screenshots**: Redact private data in bug reports
- **Focus**: Remove distracting UI elements
- **Testing**: Simulate missing/hidden content

## 📝 License

MIT License - Feel free to use, modify, and distribute.

## 🚧 Known Limitations

- **iframes**: Does not blur content inside cross-origin iframes
- **Shadow DOM**: Limited support for web components with closed shadow roots
- **Canvas/Video**: Cannot blur `<canvas>` or `<video>` element contents (only the container)
- **Performance**: Very large sites (>10,000 rules) may experience slowdown

## 🔮 Future Enhancements

- [ ] Pixelation mode (alternative to blur)
- [ ] Custom blur intensity per element
- [ ] Rule import from JSON
- [ ] Sync rules across devices (Chrome Sync)
- [ ] Wildcard hostname matching
- [ ] Context menu "Redact this element"
- [ ] Visual selector editor
- [ ] Keyboard shortcut customization

## 📞 Support

Found a bug? Have a feature request?

- Open an issue on GitHub
- Check existing issues first
- Provide browser version, site URL, and steps to reproduce

---

**Built with ❤️ for privacy and productivity**

Version 1.0.0 | Manifest V3 | Plain JavaScript | No Dependencies


# Cache Busting Guide

## Quick Start

To deploy a new version, edit **ONE LINE**:

**`resources/js/version.js` line 2:**
```javascript
const VERSION = '0.3.3';  // <-- Change this
```

Commit and push. Done!

---

## How It Works

1. Service worker imports `version.js` and creates cache: `from-nothing-v0.3.3`
2. When you bump the version, service worker detects change
3. Old cache is deleted, new cache is created
4. Users get fresh files automatically
5. Version displays in bottom-left corner: `FromNothing-v0.3.3`

## Features

- ✅ Single source of truth (one line to update)
- ✅ Works with ES6 modules
- ✅ Automatic cache cleanup
- ✅ Offline support
- ✅ Network-first strategy (always fresh)

## Testing

```bash
# Start local server (service workers require HTTP/HTTPS)
python -m http.server 8000

# Visit http://localhost:8000
# Check: DevTools > Application > Service Workers
```

## Files Involved

- `resources/js/version.js` - Version constant (UPDATE THIS)
- `service-worker.js` - Imports version, manages cache
- `index.html` - Registers service worker, displays version

# 🔍 Chrome Extension Crash Diagnostics

## How to Find the Crash Cause

### Method 1: Check Chrome Extensions Error Log (MOST USEFUL)

1. **Go to Chrome Extensions page:**
   ```
   chrome://extensions/
   ```

2. **Find the extension** and look for:
   - Red "Errors" button (if present, click it!)
   - Error messages in red text below the extension

3. **Check the extension details:**
   - Click "Details" on your extension
   - Scroll down to see any error messages

### Method 2: Inspect the Background Service Worker

1. **Go to:**
   ```
   chrome://extensions/
   ```

2. **Find your extension** and click "Details"

3. **Look for "Inspect views":**
   ```
   Inspect views: service worker
   ```
   Click "service worker" link

4. **Console will open** - Look for:
   - Red error messages
   - Failed fetch requests
   - Permission errors
   - Any exceptions

### Method 3: Inspect the Popup Console

**While popup is OPEN:**

1. **Right-click the extension icon** in toolbar
2. **Select "Inspect popup"** or "Inspect"
3. **Developer console opens** - Look for:
   - Red errors
   - Failed requests
   - Console.log messages
   - Network failures

### Method 4: Check Chrome's Internal Logs

**On Linux:**
```bash
# Terminal command to see Chrome logs in real-time
google-chrome --enable-logging --v=1 2>&1 | tee chrome-debug.log

# Or check system logs
journalctl --user -f | grep -i chrome

# Or check crash logs
ls -lah ~/.config/google-chrome/Crash\ Reports/
```

### Method 5: Chrome's Built-in Crash Reports

1. **Go to:**
   ```
   chrome://crashes/
   ```

2. **Look for recent crashes** related to extensions

### Method 6: Network Tab (Check API Calls)

1. **Open popup**
2. **Right-click → Inspect**
3. **Go to Network tab**
4. **Click "Fetch & Download Data"**
5. **Watch for:**
   - Failed requests (red)
   - CORS errors
   - 401/403 errors
   - Timeout errors

---

## Let's Run Diagnostics Together

### Step 1: Run Chrome with Logging

Open a terminal and run:
```bash
# Close all Chrome windows first
killall chrome google-chrome chromium 2>/dev/null

# Start Chrome with verbose logging
google-chrome --enable-logging --v=1 2>&1 | tee /tmp/chrome-debug.log &

# Or if using chromium
chromium --enable-logging --v=1 2>&1 | tee /tmp/chrome-debug.log &
```

### Step 2: Load Extension and Try to Trigger Crash

1. Go to `chrome://extensions/`
2. Load the extension
3. Try to use it
4. When it crashes, check the log:
   ```bash
   cat /tmp/chrome-debug.log | tail -100
   ```

### Step 3: Check for Specific Error Patterns

```bash
# Search for extension-related errors
cat /tmp/chrome-debug.log | grep -i "extension\|crash\|error"

# Search for our extension specifically
cat /tmp/chrome-debug.log | grep -i "amazon\|logistics"
```

---

## Common Crash Patterns

### Pattern 1: Service Worker Registration Failed
**Error:** `Service worker registration failed`
**Cause:** background.js has syntax error or missing
**Fix:** Check background.js syntax

### Pattern 2: CSP (Content Security Policy) Violation
**Error:** `Refused to load...CSP`
**Cause:** Trying to load external resources
**Fix:** Review manifest permissions

### Pattern 3: Fetch/Network Error
**Error:** `Failed to fetch` or `net::ERR_`
**Cause:** Network request blocked or failed
**Fix:** Check host_permissions and authentication

### Pattern 4: Chrome API Permission Error
**Error:** `Cannot read property...of undefined`
**Cause:** Missing permission for chrome API
**Fix:** Add required permission to manifest

### Pattern 5: Memory/Resource Crash
**Error:** `Out of memory` or no specific error
**Cause:** Infinite loop or memory leak
**Fix:** Check for loops in background.js

---

## Debug Version of Extension

I'll create a version with extensive logging that will help us see exactly where it crashes.

### To use debug version:

1. I'll create `background-debug.js` and `popup-debug.js`
2. Temporarily use these files
3. Check console for detailed logs
4. Find the exact crash point

---

## What Information to Collect

When reporting the crash, please provide:

1. **Error message** (if any) from:
   - chrome://extensions/ errors button
   - Popup console (right-click → inspect)
   - Background worker console (inspect views)

2. **When it crashes:**
   - On extension load?
   - When opening popup?
   - When clicking a button?
   - When fetching data?

3. **Chrome version:**
   ```
   chrome://version/
   ```

4. **Console output** before crash

5. **Network tab** - any failed requests?

---

## Immediate Actions

### Action 1: Check Background Worker Now

```bash
# Open Chrome, then:
1. chrome://extensions/
2. Find extension
3. Click "Details"
4. Under "Inspect views" click "service worker"
5. Take screenshot of console
```

### Action 2: Get Chrome Crash Dumps

```bash
# Check for crash files
ls -lah ~/.config/google-chrome/Crash\ Reports/

# If files exist, check the most recent one
ls -lt ~/.config/google-chrome/Crash\ Reports/ | head -5
```

### Action 3: Try Safe Mode

```bash
# Start Chrome in safe mode (no extensions)
google-chrome --disable-extensions

# Then manually load ONLY our extension
# Go to chrome://extensions/
# Load unpacked
```

---

## Let me know what you find!

Run these diagnostics and send me:
1. Any error messages from chrome://extensions/
2. Console output from background worker
3. Chrome version from chrome://version/
4. The exact moment it crashes

I'll create a debug version to help pinpoint the issue!

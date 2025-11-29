# 🔍 HOW TO FIND THE CRASH CAUSE - Quick Guide

## The Fastest Way to See What's Happening

### Step 1: Enable Debug Mode

```bash
cd /home/jjroman/repos/journeys-parser/chrome-extension
./debug-mode.sh
# Choose option 1 (Enable DEBUG mode)
```

### Step 2: Reload Extension in Chrome

1. Go to `chrome://extensions/`
2. Find "Amazon Logistics Data Extractor"
3. Click the **Reload** button (🔄)

### Step 3: Open TWO Console Windows

**Console #1: Background Worker**
1. Stay on `chrome://extensions/`
2. Click "Details" on your extension
3. Look for "Inspect views: **service worker**"
4. Click "service worker" - Developer console opens
5. Keep this window visible

**Console #2: Popup**
1. Click your extension icon (popup opens)
2. Right-click anywhere in the popup
3. Select "Inspect" or "Inspect popup"
4. Developer console opens
5. Keep this window visible

### Step 4: Trigger the Crash

1. In the popup, click "Fetch & Download Data"
2. **WATCH BOTH CONSOLES**
3. Look for the LAST log message before crash

### Step 5: Find the Crash Point

Look for:
- ❌ Red error messages
- 🔴 Last `[BACKGROUND]` or `[POPUP]` log before crash
- ⚠️ Yellow warnings
- 🔥 Stack traces

---

## What to Look For

### In Background Console:

Good sequence:
```
[BACKGROUND] Service worker initializing...
[BACKGROUND] Message received: {action: "fetchData", ...}
[BACKGROUND] Fetch response received:
[BACKGROUND]   - Status: 200
[BACKGROUND] Successfully parsed JSON response
```

Bad sequence (crash):
```
[BACKGROUND] Service worker initializing...
[BACKGROUND] Message received: {action: "fetchData", ...}
[BACKGROUND] Starting fetch request...
❌ (nothing more - CRASH HERE!)
```

### In Popup Console:

Good sequence:
```
[POPUP] Fetch button clicked - fetching both
[POPUP] Sending message to background worker...
[POPUP] Response received from background: {success: true, ...}
[POPUP] Downloading summary as: summary-...json
```

Bad sequence (crash):
```
[POPUP] Fetch button clicked - fetching both
[POPUP] Sending message to background worker...
❌ (nothing more - CRASH HERE!)
```

---

## Take Screenshots

When you see the crash:

1. **Screenshot of Background Console** (all logs)
2. **Screenshot of Popup Console** (all logs)
3. **Screenshot of chrome://extensions/** (any error messages)

---

## Quick Commands to Share

### Get Chrome version:
```
google-chrome --version
```

### Check for crash files:
```bash
ls -lah ~/.config/google-chrome/Crash\ Reports/
```

### Save console logs to file:
(Right-click in console → Save as... → save to `/tmp/console-log.txt`)

---

## Common Issues and What You'll See

### Issue 1: Service Worker Won't Start
**Console:** No `[BACKGROUND]` logs at all
**Cause:** Syntax error in background.js
**Look for:** Red error at top of background console

### Issue 2: Permission Denied
**Console:** `Error: ... permission denied`
**Cause:** Missing manifest permission
**Look for:** Network request failing with 403/401

### Issue 3: Fetch Times Out
**Console:** `[BACKGROUND] Starting fetch request...` then nothing
**Cause:** Network issue or blocked request
**Look for:** Long delay then crash

### Issue 4: JSON Parse Error
**Console:** `[BACKGROUND] Failed to parse JSON`
**Cause:** Response is not JSON
**Look for:** Response text in logs

### Issue 5: Chrome API Error
**Console:** `Cannot read property ... of undefined`
**Cause:** Missing permission or API not available
**Look for:** Specific API name in error

---

## After You Find the Error

### Send me:

1. **Last 20 lines** from Background Console before crash
2. **Last 20 lines** from Popup Console before crash
3. **Any red error messages**
4. **Chrome version**
5. **When exactly it crashes** (which button, which step)

### To capture console logs:

**Background Console:**
- Right-click in console
- Select "Save as..."
- Save to `/tmp/background-console.txt`

**Popup Console:**
- Right-click in console
- Select "Save as..."
- Save to `/tmp/popup-console.txt`

Then run:
```bash
cat /tmp/background-console.txt
cat /tmp/popup-console.txt
```

---

## Disable Debug Mode After

When done debugging:
```bash
cd /home/jjroman/repos/journeys-parser/chrome-extension
./debug-mode.sh
# Choose option 2 (Disable DEBUG mode)
```

Then reload extension in Chrome.

---

## Ready to Debug!

Run these commands and tell me what you see:

```bash
# 1. Enable debug mode
cd /home/jjroman/repos/journeys-parser/chrome-extension
./debug-mode.sh  # Choose 1

# 2. Then in Chrome:
#    - chrome://extensions/
#    - Reload extension
#    - Open background console (Inspect views: service worker)
#    - Open popup console (right-click popup → Inspect)
#    - Click "Fetch & Download Data"
#    - Watch BOTH consoles!
```

Share the console output and I'll fix it immediately!

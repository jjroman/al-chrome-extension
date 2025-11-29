# Chrome Crash Troubleshooting

## Issue: Chrome Shuts Down When Loading Extension

### What I Fixed:

1. **Removed content script injection** - This was likely causing the crash
2. **Removed activeTab permission** - Not needed for our use case
3. **Added better error handling** - Prevents crashes from propagating
4. **Added fallback download method** - Works even if chrome.downloads fails

### Changes Made:

#### manifest.json
- ❌ Removed `"activeTab"` permission
- ❌ Removed `content_scripts` section
- ✅ Kept only essential `downloads` permission
- ✅ Bumped version to 1.0.1

#### content.js
- ✅ Made minimal and safe (no DOM manipulation)
- ✅ Wrapped in try-catch to prevent crashes

#### popup.js
- ✅ Added error handling to all functions
- ✅ Added fallback download method
- ✅ Protected chrome API calls

### How to Reload the Extension:

1. Close Chrome completely (if it crashed)
2. Reopen Chrome
3. Go to `chrome://extensions/`
4. Find "Amazon Logistics Data Extractor"
5. Click the refresh/reload button (🔄)
6. Try again

### If Still Crashing:

Try loading the minimal version:

1. Go to `chrome://extensions/`
2. Remove the current extension
3. Load the extension again from the folder
4. Check Chrome console for errors:
   - Right-click on extension → "Inspect popup"
   - Look for red error messages

### Common Causes of Chrome Extension Crashes:

1. ✅ **Content scripts modifying protected pages** - FIXED
2. ✅ **Missing or corrupt icon files** - Icons generated correctly
3. ✅ **Invalid manifest syntax** - Manifest is valid
4. ✅ **Permission conflicts** - Reduced to minimal permissions
5. ❓ **Chrome version compatibility** - Check your Chrome version

### Check Your Chrome Version:

```
chrome://version/
```

Extension requires Chrome 88+ (Manifest V3 support)

### Debug Steps:

1. **Check extension error page:**
   - Go to `chrome://extensions/`
   - Look for red "Errors" button on the extension
   - Click to see detailed errors

2. **Check Chrome logs:**
   ```bash
   # Linux
   journalctl --user -f | grep -i chrome
   
   # Or check Chrome's crash reports:
   ls ~/.config/google-chrome/Crash\ Reports/
   ```

3. **Try incognito mode:**
   - Go to `chrome://extensions/`
   - Enable "Allow in incognito" for the extension
   - Open incognito window
   - Test the extension there

### Alternative: Load Minimal Version

If crashes persist, I can create an even more minimal version with:
- No content scripts at all
- Only popup functionality
- Bare minimum permissions

Let me know if you need this!

### What to Check Now:

1. ✅ Icons are present in `icons/` folder
2. ✅ Manifest is valid JSON
3. ✅ Extension folder structure is correct:
   ```
   chrome-extension/
   ├── manifest.json
   ├── popup.html
   ├── popup.css
   ├── popup.js
   ├── content.js
   └── icons/
       ├── icon16.png
       ├── icon48.png
       └── icon128.png
   ```

### Next Steps:

1. Reload the extension (it's now safer)
2. If it still crashes, check `chrome://extensions/` for error details
3. Send me the error message and I'll fix it immediately

# AGENTS.md - Chrome Extension

## Component Overview

This is the **al-chrome-extension** component - a Chrome extension that extracts Amazon Logistics route information and creates vehicle inspection reviews in the Checkify system. It authenticates with JWT tokens and automatically creates reviews for each vehicle/route assignment.

---

## Setup Commands

```powershell
cd .\al-chrome-extension\
# No build needed - vanilla JavaScript
# Test: Load unpacked at chrome://extensions/
# Package: Compress-Archive -Path manifest.json,config.js,popup-minimal.html,popup-minimal.js,icons/* -DestinationPath ..\extension.zip
```

---

## Code Style Guidelines

### Chrome Extension
- Vanilla JavaScript (no frameworks)
- Use Chrome Storage API for token persistence
- Handle JWT token expiration gracefully
- Validate access tokens (10 characters)
- Check for existing reviews before creation
- Use async/await for API calls
- Provide clear user feedback in popup UI

---

## Testing Instructions

### Extension Testing
1. Load unpacked extension at `chrome://extensions/`
2. Enable Developer mode
3. Navigate to Amazon Logistics route page
4. Click extension icon to open popup
5. Verify login flow works
6. Test review creation
7. Check token persistence across browser sessions

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] Manifest.json is valid
- [ ] Login saves JWT token correctly
- [ ] Token persists in Chrome storage
- [ ] Route data extraction works on Amazon Logistics pages
- [ ] Review creation doesn't duplicate existing reviews
- [ ] Token expiration is detected and handled
- [ ] Error messages display clearly in popup
- [ ] Icons display correctly

---

## Implementation Workflow

### Extension Modifications

1. **Update manifest.json** for new permissions
   - Add host permissions for new API endpoints
   - Update content security policy if needed
   - Increment version number

2. **Modify popup-minimal.js** for new functionality
   - Add new API calls
   - Update DOM extraction logic
   - Handle new error cases
   - Maintain existing features

3. **Update config.js** for API changes
   - Update API_BASE_URL if endpoint changes
   - Add new configuration constants

4. **Test by reloading** at chrome://extensions/
   - Click reload button after code changes
   - Clear storage if testing token logic
   - Test on actual Amazon Logistics pages

### Modifying Existing Files
- Read the full file first to understand context
- Maintain existing coding style and patterns
- Don't remove working features unless explicitly requested
- Test thoroughly after each change
- Verify token persistence still works

---

## Project Structure Reference

### Key Files to Know

**Chrome Extension (al-chrome-extension/)**
- `manifest.json` - Extension configuration and permissions
- `popup-minimal.js` - Main logic (login, route extraction, review creation)
- `popup-minimal.html` - UI popup
- `config.js` - API endpoint configuration
- `icons/` - Extension icons (16x16, 48x48, 128x128)

---

## Domain Concepts (Extension Scope)

### Review Creation from Routes
- **Purpose**: Automatically create vehicle inspection reviews from Amazon Logistics route assignments
- **Trigger**: User clicks extension icon on Amazon Logistics route page
- **Data Extracted**: Vehicle plate, route date, driver information
- **Review Type**: Creates check-in reviews (before route starts)
- **Duplicate Prevention**: Checks if review already exists for vehicle/date combination

### Access Tokens
- **Generation**: Extension receives 10-character access token when creating review
- **Purpose**: Token allows driver to access review in camera app (no authentication)
- **Display**: Token shown to user to share with driver

### JWT Authentication
- **Storage**: JWT token stored in Chrome Storage API
- **Usage**: Included in Authorization header for API calls
- **Expiration**: Extension detects 401 errors and prompts re-login
- **CompanyId**: JWT contains CompanyId claim for multi-tenancy

---

## Common Issues & Solutions

### Chrome Extension Issues
- **Not loading**: Check manifest.json syntax with JSON validator
- **API calls fail**: Verify host_permissions includes API URL in manifest.json
- **Token expired**: Extension auto-detects 401 responses and prompts re-login
- **DOM extraction fails**: Amazon Logistics page structure may have changed, update selectors
- **Storage not persisting**: Verify chrome.storage.local permissions in manifest
- **CORS errors**: API must allow extension origin or use proper CORS headers

---

## Security Considerations

- **Token storage**: JWT tokens stored securely in Chrome Storage (not localStorage)
- **API permissions**: Only request necessary host_permissions in manifest
- **Token validation**: Always validate JWT token before API calls
- **Error messages**: Don't expose sensitive information in user-facing errors
- **HTTPS only**: API calls must use HTTPS endpoints

---

## Deployment

### Chrome Extension Packaging
```powershell
cd .\al-chrome-extension\
# Package for distribution
Compress-Archive -Path manifest.json,config.js,popup-minimal.html,popup-minimal.js,icons/* -DestinationPath ..\extension.zip
# Upload to Chrome Web Store or distribute .zip for manual installation
```

---

## Documentation Locations

- **Extension**: `al-chrome-extension/README.md` - Installation and usage
- **Project root**: `documentation/` - Feature docs

---

## Important Reminders

1. **Test on actual pages**: Always test on real Amazon Logistics pages
2. **Check for duplicates**: Verify review doesn't already exist before creating
3. **Handle errors gracefully**: Show clear messages to users
4. **Token expiration**: Detect and handle 401 responses
5. **Manifest permissions**: Only request necessary permissions
6. **Version numbers**: Increment version in manifest.json for updates
7. **Clear user feedback**: Update popup UI to show operation status
8. **DOM changes**: Amazon Logistics page structure may change, keep selectors updated

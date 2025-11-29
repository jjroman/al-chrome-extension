# Installation Guide

## Step-by-Step Installation

### 1. Create Icon Files (Required)

Before loading the extension, you need icon files. Choose one of these automated options:

#### Option A: Browser-Based Generator (Easiest - No Installation Required) ⭐
1. Open `chrome-extension/icon-generator.html` in your browser
2. Click "Generate & Download Icons"
3. Three files will download: `icon16.png`, `icon48.png`, `icon128.png`
4. Move them to the `chrome-extension/icons/` folder
5. Done! ✓

#### Option B: Python Script (Recommended for Linux/Mac)
```bash
cd chrome-extension
pip install Pillow  # One-time install
python3 generate_icons.py
```
Icons will be automatically created in the `icons/` folder.

#### Option C: Shell Script (ImageMagick)
```bash
cd chrome-extension
sudo apt-get install imagemagick  # If not installed
./generate_icons.sh
```
Icons will be automatically created in the `icons/` folder.

#### Option D: Manual Creation (If scripts fail)
1. Open any image editor (Paint, GIMP, Photoshop, etc.)
2. Create three images with gradient purple/blue background:
   - 16x16 pixels → Save as `icon16.png`
   - 48x48 pixels → Save as `icon48.png`
   - 128x128 pixels → Save as `icon128.png`
3. Add white "AL" text in the center
4. Save them in the `chrome-extension/icons/` folder

#### Option E: Online Generator
1. Go to https://favicon.io/favicon-generator/
2. Type "AL" (for Amazon Logistics)
3. Choose purple/blue colors
4. Download and save to `chrome-extension/icons/`

### 2. Load the Extension in Chrome

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Look for the toggle in the top-right corner
   - Turn it ON (it should be blue)

3. **Load the Extension**
   - Click "Load unpacked" button (top-left)
   - Navigate to your repository folder
   - Select the `chrome-extension` folder
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "Amazon Logistics Data Extractor" in your extensions list
   - The extension should show as "Enabled"

### 3. Pin the Extension (Recommended)

1. Click the puzzle piece icon (🧩) in the Chrome toolbar
2. Find "Amazon Logistics Data Extractor"
3. Click the pin icon (📌) next to it
4. The extension icon will now appear in your toolbar

### 4. Test the Extension

1. Go to https://logistics.amazon.com
2. Log in with your credentials
3. Navigate to any page (like the itineraries page)
4. Click the extension icon in your toolbar
5. Try downloading data

## Updating the Extension

When you make changes to the extension files:

1. Go to `chrome://extensions/`
2. Find "Amazon Logistics Data Extractor"
3. Click the refresh/reload icon (🔄)
4. Your changes will be applied

## Troubleshooting Installation

### "Invalid manifest" Error

**Cause**: Missing or malformed `manifest.json`

**Solution**:
- Verify the `manifest.json` file exists in the chrome-extension folder
- Check for syntax errors (use a JSON validator)
- Make sure the file is properly formatted

### "Could not load icon" Error

**Cause**: Missing icon files

**Solution**:
- Create the icon files as described in Step 1
- Make sure they're in the correct folder: `chrome-extension/icons/`
- Check that filenames match exactly: `icon16.png`, `icon48.png`, `icon128.png`

### Extension Not Appearing

**Solution**:
- Make sure Developer Mode is enabled
- Try reloading the extensions page (F5)
- Check if Chrome is up to date
- Restart Chrome

### Permission Errors

**Cause**: Extension doesn't have necessary permissions

**Solution**:
- The manifest already includes necessary permissions
- If prompted, click "Allow" for permissions
- Check Chrome settings → Privacy and security → Site Settings

## Uninstalling the Extension

1. Go to `chrome://extensions/`
2. Find "Amazon Logistics Data Extractor"
3. Click "Remove"
4. Confirm removal

## Next Steps

After installation, see [README.md](README.md) for usage instructions.

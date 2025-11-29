# Extension Icons

Place your icon images here with the following names and sizes:

- **icon16.png** - 16x16 pixels (toolbar icon)
- **icon48.png** - 48x48 pixels (extensions page)
- **icon128.png** - 128x128 pixels (Chrome Web Store)

## Quick Icon Creation

You can create simple placeholder icons or use a proper design tool.

### Simple SVG Icon (convert to PNG)

Use an online converter like CloudConvert or GIMP to convert this SVG to PNG:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#grad)"/>
  <text x="64" y="80" font-size="64" text-anchor="middle" fill="white">🚚</text>
</svg>
```

### Online Icon Generators

- [Favicon.io](https://favicon.io/) - Generate from text or emoji
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Professional icons
- [Canva](https://www.canva.com/) - Design custom icons

### Or Use Placeholder Colors

For testing, you can create solid color PNG files:
- Any 16x16, 48x48, and 128x128 PNG files will work
- Use a purple/blue gradient to match the theme

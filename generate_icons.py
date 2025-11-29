#!/usr/bin/env python3
"""
Generate placeholder icons for the Chrome extension
Creates simple gradient icons with a truck emoji
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_gradient_icon(size, filename):
    """Create a gradient icon with a truck emoji"""
    # Create image with gradient background
    image = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(image)
    
    # Create gradient from purple to blue
    for y in range(size):
        # Color interpolation from #667eea to #764ba2
        r1, g1, b1 = 0x66, 0x7e, 0xea  # Start color
        r2, g2, b2 = 0x76, 0x4b, 0xa2  # End color
        
        ratio = y / size
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        
        draw.rectangle([(0, y), (size, y + 1)], fill=(r, g, b))
    
    # Try to add text (emoji or letters)
    try:
        # Try to use a system font for emoji
        font_size = int(size * 0.5)
        try:
            # Try emoji font first
            font = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", font_size)
            text = "🚚"
        except:
            # Fallback to regular font with text
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
            except:
                font = ImageFont.load_default()
            text = "AL"
        
        # Get text bounding box to center it
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        position = ((size - text_width) // 2, (size - text_height) // 2)
        draw.text(position, text, fill='white', font=font)
        
    except Exception as e:
        print(f"Note: Could not add text/emoji to icon: {e}")
        # Icon will still work, just without the text
    
    # Round corners (optional, makes it look nicer)
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = int(size * 0.15)
    mask_draw.rounded_rectangle([(0, 0), (size, size)], corner_radius, fill=255)
    
    # Apply rounded corners
    rounded_image = Image.new('RGB', (size, size))
    rounded_image.paste(image, (0, 0))
    
    # Save the icon
    rounded_image.save(filename, 'PNG')
    print(f"✓ Created {filename} ({size}x{size})")

def main():
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    
    # Create icons directory if it doesn't exist
    os.makedirs(icons_dir, exist_ok=True)
    
    # Generate all three required icon sizes
    sizes = {
        'icon16.png': 16,
        'icon48.png': 48,
        'icon128.png': 128
    }
    
    print("Generating extension icons...")
    for filename, size in sizes.items():
        filepath = os.path.join(icons_dir, filename)
        create_gradient_icon(size, filepath)
    
    print("\n✓ All icons generated successfully!")
    print(f"Icons saved to: {icons_dir}")

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print("Error: Pillow (PIL) library not found.")
        print("Install it with: pip install Pillow")
        print("\nAlternatively, create the icons manually following INSTALLATION.md")
        exit(1)

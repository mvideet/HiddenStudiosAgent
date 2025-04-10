#Create sample images for testing the pipeline for .png files
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

def create_test_image(name="ad1", width=300, height=250, color=(200, 50, 50)):
    """Create a simple test ad image with text"""
    # Create a new image with the given color
    img = Image.new('RGB', (width, height), color)
    draw = ImageDraw.Draw(img)
    
    # Add a white border
    border_width = 5
    draw.rectangle(
        [(border_width, border_width), (width - border_width, height - border_width)],
        outline=(255, 255, 255),
        width=border_width
    )
    
    # Add text
    try:
        # Try to use a system font
        font = ImageFont.truetype("Arial", 36)
    except:
        # Fallback to default
        font = ImageFont.load_default()
    
    # Add the ad name as text
    text = name.upper()
    text_width, text_height = draw.textlength(text, font=font), 36
    text_position = ((width - text_width) // 2, (height - text_height) // 2)
    draw.text(text_position, text, fill=(255, 255, 255), font=font)
    
    # Add "SAMPLE AD" text at the bottom
    subtext = "SAMPLE AD"
    subtext_width, subtext_height = draw.textlength(subtext, font=font), 20
    subtext_position = ((width - subtext_width) // 2, height - subtext_height - 10)
    draw.text(subtext_position, subtext, fill=(255, 255, 255), font=font)
    
    # Create the directory if it doesn't exist
    os.makedirs('images', exist_ok=True)
    
    # Save the image
    filename = f"images/{name}.png"
    img.save(filename)
    print(f"Created test image: {filename}")
    return filename

if __name__ == "__main__":
    # Create several test images
    create_test_image("ad1", 300, 250, (200, 50, 50))   # Small red
    create_test_image("ad2", 728, 90, (50, 100, 200))   # Medium blue (banner)
    create_test_image("ad3", 970, 250, (50, 150, 50))   # Large green 
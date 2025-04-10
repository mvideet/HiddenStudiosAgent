#Process the image: get the ad parameters
#!/usr/bin/env python
import sys
import json
import os
import traceback

# Make sure we can find the image_preprocessing module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from image_preprocessing import create_ad_from_image
    
    def process_image(image_path, name, game_id=None):
        """Process an image and return ad parameters"""
        try:
            # Verify the image path exists
            if not os.path.exists(image_path):
                return {"error": f"Image not found: {image_path}"}
                
            # Process the image
            ad_params = create_ad_from_image(image_path, name, game_id)
            return ad_params
        except Exception as e:
            traceback.print_exc()
            return {"error": str(e)}
    
    # Main execution - expects args: image_path, name, [game_id]
    if __name__ == "__main__":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Missing required arguments: image_path, name [, game_id]"}))
            sys.exit(1)
            
        image_path = sys.argv[1]
        name = sys.argv[2]
        game_id = sys.argv[3] if len(sys.argv) > 3 else None
        
        result = process_image(image_path, name, game_id)
        print(json.dumps(result))
        
except ImportError as e:
    print(json.dumps({"error": f"ImportError: {str(e)}"}))
    traceback.print_exc()
except Exception as e:
    print(json.dumps({"error": f"Error: {str(e)}"}))
    traceback.print_exc() 
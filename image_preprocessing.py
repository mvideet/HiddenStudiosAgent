import numpy as np
import pandas as pd
from PIL import Image
import cv2
import json
from typing import Dict, Any, Tuple
import pickle
import logging
import uuid
import os
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AdImagePreprocessor:
    def __init__(self):
        """Initialize the image preprocessor with default parameters"""
        self.standard_sizes = {
            'small': {'width': 300, 'height': 250},
            'medium': {'width': 728, 'height': 90},
            'large': {'width': 970, 'height': 250}
        }
        # Extended format support with type mapping
        self.format_types = {
            '.jpg': 'static',
            '.jpeg': 'static',
            '.png': 'static',
            '.webp': 'static',
            '.gif': 'animated',
            '.mp4': 'animated',
            '.webm': 'animated',
            '.cad': '3d',
            #cad file
            '.svg': '3d',
        }
        # Ad space options based on size and type
        self.ad_spaces = {
            'small': ['sidebar', 'in-game-ui', 'loading-screen'],
            'medium': ['banner', 'menu-bar', 'pre-roll'],
            'large': ['full-screen', 'billboard', 'interstitial']
        }
        self.accepted_formats = list(self.format_types.keys())
        
    def _calculate_contrast(self, image: np.ndarray) -> float:

        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        contrast = min(2.0, (gray.std() / 128.0) * 2)
        #return either 'low', 'medium', or 'high'
        if contrast < 0.5:
            return 'low'
        elif contrast < 1.0:
            return 'medium'
        else:
            return 'high'

    def _determine_size(self, width: int, height: int) -> str:
        aspect_ratio = width / height
        if width <= 400 and height <= 300:
            return 'small'
        elif aspect_ratio >= 7:
            return 'medium'
        else:
            return 'large'

    def _determine_ad_type(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        return self.format_types.get(ext, 'static')

    def _determine_ad_space(self, size: str, ad_type: str) -> str:
        """
        Determine the most suitable ad space based on size and type
        
        Args:
            size (str): Size category of the ad
            ad_type (str): Type of the ad
            
        Returns:
            str: Recommended ad space
        """
        # Get available spaces for this size
        available_spaces = self.ad_spaces.get(size, ['sidebar'])
        
        # Return the most suitable space based on ad type
        if ad_type == '3d' and 'billboard' in available_spaces:
            return 'billboard'
        elif ad_type == 'animated' and 'interstitial' in available_spaces:
            return 'interstitial'
        elif ad_type == 'animated' and 'pre-roll' in available_spaces:
            return 'pre-roll'
        
        # Otherwise, return the first available space
        return available_spaces[0]

    def _calculate_impression_multiplier(self, contrast: str, size: str, ad_type: str, product_or_brand: str) -> float:
        """
        Calculate the impression multiplier based on ad characteristics
        
        Args:
            contrast (str): Image contrast value ('low', 'medium', 'high')
            size (str): Ad size category
            ad_type (str): Type of ad
            product_or_brand (str): Whether it's a product or brand ad
            
        Returns:
            float: Impression multiplier value
        """
        # Base multiplier on contrast and size - Fallback calculation
        size_multipliers = {'small': 1.0, 'medium': 1.2, 'large': 1.5}
        type_multipliers = {
            'static': 1.0,
            'animated': 1.3,
            '3d': 1.8
        }
        contrast_multipliers = {
            'low': 0.8,
            'medium': 1.0, 
            'high': 1.2
        }
        product_brand_multipliers = {
            'product': 1.0,
            'brand': 1.1
        }
        
        # Try to use embeddings file
        try:
            with open('embedding_impressions.pkl', 'rb') as f:
                embedding_impressions = pickle.load(f)
                logger.info("Successfully loaded embedding impressions file")
                
                type_embedding = {
                    'static': 1,
                    'animated': 2,
                    '3d': 3
                }
                product_or_brand_embedding = {
                    'product': 1,
                    'brand': 2
                }
                contrast_embedding = {
                    'low': 1,
                    'medium': 2,
                    'high': 3
                }
                
                # Create the embedding tuple
                ad_space_num = 1  # Default value if not provided
                if hasattr(self, 'ad_spaces') and size in self.ad_spaces:
                    ad_spaces = self.ad_spaces[size]
                    ad_space_num = ad_spaces.index(self._determine_ad_space(size, ad_type)) + 1
                
                embedding_of_ad = [
                    contrast_embedding[contrast],
                    product_or_brand_embedding[product_or_brand], 
                    type_embedding[ad_type], 
                    ad_space_num
                ]
                
                # Convert to tuple for direct lookup
                embedding_tuple = tuple(embedding_of_ad)
                # Try direct lookup first
                if embedding_tuple in embedding_impressions:
                    logger.info(f"Found exact match for embedding tuple {embedding_tuple}")
                    # Extract multiplier from the DataFrame
                    df = embedding_impressions[embedding_tuple]
                    logger.info(f"DataFrame columns: {df.columns.tolist()}")
                    logger.info(f"DataFrame shape: {df.shape}")
                    logger.info(f"DataFrame first row: {df.iloc[0].to_dict()}")
                    
                    # Try to access "Overall Accumulative" column
                    if 'Overall Accumulative' in df.columns:
                        multiplier = df['Overall Accumulative'].iloc[0]
                        logger.info(f"Raw multiplier value: {multiplier}")
                        # No need to divide by 100, use the value directly
                        return float(multiplier)
                    else:
                        # Try other column names that might contain the multiplier
                        for col in df.columns:
                            if 'accumulative' in col.lower() or 'overall' in col.lower() or 'impression' in col.lower():
                                logger.info(f"Using column {col} as multiplier")
                                multiplier = df[col].iloc[0]
                                logger.info(f"Raw multiplier value: {multiplier}")
                                return float(multiplier)
                        
                        logger.info(f"Could not find appropriate multiplier column. Using first numeric column")
                        # Use the first numeric column as fallback
                        for col in df.columns:
                            if pd.api.types.is_numeric_dtype(df[col]):
                                logger.info(f"Using numeric column {col} as multiplier")
                                multiplier = df[col].iloc[0]
                                logger.info(f"Raw multiplier value: {multiplier}")
                                return float(multiplier)
                        
                        logger.info(f"Could not find any numeric column. DataFrame: {df}")
                
                # If not found, try cosine similarity
                try:
                    all_embeeddings = list(embedding_impressions.keys())
                    # Convert our embedding to numpy array for calculations
                    embedding_of_ad_np = np.array(embedding_of_ad, dtype=float)
                    
                    # Find the closest embedding using cosine similarity
                    max_similarity = -1  # Start with negative since cosine ranges from -1 to 1
                    max_similarity_embedding = None
                    
                    for embedding in all_embeeddings:
                        # Convert embedding tuple to numpy array
                        embedding_np = np.array(embedding, dtype=float)
                        # Calculate cosine similarity
                        dot_product = np.dot(embedding_of_ad_np, embedding_np)
                        norm_product = np.linalg.norm(embedding_of_ad_np) * np.linalg.norm(embedding_np)
                        # Avoid division by zero
                        if norm_product == 0:
                            similarity = 0
                        else:
                            similarity = dot_product / norm_product
                        
                        if similarity > max_similarity:
                            max_similarity = similarity
                            max_similarity_embedding = embedding
                    
                    # Only use the closest embedding if the similarity is high enough
                    if max_similarity_embedding is not None and max_similarity > 0.8:
                        logger.info(f"Using similar embedding {max_similarity_embedding} with similarity {max_similarity:.2f}")
                        # Access the embedding DataFrame safely
                        df = embedding_impressions.get(max_similarity_embedding)
                        if df is not None:
                            logger.info(f"DataFrame columns: {df.columns.tolist()}")
                            logger.info(f"DataFrame shape: {df.shape}")
                            logger.info(f"DataFrame first row: {df.iloc[0].to_dict()}")
                            
                            # Try to access "Overall Accumulative" column
                            if 'Overall Accumulative' in df.columns:
                                multiplier = df['Overall Accumulative'].iloc[0]
                                logger.info(f"Raw multiplier value: {multiplier}")
                                # No need to divide by 100, use the value directly
                                return float(multiplier)
                            else:
                                # Try other column names that might contain the multiplier
                                for col in df.columns:
                                    if 'accumulative' in col.lower() or 'overall' in col.lower() or 'impression' in col.lower():
                                        logger.info(f"Using column {col} as multiplier")
                                        multiplier = df[col].iloc[0]
                                        logger.info(f"Raw multiplier value: {multiplier}")
                                        return float(multiplier)
                                
                                logger.info(f"Could not find appropriate multiplier column. Using first numeric column")
                                # Use the first numeric column as fallback
                                for col in df.columns:
                                    if pd.api.types.is_numeric_dtype(df[col]):
                                        logger.info(f"Using numeric column {col} as multiplier")
                                        multiplier = df[col].iloc[0]
                                        logger.info(f"Raw multiplier value: {multiplier}")
                                        return float(multiplier)
                                
                                logger.info(f"Could not find any numeric column. DataFrame: {df}")
                        else:
                            logger.info(f"DataFrame is None for embedding {max_similarity_embedding}")
                    else:
                        logger.info(f"No similar embedding found (max similarity: {max_similarity:.2f})")
                except Exception as e:
                    logger.warning(f"Error in cosine similarity calculation: {str(e)}")
                
                # Fallback to calculated value if no match or similarity fails
            
        except Exception as e:
            # If there's any error with the embeddings, log it and use fallback calculation
            logger.warning(f"Could not load embedding impressions: {str(e)}. Using fallback calculation.")
        
        # Calculate multiplier based on all factors
        base_multiplier = size_multipliers.get(size, 1.0)
        type_multiplier = type_multipliers.get(ad_type, 1.0)
        contrast_multiplier = contrast_multipliers.get(contrast, 1.0)
        pb_multiplier = product_brand_multipliers.get(product_or_brand, 1.0)
        
        return round(base_multiplier * type_multiplier * contrast_multiplier * pb_multiplier, 2)

    def _predict_product_or_brand(self, name: str, image: np.ndarray = None) -> str:
        return 'product'

    def process_ad_image(self, image_path: str, name: str, game_id: str = None) -> Dict[str, Any]:
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            if not any(image_path.lower().endswith(fmt) for fmt in self.accepted_formats):
                raise ValueError(f"Invalid format. Accepted formats: {self.accepted_formats}")
            ad_type = self._determine_ad_type(image_path) #only.png is working right now
            if ad_type in ['static', 'animated', '3d']:
                image = cv2.imread(image_path)
                if image is None:
                    raise ValueError("Failed to load image")
                    
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                height, width = image.shape[:2]
                
                # Calculate image characteristics
                contrast = self._calculate_contrast(image)
                size = self._determine_size(width, height)
                
                # Determine if this is a product or brand ad
                product_or_brand = self._predict_product_or_brand(name, image)
            else:
                contrast = 1.0
                size = 'medium'
                product_or_brand = self._predict_product_or_brand(name)
            
            # Determine the ad space and impression multiplier
            ad_space = self._determine_ad_space(size, ad_type)
            impression_multiplier = self._calculate_impression_multiplier(contrast, size, ad_type, product_or_brand)
            
            # Generate ad parameters
            ad_params = {
                "ad_id": str(uuid.uuid4()),
                "ad_type": ad_type,
                "size": size,
                "name": name,
                "product_or_brand": product_or_brand,
                "contrast": contrast,
                "billboard_id": None,
                "game_id": game_id,
                "ad_space": ad_space,
                "campaigns": [],
                "total_impressions": 0,
                "impression_multiplier": impression_multiplier,
                "createdAt": datetime.now().isoformat()
            }
            logger.info(f"Successfully processed ad: {name} (Type: {ad_type}, Space: {ad_space}, Classification: {product_or_brand})")
            return ad_params
            
        except Exception as e:
            logger.error(f"Error processing ad: {str(e)}")
            raise

def create_ad_from_image(image_path: str, name: str, game_id: str = None) -> Dict[str, Any]:
    """
    Convenience function to create an ad from an image
    
    Args:
        image_path (str): Path to the image file
        name (str): Name of the ad
        game_id (str, optional): ID of the game this ad belongs to
        
    Returns:
        dict: Ad parameters ready for database insertion
    """
    processor = AdImagePreprocessor()
    return processor.process_ad_image(image_path, name, game_id)

if __name__ == "__main__":
    # Example usage
    try:
        image_path = "path/to/your/ad.gif"  # Try different extensions
        ad_name = "Sample Ad"
        ad_params = create_ad_from_image(image_path, ad_name)
        print(json.dumps(ad_params, indent=2))
    except Exception as e:
        logger.error(f"Error in main: {str(e)}") 

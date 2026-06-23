import qrcode
from PIL import Image
import os

def generate_qr_code(url: str, output_path: str) -> str:
    """
    Generates a PNG QR code with a transparent background.
    
    Args:
        url (str): The URL/data to encode.
        output_path (str): Filepath where the PNG image will be saved.
        
    Returns:
        str: The path to the saved QR image.
    """
    if not url:
        raise ValueError("URL for QR Code cannot be empty")
        
    try:
        # Create QR object
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M, # Medium error correction
            box_size=10,
            border=1 # Minimal border to save space inside cells
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        # Generate raw PIL image with white background
        img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
        
        # Process the image to substitute white pixels with transparent ones
        datas = img.getdata()
        new_data = []
        for item in datas:
            # item represents (Red, Green, Blue, Alpha)
            # Match white or near-white pixels and set alpha to 0
            if item[0] > 220 and item[1] > 220 and item[2] > 220:
                new_data.append((255, 255, 255, 0)) # Fully transparent
            else:
                new_data.append((0, 0, 0, 255))     # solid black
                
        img.putdata(new_data)
        
        # Ensure target directories exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save as PNG
        img.save(output_path, "PNG")
        return output_path
    except Exception as e:
        raise RuntimeError(f"Failed to generate QR code for URL '{url}': {str(e)}")

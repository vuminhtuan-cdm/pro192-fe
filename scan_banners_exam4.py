import json
import os
import sys
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

img_dir = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\images'
ocr = RapidOCR()

print("Scanning top banner of all 50 images for multi-choice badges...")
multi_questions = []

for num in range(1, 51):
    img_name = f"sp26_b5_fe_q{num:02d}.webp"
    img_path = os.path.join(img_dir, img_name)
    if not os.path.exists(img_path):
        continue
    
    with Image.open(img_path) as im:
        w, h = im.size
        # Crop top header (0 to 120 px)
        header = im.crop((0, 0, w, min(120, h)))
        # Save temp
        temp_crop = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\temp_crop.png'
        header.save(temp_crop)
        
    res, _ = ocr(temp_crop)
    if res:
        full_text = " ".join([r[1] for r in res])
        if "choose" in full_text.lower() or "answer" in full_text.lower() or "multiple" in full_text.lower():
            print(f"Q{num:02d} Header: {full_text}")
            if any(k in full_text.lower() for k in ["choose 2", "choose 3", "choose 4", "multiple"]):
                multi_questions.append((num, full_text))

print(f"\nFound {len(multi_questions)} questions with multi badges: {multi_questions}")

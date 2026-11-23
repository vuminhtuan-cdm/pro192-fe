import cv2
import os
from rapidocr_onnxruntime import RapidOCR

engine = RapidOCR()
img_dir = r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\images"

print("Scanning headers of all 50 images in De 5 for MULTIPLE CHOICE...")
multiple_choice_found = []

for i in range(1, 51):
    fname = f"sp26_fe_q{i:02d}.jpg"
    fpath = os.path.join(img_dir, fname)
    if not os.path.exists(fpath):
        continue
    img = cv2.imread(fpath)
    if img is None:
        continue
    # crop top 250 pixels
    h, w, _ = img.shape
    crop = img[0:min(280, h), 0:w]
    result, _ = engine(crop)
    if result:
        text = " ".join([line[1] for line in result]).lower()
        if "multiple" in text or "choose multiple" in text or "many" in text or "all that apply" in text:
            multiple_choice_found.append((i, text))
            print(f"Q{i:02d}: Found multi-choice marker: {text}")

print("Done scanning headers!")
print("Multiple choice questions found:", [x[0] for x in multiple_choice_found])

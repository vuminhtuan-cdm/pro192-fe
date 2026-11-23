import json
import os
import sys
from rapidocr_onnxruntime import RapidOCR

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

img_dir = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\images'
data_path = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\data\PRO192_SP26_RE.json'

with open(data_path, 'r', encoding='utf-8') as f:
    questions = json.load(f)

ocr = RapidOCR()
ocr_results = {}

print("Starting OCR for 50 questions...")
for q in sorted(questions, key=lambda x: x['order_num']):
    num = q['order_num']
    img_name = f"sp26_re_q{num:02d}.jpg"
    img_path = os.path.join(img_dir, img_name)
    if not os.path.exists(img_path):
        print(f"Missing {img_path}")
        continue
    
    result, _ = ocr(img_path)
    if result:
        lines = [line[1] for line in result]
        ocr_results[num] = lines
    else:
        ocr_results[num] = []

out_ocr_path = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\exam3_ocr.json'
with open(out_ocr_path, 'w', encoding='utf-8') as f:
    json.dump(ocr_results, f, ensure_ascii=False, indent=2)

print(f"Saved OCR results for {len(ocr_results)} questions to {out_ocr_path}")

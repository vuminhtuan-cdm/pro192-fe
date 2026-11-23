import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

fpath = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\data\PRO192_SP26_B5_FE_RE.json'
with open(fpath, 'r', encoding='utf-8') as f:
    questions = json.load(f)

print(f"Total questions in Đề 2: {len(questions)}")
multi_qs = []
zero_qs = []
counts = {}

for q in questions:
    num = q['order_num']
    opts = q.get('question_options', [])
    correct = [o['label'] for o in opts if o.get('is_correct')]
    corr_str = ", ".join(correct)
    counts[corr_str] = counts.get(corr_str, 0) + 1
    
    if len(correct) > 1:
        multi_qs.append((num, correct))
    elif len(correct) == 0:
        zero_qs.append(num)

print("Answer distribution:", counts)
print(f"Multi-choice questions ({len(multi_qs)}): {multi_qs}")
print(f"Zero-choice questions ({len(zero_qs)}): {zero_qs}")

# Check local images exist
img_base = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192'
missing_imgs = []
for q in questions:
    num = q['order_num']
    u = q.get('image_url')
    if not u or not os.path.exists(os.path.join(img_base, u.replace('/', os.sep))):
        missing_imgs.append((num, u))

print(f"Missing images: {len(missing_imgs)}")

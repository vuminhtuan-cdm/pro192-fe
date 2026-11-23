import json
import os
import re
import sys
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

transcript_path = r'C:\Users\Admin\.gemini\antigravity\brain\dec80364-1216-45dc-9989-4c5885419bde\.system_generated\logs\transcript_full.jsonl'
target_exam_id = '10eeb1a9-30ae-4692-81a8-af8c86a1f736'

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        if target_exam_id in line:
            obj = json.loads(line)
            content = obj.get('content', '')
            break

decoder = json.JSONDecoder()
idx1 = content.find('[{')
questions, end1 = decoder.raw_decode(content[idx1:].strip())
print(f"Parsed {len(questions)} questions")

idx2 = content.find('[{', idx1 + end1)
signed_urls = []
if idx2 != -1:
    signed_urls, end2 = decoder.raw_decode(content[idx2:].strip())
    print(f"Parsed {len(signed_urls)} signed URLs")

signed_map = {}
for s in signed_urls:
    p = s.get('path')
    u = s.get('signedURL')
    if p and u:
        signed_map[p] = u

base_dir = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192'
img_dir = os.path.join(base_dir, 'images')
os.makedirs(img_dir, exist_ok=True)

questions.sort(key=lambda x: x.get('order_num', 0))

supabase_base = "https://vhljgmtithjeovtrghvy.supabase.co/storage/v1"

downloaded = 0
failed = []

for q in questions:
    num = q.get('order_num')
    raw_img_url = q.get('image_url')
    if not raw_img_url:
        continue
    
    match = re.search(r'question-images/(.*)', raw_img_url)
    rel_key = match.group(1) if match else None
    
    ext = os.path.splitext(raw_img_url)[1] or '.jpg'
    local_name = f"sp26_re_q{num:02d}{ext}"
    local_path = os.path.join(img_dir, local_name)
    
    dl_url = None
    if rel_key and rel_key in signed_map:
        dl_url = supabase_base + signed_map[rel_key]
    else:
        dl_url = raw_img_url
        
    try:
        req = urllib.request.Request(dl_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp, open(local_path, 'wb') as out_f:
            out_f.write(resp.read())
        downloaded += 1
        q['image_url'] = f"images/{local_name}"
    except Exception as e:
        print(f"Error downloading Q{num}: {e}")
        failed.append(num)

print(f"Successfully downloaded {downloaded}/{len(questions)} images.")
if failed:
    print(f"Failed questions: {failed}")

out_json_path = os.path.join(base_dir, 'data', 'PRO192_SP26_RE.json')
with open(out_json_path, 'w', encoding='utf-8') as out_f:
    json.dump(questions, out_f, ensure_ascii=False, indent=2)

print(f"Saved {len(questions)} questions to {out_json_path}")

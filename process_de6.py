import json
import os
import requests

def main():
    raw_path = r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\raw_de6.txt"
    with open(raw_path, 'r', encoding='utf-8') as f:
        text = f.read()

    text = text.replace('<USER_REQUEST>', '').replace('</USER_REQUEST>', '').strip()
    parts = text.split('\n[')
    
    title_line = parts[0].strip()
    print("Header:", title_line)
    
    p1_str = '[' + parts[1]
    p2_str = '[' + parts[2]
    if not p2_str.endswith(']'):
        p2_str = p2_str[:p2_str.rfind(']')+1]
        
    questions = json.loads(p1_str)
    signed_items = json.loads(p2_str)
    
    print(f"Questions: {len(questions)}")
    print(f"Signed items: {len(signed_items)}")
    
    signed_map = {}
    for item in signed_items:
        if item.get('path') and item.get('signedURL'):
            signed_map[item['path']] = item['signedURL']
            
    questions.sort(key=lambda x: x.get('order_num', 0))
    
    multi_choice = []
    no_choice = []
    for q in questions:
        correct = [opt['label'] for opt in q.get('question_options', []) if opt.get('is_correct')]
        if len(correct) > 1:
            multi_choice.append((q.get('order_num'), correct))
        elif len(correct) == 0:
            no_choice.append(q.get('order_num'))

    print(f"Questions with multiple correct answers in dump: {multi_choice}")
    print(f"Questions with no correct answers in dump: {no_choice}")
    
    img_dir = r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\images"
    os.makedirs(img_dir, exist_ok=True)
    base_url = "https://vhljgmtithjeovtrghvy.supabase.co/storage/v1"
    
    download_count = 0
    for q in questions:
        idx = q.get('order_num')
        img_url = q.get('image_url', '')
        
        # Find signed URL
        signed_rel = None
        for p, s in signed_map.items():
            if p in img_url:
                signed_rel = s
                break
                
        local_filename = f"fa25_re_q{idx:02d}.webp"
        local_rel_path = f"images/{local_filename}"
        local_full_path = os.path.join(img_dir, local_filename)
        
        if not os.path.exists(local_full_path) or os.path.getsize(local_full_path) == 0:
            if signed_rel:
                dl_url = base_url + signed_rel
            else:
                dl_url = img_url
            resp = requests.get(dl_url, timeout=30)
            if resp.status_code == 200:
                with open(local_full_path, 'wb') as img_f:
                    img_f.write(resp.content)
                download_count += 1
            else:
                print(f"Failed to download Q{idx}: status {resp.status_code}")
        else:
            download_count += 1
            
        q['image_url'] = local_rel_path
        
    print(f"All images ready: {download_count}/{len(questions)}")
    
    out_path = r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\data\PRO192_FA25_RE.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Saved {out_path}")

if __name__ == "__main__":
    main()

import json

path = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\data\PRO192_SP26_B5_FE.json'
with open(path, 'r', encoding='utf-8') as f:
    questions = json.load(f)

fixed = False
for q in questions:
    if q.get('order_num') == 42:
        opts = q.get('question_options', [])
        for opt in opts:
            if opt.get('label') == 'A':
                opt['is_correct'] = True
            elif opt.get('label') == 'D':
                opt['is_correct'] = False
        fixed = True
        print("Fixed Q42: set A=True, D=False (TreeMap values sorted by keys: [3, 2, 1])")
        break

if fixed:
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print("Saved fixed PRO192_SP26_B5_FE.json")

import json

path = r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\data\PRO192_SP26_FE.json"
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix Q14: Correct answer is A (Calculation failed. Finished.)
for q in data:
    if q.get('order_num') == 14:
        for opt in q['question_options']:
            opt['is_correct'] = (opt['label'] == 'A')
        print("Fixed Q14: Set correct to A")

    # Fix Q30: Correct answer is C (Abstract classes can have both abstract and concrete methods)
    if q.get('order_num') == 30:
        for opt in q['question_options']:
            opt['is_correct'] = (opt['label'] == 'C')
        print("Fixed Q30: Set correct to C")

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated data/PRO192_SP26_FE.json successfully.")

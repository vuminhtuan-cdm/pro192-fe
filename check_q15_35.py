import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

fpath = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\data\PRO192_SU26_FE.json'
with open(fpath, 'r', encoding='utf-8') as f:
    questions = json.load(f)

for q in questions[14:35]:
    num = q['order_num']
    content = q.get('content', '') or ''
    opts = q.get('question_options', [])
    correct = [o['label'] for o in opts if o.get('is_correct')]
    print(f"--- Q{num} ---")
    print(f"Q: {content}")
    for o in opts:
        tag = " [*MARKED CORRECT*]" if o.get('is_correct') else ""
        print(f"  {o['label']}: {o.get('content')}{tag}")
    print()

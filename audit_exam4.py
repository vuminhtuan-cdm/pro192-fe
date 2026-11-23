import json
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

path = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\data\PRO192_SP26_B5_FE.json'
with open(path, 'r', encoding='utf-8') as f:
    questions = json.load(f)

print(f"Total questions: {len(questions)}")
multi_choice = []
no_answer = []

for q in questions:
    num = q.get('order_num')
    opts = q.get('question_options', [])
    correct_opts = [o.get('label') for o in opts if o.get('is_correct')]
    
    if len(correct_opts) == 0:
        no_answer.append(num)
    elif len(correct_opts) > 1:
        multi_choice.append((num, correct_opts))

print(f"Questions with NO correct answer: {no_answer}")
print(f"Questions with MULTIPLE correct answers: {multi_choice}")

for q in questions:
    num = q.get('order_num')
    opts = q.get('question_options', [])
    correct = [o.get('label') for o in opts if o.get('is_correct')]
    print(f"Q{num:02d}: {','.join(correct)} (opts: {len(opts)})")

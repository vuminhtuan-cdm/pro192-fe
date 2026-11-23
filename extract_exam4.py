import json
import os
import sys

transcript_path = r'C:\Users\Admin\.gemini\antigravity\brain\dec80364-1216-45dc-9989-4c5885419bde\.system_generated\logs\transcript_full.jsonl'
target_exam_id = '950206c5-9585-4e03-a9a0-e8e54bc27622'

found = False
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        if target_exam_id in line:
            obj = json.loads(line)
            content = obj.get('content', '')
            out_raw = r'C:\Users\Admin\.gemini\antigravity\scratch\pro192\raw_exam4.txt'
            with open(out_raw, 'w', encoding='utf-8') as out_f:
                out_f.write(content)
            print("Found and saved raw_exam4.txt, length:", len(content))
            found = True
            break

if not found:
    print("Not found yet!")

import json
import os

transcript_path = r"C:\Users\Admin\.gemini\antigravity\brain\dec80364-1216-45dc-9989-4c5885419bde\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 1307:
            content = data.get("content", "")
            print("Step 1307 length:", len(content))
            # Let's save the raw content to a file so we can inspect and process it
            with open(r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\raw_exam3.txt", "w", encoding="utf-8") as out:
                out.write(content)
            print("Saved raw_exam3.txt")
            break

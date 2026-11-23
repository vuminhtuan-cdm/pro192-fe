import json
import re

with open(r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\raw_exam3.txt", "r", encoding="utf-8") as f:
    text = f.read()

print("Text start:", text[:300])
print("---")
# Look for JSON arrays or signed URLs
# In previous prompts, the user sent:
# <USER_REQUEST>
# Title
# [questions...]
# [signed_urls...] (optional or at the end)

# Let's find JSON objects/arrays
match = re.search(r'\[\s*\{.*\}\s*\]', text, re.DOTALL)
if match:
    print("Found JSON match length:", len(match.group(0)))
else:
    print("No regex match for single array, let's parse chunks")

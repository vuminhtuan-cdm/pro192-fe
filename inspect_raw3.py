import json

with open(r"C:\Users\Admin\.gemini\antigravity\scratch\pro192\raw_exam3.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Let's see what is after the questions array
# Find the start of the first array
start_idx = text.find('[')
# Let's decode JSON starting from start_idx
decoder = json.JSONDecoder()
questions, end_idx = decoder.raw_decode(text, start_idx)
print(f"Decoded questions: {len(questions)}")
print(f"Remaining text after questions (len {len(text) - end_idx}):")
remaining = text[end_idx:].strip()
print("Remaining text preview:", remaining[:500])

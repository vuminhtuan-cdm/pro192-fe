import json
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"C:\Users\Admin\.gemini\antigravity\scratch\pro192"
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_JS = os.path.join(BASE_DIR, "exams.js")

exam_configs = [
    {
        "id": "exam_1",
        "code": "PRO192_SU26_FE",
        "title": "Đề 1: PRO192 - SU26 - FE (Trắc nghiệm chữ)",
        "shortTitle": "Đề 1 (SU26 FE Chữ)",
        "type": "text",
        "filename": "PRO192_SU26_FE.json"
    },
    {
        "id": "exam_2",
        "code": "PRO192_SP26_B5_FE_RE",
        "title": "Đề 2: Đề Thi FE - PRO192 - SP26 - B5 - FE - RE (Đề Thi Ảnh)",
        "shortTitle": "Đề 2 (SP26 B5 Ảnh)",
        "type": "image",
        "filename": "PRO192_SP26_B5_FE_RE.json"
    },
    {
        "id": "exam_3",
        "code": "PRO192_SP26_RE",
        "title": "Đề 3: Đề Thi FE - PRO192 - SP26 - RE (Đề Thi Ảnh)",
        "shortTitle": "Đề 3 (SP26 RE Ảnh)",
        "type": "image",
        "filename": "PRO192_SP26_RE.json"
    }
]

def clean_text(text):
    if not text:
        return text
    if "\\n" in text and "\n" not in text:
        text = text.replace("\\n", "\n")
    return text

exams = []
all_combined_questions = []
all_counts = {}

for config in exam_configs:
    file_path = os.path.join(DATA_DIR, config["filename"])
    if not os.path.exists(file_path):
        print(f"Warning: File {file_path} not found.")
        continue

    with open(file_path, "r", encoding="utf-8") as f:
        questions = json.load(f)

    counts = {}
    clean_questions = []

    for q in questions:
        raw_options = q.get("question_options", [])
        
        # Check max label of correct answer (e.g. if E is correct, keep up to E)
        correct_labels = [opt["label"] for opt in raw_options if opt.get("is_correct")]
        correct_labels.sort()
        correct_str = ", ".join(correct_labels)
        
        # Determine valid options: keep at least A, B, C, D
        # If any correct or non-empty beyond D, keep up to that option
        labels_to_keep = {'A', 'B', 'C', 'D'}
        for opt in raw_options:
            if opt.get("is_correct") or (opt.get("content") and opt.get("content").strip()):
                labels_to_keep.add(opt.get("label"))
        
        filtered_options = [opt for opt in raw_options if opt.get("label") in labels_to_keep]

        counts[correct_str] = counts.get(correct_str, 0) + 1
        all_counts[correct_str] = all_counts.get(correct_str, 0) + 1

        img = q.get("local_image_url") or q.get("image_url")
        content = clean_text(q.get("content"))
        explanation = clean_text(q.get("explanation"))

        q_obj = {
            "id": f"{config['code']}_{q.get('id', q.get('order_num'))}",
            "raw_id": q.get("id"),
            "order_num": q.get("order_num", len(clean_questions) + 1),
            "exam_source": config["shortTitle"],
            "exam_code": config["code"],
            "content": content,
            "explanation": explanation,
            "image_url": img,
            "type": q.get("type", "image" if img else "text"),
            "chapter_name": q.get("chapter_name", "PRO192"),
            "correct_answer": correct_str,
            "is_multi": len(correct_labels) > 1,
            "correct_count": len(correct_labels),
            "options": [
                {
                    "id": opt.get("id", f"{q.get('order_num')}_{opt.get('label')}"),
                    "label": opt.get("label"),
                    "content": clean_text(opt.get("content", "")),
                    "is_correct": opt.get("is_correct", False)
                }
                for opt in filtered_options
            ]
        }
        clean_questions.append(q_obj)
        all_combined_questions.append(q_obj)

    config["questions"] = clean_questions
    config["counts"] = counts
    config["total"] = len(clean_questions)
    exams.append(config)
    print(f"Loaded {config['shortTitle']}: {len(clean_questions)} questions, counts: {counts}")

# Tạo đề tổng hợp
all_exam_config = {
    "id": "exam_all",
    "code": f"ALL_{len(all_combined_questions)}",
    "title": f"TỔNG HỢP CẢ {len(exams)} ĐỀ ({len(all_combined_questions)} CÂU HỎI TOÀN DIỆN)",
    "shortTitle": f"🔥 Tổng Hợp {len(exams)} Đề ({len(all_combined_questions)} Câu)",
    "type": "mixed",
    "isAll": True,
    "questions": all_combined_questions,
    "counts": all_counts,
    "total": len(all_combined_questions)
}
exams.append(all_exam_config)

with open(OUTPUT_JS, "w", encoding="utf-8") as f:
    f.write("// Dữ liệu các bộ đề thi PRO192 - Lập trình Hướng đối tượng với Java (OOP with Java)\n")
    f.write("var EXAMS_DATA = " + json.dumps(exams, ensure_ascii=False, indent=2) + ";\n")
    f.write("if (typeof window !== 'undefined') { window.EXAMS_DATA = EXAMS_DATA; }\n")

print(f"\nGenerated exams.js with {len(exams)} items ({len(exam_configs)} đề đơn + 1 đề tổng hợp {len(all_combined_questions)} câu)!")

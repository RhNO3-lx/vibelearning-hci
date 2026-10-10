"""只读核查 DeepTutor 的两个纯函数；不加载应用、不访问用户数据。

用法：python3 源码探针.py /path/to/DeepTutor
输出是观察结果，不是完整项目测试或教育有效性评估。
"""

import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys


def load_file(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


root = Path(sys.argv[1]).resolve()
mastery_path = root / "deeptutor/learning/mastery.py"
grading_path = root / "deeptutor/learning/grading.py"
mastery = load_file("audited_mastery", mastery_path)
grading = load_file("audited_grading", grading_path)
report = {
    "commit": subprocess.check_output(
        ["git", "-C", str(root), "rev-parse", "HEAD"], text=True
    ).strip(),
    "scope": "原始源码纯函数执行；没有运行全应用或项目测试套件",
    "source_sha256": {
        str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in (mastery_path, grading_path)
    },
    "mastery": [
        {"outcomes": values, "score": mastery.compute_mastery(values)}
        for values in ([], [True], [True, True], [True, True, True],
                       [False, True, True], [True, True, False])
    ],
    "grading_boundary_cases": [
        {"case": "数值近似文本不同值", "student": "123456789", "expected": "123456788",
         "type": "short", "graded_correct": grading.grade_answer("123456789", "123456788", "short")},
        {"case": "开放题否定句包含关键词", "student": "不需要连续，也不需要可导",
         "expected": "连续;可导", "type": "open",
         "graded_correct": grading.grade_answer("不需要连续，也不需要可导", "连续;可导", "open")},
        {"case": "选择题确定答案", "student": "B", "expected": "B",
         "type": "choice", "graded_correct": grading.grade_answer("B", "B", "choice")},
    ],
}
print(json.dumps(report, ensure_ascii=False, indent=2))

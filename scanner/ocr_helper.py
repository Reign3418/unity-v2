import sys
import json
from rapidocr_onnxruntime import RapidOCR

img_path = sys.argv[1] if len(sys.argv) > 1 else "C:\\UnityScanner\\sc_16384.png"
ocr = RapidOCR()
res, _ = ocr(img_path)
results = []
for box, text, conf in (res or []):
    cx = int(sum(p[0] for p in box) / 4)
    cy = int(sum(p[1] for p in box) / 4)
    results.append({"text": text, "x": cx, "y": cy, "conf": round(conf, 2)})

print(json.dumps(results, indent=2))

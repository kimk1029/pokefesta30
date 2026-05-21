"""PaddleOCR sidecar.

Loads the Korean PaddleOCR model once at startup and exposes POST /ocr.
The Node OCR server proxies image bytes here when useAi=true.

Run:  python3 server.py
"""
import io
import os
import sys
import logging
import time
from typing import Any, Dict, List

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("paddle-sidecar")

# Silence Paddle's own noisy info logs.
os.environ.setdefault("FLAGS_use_mkldnn", "1")
os.environ.setdefault("GLOG_minloglevel", "2")

log.info("Loading PaddleOCR (lang=korean)... first run downloads ~150MB of models")
_t0 = time.time()
from paddleocr import PaddleOCR  # noqa: E402

# det + rec + cls; korean recognition model. CPU only.
_OCR = PaddleOCR(use_textline_orientation=True, lang="korean")
log.info("PaddleOCR ready in %.1fs", time.time() - _t0)

app = FastAPI()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "engine": "paddleocr", "lang": "korean"}


@app.post("/ocr")
async def ocr(image: UploadFile = File(...)) -> JSONResponse:
    """Accept a multipart image, return all detected text + confidences.

    Response:
      { "lines": [{ "text": "...", "conf": 0.97, "box": [[x,y], ...] }, ...],
        "fullText": "joined newline-separated", "durationMs": 123 }
    """
    started = time.time()
    raw = await image.read()
    if not raw:
        return JSONResponse(status_code=400, content={"error": "empty image"})

    # PaddleOCR accepts bytes via numpy/PIL — easiest is decode then pass np array.
    import numpy as np
    from PIL import Image

    img = Image.open(io.BytesIO(raw)).convert("RGB")
    arr = np.array(img)

    try:
        # PaddleOCR 3.x: predict() is the new API. Returns a list of dict-like
        # OCRResult objects; we iterate the first one's rec_texts/rec_scores/dt_polys.
        result = _OCR.predict(arr)
    except Exception as e:  # noqa: BLE001
        log.exception("ocr failed")
        return JSONResponse(status_code=500, content={"error": str(e)})

    lines: List[Dict[str, Any]] = []
    if result:
        first = result[0] if isinstance(result, list) else result
        # OCRResult exposes dict-style access in 3.x.
        try:
            texts = first["rec_texts"]
            scores = first["rec_scores"]
            polys = first["dt_polys"]
        except Exception:  # noqa: BLE001
            texts, scores, polys = [], [], []
        for text, score, poly in zip(texts, scores, polys):
            lines.append({
                "text": str(text),
                "conf": float(score),
                "box": [[float(p[0]), float(p[1])] for p in poly],
            })

    full_text = "\n".join(line["text"] for line in lines)
    duration = int((time.time() - started) * 1000)
    log.info("ocr: %d lines, %dms", len(lines), duration)
    return JSONResponse(content={"lines": lines, "fullText": full_text, "durationMs": duration})


if __name__ == "__main__":
    port = int(os.environ.get("PADDLE_PORT", "3002"))
    log.info("Listening http://127.0.0.1:%d", port)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

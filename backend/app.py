from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn, numpy as np, cv2, pytesseract, tempfile

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ParseResp(BaseModel):
    grid: list
    confidence: float

def preprocess(img):
    # Graustufen, Entzerren, binarisieren
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    bw   = cv2.adaptiveThreshold(blur,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                 cv2.THRESH_BINARY, 11, 2)
    inv  = 255 - bw
    # größtes Viereck (Sudoku) finden
    contours, _ = cv2.findContours(inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: raise ValueError("Kein Gitter gefunden")
    cnt = max(contours, key=cv2.contourArea)
    peri = cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, 0.02*peri, True)
    if len(approx) != 4: raise ValueError("Gitter nicht eindeutig")
    pts = approx.reshape(4,2).astype(np.float32)
    # sortiere zu [tl,tr,br,bl]
    s = pts.sum(axis=1); diff = np.diff(pts, axis=1).reshape(-1)
    rect = np.array([pts[np.argmin(s)], pts[np.argmin(diff)], pts[np.argmax(s)], pts[np.argmax(diff)]], dtype=np.float32)
    size = 900
    M = cv2.getPerspectiveTransform(rect, np.array([[0,0],[size,0],[size,size],[0,size]], dtype=np.float32))
    warp = cv2.warpPerspective(gray, M, (size, size))
    warp = cv2.adaptiveThreshold(warp,255,cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV,11,2)
    return warp

def ocr_grid(warp):
    N = 9
    cell = warp.shape[0] // N
    grid = [[0]*N for _ in range(N)]
    confs = []
    for r in range(N):
        for c in range(N):
            y0, y1 = r*cell, (r+1)*cell
            x0, x1 = c*cell, (c+1)*cell
            roi = warp[y0+6:y1-6, x0+6:x1-6]  # Rand weg
            # Linien etwas entfernen
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
            roi = cv2.morphologyEx(roi, cv2.MORPH_OPEN, kernel, iterations=1)
            # kleine Artefakte filtern
            if cv2.countNonZero(roi) < 35:
                continue
            # Tesseract: nur Ziffern zulassen
            config = r'--oem 1 --psm 10 -c tessedit_char_whitelist=123456789'
            txt = pytesseract.image_to_string(roi, config=config)
            txt = ''.join(ch for ch in txt if ch in '123456789')
            if txt:
                grid[r][c] = int(txt[0])
                confs.append(1.0)  # Fake-Confidence; hier könntest du echte conf auslesen
            else:
                confs.append(0.0)
    confidence = float(np.mean(confs)) if confs else 0.0
    return grid, confidence

@app.post("/api/sudoku/parse", response_model=ParseResp)
async def parse(file: UploadFile = File(...)):
    if file.content_type.split("/")[0] != "image":
        raise HTTPException(422, "Bitte ein Bild hochladen.")
    if file.size and file.size > 6_000_000:
        raise HTTPException(413, "Bild zu groß.")
    with tempfile.NamedTemporaryFile(suffix=".img") as tmp:
        data = await file.read()
        npimg = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Bild konnte nicht gelesen werden.")
        warp = preprocess(img)
        grid, conf = ocr_grid(warp)
        return {"grid": grid, "confidence": round(conf, 3)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
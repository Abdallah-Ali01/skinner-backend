import os
from typing import List
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import io
import uvicorn

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────

MODEL_PATH = os.getenv("MODEL_PATH", "my_model.keras")
IMG_SIZE = 384

CLASSES = [
    "Acne",
    "Actinic_Keratosis",
    "Bullous",
    "DrugEruption",
    "Eczema",
    "Lichen",
    "Lupus",
    "Rosacea",
    "Seborrh_Keratoses",
    "SkinCancer",
    "Tinea",
    "Unknown_Normal",
    "Vasculitis",
    "Vitiligo",
    "Warts",
]

# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────

app = FastAPI(
    title="Skin Disease Classifier API",
    description="Upload a skin image and get a diagnosis prediction using EfficientNetV2S.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Load model on startup
# ─────────────────────────────────────────────

model: tf.keras.Model = None


@app.on_event("startup")
def load_model():
    global model
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model not found at: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"✅ Model loaded from {MODEL_PATH}")


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────


class TopKItem(BaseModel):
    label: str
    confidence: float


class Prediction(BaseModel):
    predicted_class: str
    confidence: float
    top_k: List[TopKItem]
    probabilities: dict[str, float]


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    return arr

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────


@app.get("/", summary="Health check")
def root():
    return {"status": "ok", "message": "Skin Disease Classifier API is running."}


@app.get("/classes", summary="List all supported disease classes")
def get_classes():
    return {"classes": CLASSES, "total": len(CLASSES)}


@app.post("/predict", response_model=Prediction, summary="Classify a skin image")
async def predict(file: UploadFile = File(...)):
    """
    Upload a skin image (JPG / PNG) and receive:
    - **predicted_class**: the most likely disease
    - **confidence**: probability score (0–1)
    - **probabilities**: scores for all 15 classes
    """
    # Validate content type
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG or PNG.",
        )

    image_bytes = await file.read()
    tensor = preprocess_image(image_bytes)

    preds = model.predict(tensor, verbose=0)[0]          # shape: (15,)
    top_indices = np.argsort(preds)[::-1][:4]             # top 4 (primary + 3 alternatives)

    top_k = [
        TopKItem(label=CLASSES[int(i)], confidence=round(float(preds[int(i)]), 4))
        for i in top_indices
    ]

    return Prediction(
        predicted_class=CLASSES[int(top_indices[0])],
        confidence=round(float(preds[int(top_indices[0])]), 4),
        top_k=top_k,
        probabilities={cls: round(float(prob), 4) for cls, prob in zip(CLASSES, preds)},
    )


# ─────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False)
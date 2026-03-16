from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from PIL import Image
import io
import tensorflow as tf

# =====================
# CONFIG (مطابق للنوتبوك)
# =====================
MODEL_PATH = "my_model.keras"
IMG_SIZE = 384   # نفس النوتبوك
TOP_K = 3

# ✋ مهم جداً
# حطي هنا نفس train_ds.class_names بالظبط من النوتبوك
CLASS_NAMES = [
    "Actinic keratoses",
    "Basal cell carcinoma",
    "Benign keratosis-like lesions",
    "Chickenpox",
    "Cowpox",
    "Dermatofibroma",
    "HFMD",                 # ⚠️ تأكدي من الترتيب من النوتبوك
    "Healthy",
    "Measles",
    "Melanocytic nevi",
    "Melanoma",
    "Monkeypox",
    "Squamous cell carcinoma",
    "Vascular lesions",
]

app = FastAPI(title="Skin Disease AI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
try:
    model = tf.keras.models.load_model(MODEL_PATH)
except Exception as e:
    model = None
    print("❌ Failed to load model:", e)


# =====================
# PREPROCESS (مطابق للتدريب)
# =====================
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img).astype(np.float32)

    # نفس اللي استخدمتيه في التدريب
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)

    arr = np.expand_dims(arr, axis=0)
    return arr


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    if image.content_type not in [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp"
    ]:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    image_bytes = await image.read()
    x = preprocess_image(image_bytes)

    preds = model.predict(x)
    probs = preds[0].astype(float)

    if len(CLASS_NAMES) != probs.shape[0]:
        raise HTTPException(
            status_code=500,
            detail="CLASS_NAMES does not match model output size"
        )

    top1_idx = int(np.argmax(probs))
    top1_conf = float(probs[top1_idx])

    topk_idx = np.argsort(probs)[::-1][:TOP_K]
    top_k = [
        {
            "label": CLASS_NAMES[int(i)],
            "confidence": float(probs[int(i)])
        }
        for i in topk_idx
    ]

    return {
        "predicted_class": CLASS_NAMES[top1_idx],
        "confidence": top1_conf,
        "top_k": top_k,
    }
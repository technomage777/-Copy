import base64
import io
import os
import random
import re
import tempfile
import wave

import numpy as np
import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from chatterbox.tts_turbo import ChatterboxTurboTTS

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Loading Chatterbox Turbo on {DEVICE}...")
MODEL = ChatterboxTurboTTS.from_pretrained(device=DEVICE)
print("Chatterbox Turbo is ready.")

app = FastAPI(title="Story Voice Studio - Local Chatterbox Turbo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://story-voice-studio.vercel.app",
        "http://localhost",
        "http://127.0.0.1",
    ],
    allow_origin_regex=r"https://[A-Za-z0-9-]+\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

class GenerateRequest(BaseModel):
    input: str = Field(min_length=1, max_length=500)
    reference_data_uri: str
    temperature: float = Field(default=0.65, ge=0.05, le=2.0)
    seed: int = Field(default=42, ge=0)
    top_p: float = Field(default=0.90, ge=0.0, le=1.0)
    top_k: int = Field(default=1000, ge=0, le=2000)
    repetition_penalty: float = Field(default=1.20, ge=1.0, le=2.0)
    norm_loudness: bool = True

def set_seed(seed: int):
    if seed == 0:
        return
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    try:
        if DEVICE == "mps":
            torch.mps.manual_seed(seed)
    except Exception:
        pass
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

def decode_reference(data_uri: str):
    match = re.fullmatch(r"data:audio/([A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)", data_uri)
    if not match:
        raise HTTPException(status_code=400, detail="Reference audio is not a valid audio data URI.")
    subtype = match.group(1).lower()
    raw = base64.b64decode(match.group(2), validate=True)
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Reference audio is too large.")
    suffix_map = {
        "wav": ".wav", "x-wav": ".wav", "mpeg": ".mp3", "mp3": ".mp3",
        "mp4": ".m4a", "m4a": ".m4a", "x-m4a": ".m4a",
        "flac": ".flac", "ogg": ".ogg", "webm": ".webm"
    }
    suffix = suffix_map.get(subtype, ".wav")
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(raw)
    tmp.close()
    return tmp.name

def wav_bytes(tensor, sample_rate: int):
    audio = tensor.squeeze().detach().cpu().numpy()
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).astype(np.int16)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buffer.getvalue()

@app.get("/health")
def health():
    return {"ok": True, "device": DEVICE, "model": "chatterbox-turbo"}

@app.post("/generate")
def generate(payload: GenerateRequest):
    ref_path = None
    try:
        ref_path = decode_reference(payload.reference_data_uri)
        set_seed(payload.seed)
        with torch.inference_mode():
            wav = MODEL.generate(
                payload.input,
                audio_prompt_path=ref_path,
                temperature=payload.temperature,
                top_p=payload.top_p,
                top_k=payload.top_k,
                repetition_penalty=payload.repetition_penalty,
                norm_loudness=payload.norm_loudness,
            )
        return Response(
            content=wav_bytes(wav, MODEL.sr),
            media_type="audio/wav",
            headers={"Content-Disposition": 'inline; filename="chatterbox-local.wav"'}
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Local Chatterbox error: {exc}")
    finally:
        if ref_path and os.path.exists(ref_path):
            try:
                os.unlink(ref_path)
            except OSError:
                pass

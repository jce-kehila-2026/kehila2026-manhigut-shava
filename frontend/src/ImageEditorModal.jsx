import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";

function rotatedBoundingBox(width, height, rotRad) {
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  return {
    width: Math.ceil(height * sin + width * cos),
    height: Math.ceil(height * cos + width * sin),
  };
}

async function buildImage(url) {
  // Fetch remote URLs as blob to avoid canvas CORS taint
  let src = url;
  if (url.startsWith("http")) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      src = URL.createObjectURL(blob);
    } catch (_) { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedImg(imageSrc, pixelCrop, rotation) {
  const image = await buildImage(imageSrc);
  const rotRad = (rotation * Math.PI) / 180;
  const { width: bW, height: bH } = rotatedBoundingBox(image.width, image.height, rotRad);

  const canvas = document.createElement("canvas");
  canvas.width = bW;
  canvas.height = bH;
  const ctx = canvas.getContext("2d");
  ctx.translate(bW / 2, bH / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const out = document.createElement("canvas");
  out.width = pixelCrop.width;
  out.height = pixelCrop.height;
  out.getContext("2d").drawImage(
    canvas,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Empty canvas"))),
      "image/jpeg", 0.92,
    );
  });
}

const ASPECTS = [
  { label: "Free", value: undefined },
  { label: "1:1",  value: 1 },
  { label: "4:3",  value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

export default function ImageEditorModal({ imageSrc, onClose, onApply }) {
  const [crop, setCrop]                     = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                     = useState(1);
  const [rotation, setRotation]             = useState(0);
  const [aspect, setAspect]                 = useState(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [applying, setApplying]             = useState(false);

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const handleApply = async () => {
    if (!croppedAreaPixels || applying) return;
    setApplying(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onApply(blob);
    } catch {
      alert("Could not edit this image. Try adding it again as a new file.");
    } finally {
      setApplying(false);
    }
  };

  return (
    /* Backdrop */
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog */}
      <div style={{ width: "100%", maxWidth: 520, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", background: "#1a1a1a", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#111", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Edit Image</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>

        {/* Crop viewport — fixed height so the dialog doesn't grow huge */}
        <div style={{ position: "relative", height: 320, background: "#000" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div style={{ background: "#1a1a1a", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Aspect ratio */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#888", fontSize: 11, width: 44, flexShrink: 0 }}>Aspect</span>
            <div style={{ display: "flex", gap: 5 }}>
              {ASPECTS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => setAspect(a.value)}
                  style={{
                    padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: "1px solid",
                    background: aspect === a.value ? "#4472b8" : "transparent",
                    borderColor: aspect === a.value ? "#4472b8" : "#444",
                    color: aspect === a.value ? "#fff" : "#aaa",
                    transition: "all 0.15s",
                  }}
                >{a.label}</button>
              ))}
            </div>
          </div>

          {/* Zoom */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#888", fontSize: 11, width: 44, flexShrink: 0 }}>Zoom</span>
            <input
              type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#4472b8" }}
            />
            <span style={{ color: "#888", fontSize: 11, width: 30, textAlign: "right" }}>{zoom.toFixed(1)}×</span>
          </div>

          {/* Rotation */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#888", fontSize: 11, width: 44, flexShrink: 0 }}>Rotate</span>
            <input
              type="range" min={-180} max={180} step={1} value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#4472b8" }}
            />
            <span style={{ color: "#888", fontSize: 11, width: 30, textAlign: "right" }}>{rotation}°</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
            <button
              onClick={onClose}
              style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid #444", background: "transparent", color: "#ccc", fontSize: 13, cursor: "pointer" }}
            >Cancel</button>
            <button
              onClick={handleApply}
              disabled={applying}
              style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#4472b8", color: "#fff", fontSize: 13, fontWeight: 700, cursor: applying ? "not-allowed" : "pointer", opacity: applying ? 0.7 : 1 }}
            >{applying ? "Applying…" : "Apply"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

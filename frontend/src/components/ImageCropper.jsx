import { useState, useEffect, useRef } from "react";

const HANDLES = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"];

const HANDLE_CURSORS = {
  tl: "nw-resize", tc: "n-resize", tr: "ne-resize",
  ml: "w-resize",                  mr: "e-resize",
  bl: "sw-resize", bc: "s-resize", br: "se-resize",
};

const MIN_SIZE = 30;

function getHandleOffset(handle, crop) {
  const { x, y, w, h } = crop;
  const cx = x + w / 2, cy = y + h / 2;
  const map = {
    tl: [x, y], tc: [cx, y], tr: [x + w, y],
    ml: [x, cy],              mr: [x + w, cy],
    bl: [x, y + h], bc: [cx, y + h], br: [x + w, y + h],
  };
  return map[handle];
}

export function ImageCropper({ file, onConfirm, onCancel, lang }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop]     = useState(null);
  const imgRef              = useRef(null);
  const containerRef        = useRef(null);
  const dragRef             = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const initCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const W = img.offsetWidth;
    const H = img.offsetHeight;
    const m = Math.min(W, H) * 0.04;
    setCrop({ x: m, y: m, w: W - m * 2, h: H - m * 2 });
  };

  const startDrag = (e, type) => {
    if (e.type === "mousedown") e.preventDefault();
    e.stopPropagation();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const contRect = containerRef.current.getBoundingClientRect();

    dragRef.current = {
      type,
      startMouse: { x: clientX - contRect.left, y: clientY - contRect.top },
      startCrop: { ...crop },
    };

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = cx - rect.left;
      const my = cy - rect.top;
      const dx = mx - dragRef.current.startMouse.x;
      const dy = my - dragRef.current.startMouse.y;
      const { startCrop: sc, type: dragType } = dragRef.current;
      const imgW = imgRef.current.offsetWidth;
      const imgH = imgRef.current.offsetHeight;

      setCrop(() => {
        let { x, y, w, h } = sc;
        const t = dragType;

        if (t === "move") {
          x = clamp(x + dx, 0, imgW - w);
          y = clamp(y + dy, 0, imgH - h);
        } else {
          if (t.includes("l")) {
            const nx = clamp(x + dx, 0, x + w - MIN_SIZE);
            w = x + w - nx; x = nx;
          }
          if (t.includes("r")) {
            w = clamp(w + dx, MIN_SIZE, imgW - x);
          }
          if (t.includes("t")) {
            const ny = clamp(y + dy, 0, y + h - MIN_SIZE);
            h = y + h - ny; y = ny;
          }
          if (t.includes("b")) {
            h = clamp(h + dy, MIN_SIZE, imgH - y);
          }
        }
        return { x, y, w, h };
      });
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !crop) return;
    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;
    const cx = Math.max(0, Math.round(crop.x * scaleX));
    const cy = Math.max(0, Math.round(crop.y * scaleY));
    const cw = Math.max(1, Math.round(crop.w * scaleX));
    const ch = Math.max(1, Math.round(crop.h * scaleY));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    canvas.getContext("2d").drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
    canvas.toBlob(blob => blob && onConfirm(blob), "image/jpeg", 0.92);
  };

  const L = (he, en, ar) => lang === "he" ? he : lang === "ar" ? ar : en;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 14, padding: 16,
    }}>
      <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>
        {L("חתוך תמונה", "Crop image", "اقتص الصورة")}
      </p>

      <div ref={containerRef} style={{ position: "relative", display: "inline-block", lineHeight: 0, maxWidth: "90vw", maxHeight: "65vh" }}>
        {imgSrc && (
          <img
            ref={imgRef}
            src={imgSrc}
            onLoad={initCrop}
            draggable={false}
            alt=""
            style={{ display: "block", maxWidth: "90vw", maxHeight: "65vh", userSelect: "none" }}
          />
        )}

        {crop && (
          <>
            {/* 4 dark overlay strips */}
            <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: crop.y, background: "rgba(0,0,0,0.62)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 0, top: crop.y + crop.h, right: 0, bottom: 0, background: "rgba(0,0,0,0.62)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 0, top: crop.y, width: crop.x, height: crop.h, background: "rgba(0,0,0,0.62)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: crop.x + crop.w, top: crop.y, right: 0, height: crop.h, background: "rgba(0,0,0,0.62)", pointerEvents: "none" }} />

            {/* Crop box + rule-of-thirds */}
            <div
              onMouseDown={e => startDrag(e, "move")}
              onTouchStart={e => startDrag(e, "move")}
              style={{
                position: "absolute", left: crop.x, top: crop.y, width: crop.w, height: crop.h,
                border: "2px solid rgba(255,255,255,0.9)", boxSizing: "border-box",
                cursor: "move", touchAction: "none",
              }}
            >
              {[33.3, 66.6].map(p => (
                <div key={p} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.28)", pointerEvents: "none" }} />
              ))}
              {[33.3, 66.6].map(p => (
                <div key={p} style={{ position: "absolute", top: `${p}%`, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.28)", pointerEvents: "none" }} />
              ))}
            </div>

            {/* Resize handles */}
            {HANDLES.map(h => {
              const [hx, hy] = getHandleOffset(h, crop);
              return (
                <div
                  key={h}
                  onMouseDown={e => startDrag(e, h)}
                  onTouchStart={e => startDrag(e, h)}
                  style={{
                    position: "absolute",
                    left: hx - 5, top: hy - 5,
                    width: 11, height: 11,
                    background: "white",
                    border: "1.5px solid rgba(0,0,0,0.4)",
                    borderRadius: 2,
                    cursor: HANDLE_CURSORS[h],
                    touchAction: "none",
                    zIndex: 1,
                  }}
                />
              );
            })}
          </>
        )}
      </div>

      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, margin: 0, textAlign: "center" }}>
        {L("גרור לשינוי מיקום · גרור פינות לשינוי גודל", "Drag to move · Drag corners or edges to resize", "اسحب للتحريك · اسحب الزوايا لتغيير الحجم")}
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{ padding: "8px 22px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}
        >
          {L("ביטול", "Cancel", "إلغاء")}
        </button>
        <button
          onClick={handleConfirm}
          style={{ padding: "8px 22px", borderRadius: 10, border: "none", background: "#4472b8", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}
        >
          {L("חתוך והעלה", "Crop & Upload", "اقتص وارفع")}
        </button>
      </div>
    </div>
  );
}

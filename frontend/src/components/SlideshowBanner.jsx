import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function SlideshowBanner() {
  const [images, setImages] = useState([]);
  const [idx, setIdx]       = useState(0);
  const timerRef            = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "siteSettings", "slideshow"), (snap) => {
      setImages(snap.exists() ? (snap.data().images || []) : []);
      setIdx(0);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  if (!images.length) return null;

  const go = (n) => {
    clearInterval(timerRef.current);
    setIdx((idx + n + images.length) % images.length);
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
  };

  return (
    <div style={{
      position: "relative", borderRadius: 16, overflow: "hidden",
      boxShadow: "0 4px 24px rgba(29,72,150,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
      background: "#1a1a1a",
      aspectRatio: "4/3",
      maxHeight: 300,
    }}>
      {images.map((img, i) => (
        <img
          key={img.url}
          src={img.url}
          alt={img.caption || ""}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            objectPosition: "center 25%",
            opacity: i === idx ? 1 : 0,
            transition: "opacity 0.7s ease",
          }}
        />
      ))}
      {images[idx]?.caption && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          padding: "1.5rem 1rem 0.75rem",
          color: "#fff", fontSize: 13, fontWeight: 600,
          textAlign: "center",
        }}>
          {images[idx].caption}
        </div>
      )}
      {images.length > 1 && (
        <>
          <button onClick={() => go(-1)} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.22)", border: "none", borderRadius: "50%",
            width: 34, height: 34, cursor: "pointer", color: "#fff", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}>‹</button>
          <button onClick={() => go(1)} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.22)", border: "none", borderRadius: "50%",
            width: 34, height: 34, cursor: "pointer", color: "#fff", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}>›</button>
          <div style={{
            position: "absolute", bottom: 10, left: 0, right: 0,
            display: "flex", justifyContent: "center", gap: 6,
          }}>
            {images.map((_, i) => (
              <button key={i} onClick={() => { clearInterval(timerRef.current); setIdx(i); }}
                style={{
                  width: i === idx ? 20 : 8, height: 8, borderRadius: 99,
                  background: i === idx ? "#fff" : "rgba(255,255,255,0.45)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all 0.3s ease",
                }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

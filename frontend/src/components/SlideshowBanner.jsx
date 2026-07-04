import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../LanguageContext";

export function SlideshowBanner({ maxHeight = 220 }) {
  const [images, setImages] = useState([]);
  const [idx, setIdx]       = useState(0);
  const timerRef            = useRef(null);
  const { lang }            = useLang();
  const isRTL               = lang === "he" || lang === "ar";

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

  const hasCaption = !!images[idx]?.caption;

  const go = (n) => {
    clearInterval(timerRef.current);
    setIdx((idx + n + images.length) % images.length);
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
  };

  const btnStyle = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.22)", border: "none", borderRadius: "50%",
    width: 34, height: 34, cursor: "pointer", color: "#fff", fontSize: 18,
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(4px)",
  };

  return (
    <div dir="ltr">
      {/* image area — dir:ltr prevents RTL page layout from physically flipping arrow positions */}
      <div style={{
        position: "relative",
        borderRadius: hasCaption ? "16px 16px 0 0" : 16,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(29,72,150,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
        background: "#1a1a1a",
        aspectRatio: "4/3",
        maxHeight,
        margin: "0 auto",
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

        {images.length > 1 && (
          <>
            {/* In RTL: left button = next (forward = leftward), shows › pointing into sequence */}
            <button onClick={() => go(isRTL ? 1 : -1)} style={{ ...btnStyle, left: 10 }}>
              {isRTL ? "›" : "‹"}
            </button>
            <button onClick={() => go(isRTL ? -1 : 1)} style={{ ...btnStyle, right: 10 }}>
              {isRTL ? "‹" : "›"}
            </button>
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

      {/* caption below */}
      {hasCaption && (
        <div style={{
          background: "var(--bg-secondary, #f5f5f5)",
          borderRadius: "0 0 16px 16px",
          padding: "0.6rem 1rem",
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-secondary, #555)",
          fontStyle: "italic",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {images[idx].caption}
        </div>
      )}
    </div>
  );
}

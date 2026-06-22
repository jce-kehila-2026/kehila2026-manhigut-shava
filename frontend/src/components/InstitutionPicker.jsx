import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../LanguageContext";
import { useTheme } from "../ThemeContext";
import { INSTITUTIONS_BY_LANG, translateInstitution } from "../utils/translateProfile";

async function gtrans(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data[0]?.map(s => s[0]).join("") || text;
}

async function translateAll(text) {
  const [he, en, ar] = await Promise.all([gtrans(text, "iw"), gtrans(text, "en"), gtrans(text, "ar")]);
  return { he, en, ar };
}

let cachedCustomInstitutions = null;

export default function InstitutionPicker({ value, translations, onChange, placeholder }) {
  const { lang, isRTL } = useLang();
  const { T } = useTheme();

  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const [custom, setCustom] = useState(cachedCustomInstitutions || []);
  const [adding, setAdding] = useState(false);
  const containerRef        = useRef();
  const inputRef            = useRef();

  useEffect(() => {
    if (cachedCustomInstitutions) return;
    getDocs(collection(db, "customInstitutions")).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedCustomInstitutions = list;
      setCustom(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const knownOptions = (INSTITUTIONS_BY_LANG[lang] || INSTITUTIONS_BY_LANG.he)
    .map((label, i) => ({
      label,
      enValue: INSTITUTIONS_BY_LANG.en[i],
      translations: {
        he: INSTITUTIONS_BY_LANG.he[i],
        en: INSTITUTIONS_BY_LANG.en[i],
        ar: INSTITUTIONS_BY_LANG.ar[i],
      },
    }));

  const customOptions = custom.map(c => ({
    label:        c[lang] || c.en || c.he || "",
    enValue:      c.en || c.he || "",
    translations: { he: c.he || "", en: c.en || "", ar: c.ar || "" },
    isCustom:     true,
  }));

  const allOptions = [...knownOptions, ...customOptions];

  const trimQ = query.trim();
  const filtered = trimQ
    ? allOptions.filter(o => o.label.toLowerCase().includes(trimQ.toLowerCase()))
    : allOptions;

  const exactMatch = allOptions.some(o => o.label.toLowerCase() === trimQ.toLowerCase());
  const showAdd    = trimQ && !exactMatch;

  const displayValue = translations?.[lang] || translateInstitution(value, lang) || value || "";

  const handleOpen = () => {
    setQuery("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = opt => {
    setOpen(false);
    setQuery("");
    onChange(opt.enValue, opt.translations);
  };

  const handleAdd = async () => {
    if (!trimQ || adding) return;
    setAdding(true);
    try {
      let t;
      try {
        t = await translateAll(trimQ);
      } catch {
        t = { he: trimQ, en: trimQ, ar: trimQ };
      }

      const entry = { he: t.he, en: t.en, ar: t.ar };
      cachedCustomInstitutions = [...(cachedCustomInstitutions || []), entry];
      setCustom(prev => [...prev, entry]);

      addDoc(collection(db, "customInstitutions"), { ...t, addedAt: serverTimestamp() })
        .catch(() => {});

      setOpen(false);
      setQuery("");
      onChange(t.en || trimQ, t);
    } finally {
      setAdding(false);
    }
  };

  const addLabel = lang === "he"
    ? (adding ? "מתרגם..." : `+ הוסף "${trimQ}"`)
    : lang === "ar"
    ? (adding ? "جاري الترجمة..." : `+ أضف "${trimQ}"`)
    : (adding ? "Translating..." : `+ Add "${trimQ}"`);

  const noResultsLabel = lang === "he" ? "אין תוצאות" : lang === "ar" ? "لا نتائج" : "No results";

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "12px 36px 12px 14px", fontSize: "14px",
    border: `1.5px solid ${open ? "#4472b8" : T.inputBorder}`,
    borderRadius: "13px",
    color: T.text,
    background: T.inputBg,
    fontFamily: "inherit",
    transition: "border-color 0.2s",
    direction: isRTL ? "rtl" : "ltr",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }} onClick={handleOpen}>
        <input
          ref={inputRef}
          value={open ? query : displayValue}
          onChange={e => setQuery(e.target.value)}
          onFocus={handleOpen}
          placeholder={open ? (lang === "he" ? "חפשי..." : lang === "ar" ? "ابحثي..." : "Search...") : (placeholder || "")}
          style={inputStyle}
          autoComplete="off"
        />
        <span style={{
          position: "absolute",
          [isRTL ? "left" : "right"]: 12,
          top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", opacity: 0.4, fontSize: 11,
          transition: "transform 0.2s",
          display: "inline-block",
          ...(open ? { transform: "translateY(-50%) rotate(180deg)" } : {}),
        }}>▾</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)",
          left: 0, right: 0, zIndex: 300,
          background: T.inputBg,
          border: `1.5px solid #4472b8`,
          borderRadius: 13,
          maxHeight: 230, overflowY: "auto",
          boxShadow: "0 6px 24px rgba(68,114,184,0.15)",
          direction: isRTL ? "rtl" : "ltr",
        }}>
          {filtered.map((opt, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(opt); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                width: "100%", textAlign: isRTL ? "right" : "left",
                padding: "10px 14px", background: "none", border: "none",
                borderBottom: i < filtered.length - 1 ? `1px solid ${T.inputBorder}` : "none",
                cursor: "pointer", fontSize: 14, color: T.text, fontFamily: "inherit",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(68,114,184,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              {opt.label}
              {opt.isCustom && (
                <span style={{ fontSize: 10, opacity: 0.45, marginInlineStart: "auto" }}>★</span>
              )}
            </button>
          ))}

          {filtered.length === 0 && !showAdd && (
            <div style={{ padding: "10px 14px", fontSize: 13, opacity: 0.45, direction: isRTL ? "rtl" : "ltr" }}>
              {noResultsLabel}
            </div>
          )}

          {showAdd && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleAdd(); }}
              disabled={adding}
              style={{
                display: "block", width: "100%", textAlign: isRTL ? "right" : "left",
                padding: "10px 14px", background: "rgba(68,114,184,0.08)",
                border: "none",
                borderTop: filtered.length > 0 ? `1px solid ${T.inputBorder}` : "none",
                cursor: adding ? "wait" : "pointer",
                fontSize: 14, color: "#4472b8", fontFamily: "inherit", fontWeight: 600,
              }}
            >
              {addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

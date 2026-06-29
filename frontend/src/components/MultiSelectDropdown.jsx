import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../ThemeContext";
import { useLang } from "../LanguageContext";

/**
 * options: string[] | {value: string, label: string}[]
 * selectedValues: string[]   (the "value" field, or the string itself)
 * onChange: (string[]) => void
 */
export default function MultiSelectDropdown({ options = [], selectedValues = [], onChange, disabled, placeholder }) {
  const { T } = useTheme();
  const { isRTL } = useLang();
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState(null);
  const triggerRef = useRef(null);

  const normalized = options.map(o =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (!e.target.closest("[data-portal-multiselect]") && !triggerRef.current?.contains(e.target))
        setOpen(false);
    };
    const esc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxH = Math.min(280, (openAbove ? spaceAbove : spaceBelow) - 8);
    setDropPos({
      left: rect.left, width: rect.width, maxH,
      ...(openAbove ? { bottom: window.innerHeight - rect.top + 2 } : { top: rect.bottom + 2 }),
    });
    setOpen(true);
  };

  const toggle = (value) => {
    if (disabled) return;
    const next = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(next);
  };

  const displayText = selectedValues.length === 0
    ? (placeholder || "—")
    : normalized.filter(o => selectedValues.includes(o.value)).map(o => o.label).join(", ");

  return (
    <div ref={triggerRef}>
      <button
        type="button"
        className="profile-input support-input"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : handleOpen()}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 14px", fontSize: "13px",
          border: `1.5px solid ${open ? "#4472b8" : "var(--border)"}`, borderRadius: "13px",
          color: selectedValues.length ? "var(--text-primary)" : "var(--text-muted)",
          background: "var(--bg-secondary)", fontFamily: "inherit",
          direction: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border-color 0.2s",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayText}
        </span>
        <span style={{ opacity: 0.4, fontSize: 11, flexShrink: 0, marginInlineStart: 8, display: "inline-block", transition: "transform 0.2s", ...(open ? { transform: "rotate(180deg)" } : {}) }}>▾</span>
      </button>

      {open && dropPos && createPortal(
        <div
          data-portal-multiselect="true"
          style={{
            position: "fixed",
            left: dropPos.left, width: dropPos.width,
            maxHeight: dropPos.maxH,
            ...(dropPos.top !== undefined ? { top: dropPos.top } : { bottom: dropPos.bottom }),
            zIndex: 99999,
            background: "var(--bg-primary)",
            border: "1.5px solid #4472b8",
            borderRadius: 13,
            boxShadow: "0 6px 24px rgba(68,114,184,0.18)",
            overflowY: "auto",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {normalized.map((opt, i) => {
            const checked = selectedValues.includes(opt.value);
            return (
              <button
                key={i}
                type="button"
                onMouseDown={e => { e.preventDefault(); toggle(opt.value); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 14px",
                  background: checked ? "rgba(68,114,184,0.1)" : "none",
                  border: "none",
                  borderBottom: i < normalized.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer", fontSize: 13,
                  color: checked ? "#4472b8" : "var(--text-primary)",
                  fontFamily: "inherit", fontWeight: checked ? 700 : 400,
                  textAlign: isRTL ? "right" : "left",
                }}
                onMouseEnter={e => { if (!checked) e.currentTarget.style.background = "rgba(68,114,184,0.07)"; }}
                onMouseLeave={e => { if (!checked) e.currentTarget.style.background = "none"; }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${checked ? "#4472b8" : "var(--border)"}`,
                  background: checked ? "#4472b8" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

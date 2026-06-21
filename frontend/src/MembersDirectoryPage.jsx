import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";
import { useTheme } from "./ThemeContext";

/* ─── Avatar ─── */
function MemberAvatar({ url, name, size = 46 }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: url ? "transparent" : "linear-gradient(135deg,#1d4896,#4472b8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
      }}
    >
      {url
        ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        : <span style={{ color: "#fff", fontSize: size * 0.36, fontWeight: 700 }}>{initials}</span>
      }
    </div>
  );
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div style={{
      background: "var(--bg-primary)", border: "1.5px solid var(--border)",
      borderInlineStart: "4px solid var(--border)", borderRadius: 18, padding: "1.5rem",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {[64, "70%", "50%", "40%", "60%"].map((w, i) => (
        <div key={i} style={{
          width: i === 0 ? w : w, height: i === 0 ? 64 : 13,
          borderRadius: i === 0 ? "50%" : 6,
          background: "var(--border)",
          animation: "dirPulse 1.4s ease-in-out infinite",
          ...(i === 0 ? { alignSelf: "center" } : {}),
        }} />
      ))}
    </div>
  );
}

/* ─── Card (grid view) ─── */
function MemberCard({ member, onViewProfile, t, dark }) {
  const url = member.photoURL || member.avatarUrl || null;
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const role = member.currentRole || null;

  return (
    <div
      className="dir-card"
      style={{
        background: "var(--bg-primary)", border: "1.5px solid var(--border)",
        borderInlineStart: "4px solid #4472b8", borderRadius: 18, padding: "1.5rem",
        display: "flex", flexDirection: "column", gap: "0.75rem",
        boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <MemberAvatar url={url} name={fullName} size={48} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {fullName || "—"}
          </p>
          {role && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {role}
            </p>
          )}
        </div>
      </div>

      {(member.region || member.city) && (
        <span style={{
          fontSize: 12, color: dark ? "#7aaecc" : "#1d4896",
          background: dark ? "rgba(68,114,184,0.16)" : "#daeaf8",
          border: `1px solid ${dark ? "rgba(68,114,184,0.3)" : "#c8e0f4"}`,
          borderRadius: 99, padding: "2px 10px",
          alignSelf: "flex-start", display: "inline-block",
        }}>
          {member.region || member.city}
        </span>
      )}

      {member.helpAreas?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {member.helpAreas.slice(0, 2).map((a) => (
            <span key={a} style={{
              fontSize: 10,
              background: dark ? "rgba(68,114,184,0.14)" : "#f0f6fb",
              color: dark ? "#7aaecc" : "#4472b8",
              borderRadius: 99, padding: "2px 8px",
              border: `1px solid ${dark ? "rgba(68,114,184,0.28)" : "#daeaf8"}`,
            }}>
              {a.split(" - ")[0]}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => onViewProfile(member.id)}
        style={{
          marginTop: "auto", width: "100%", padding: "9px 0",
          borderRadius: 12, border: "1.5px solid var(--border)",
          background: "var(--bg-secondary)", color: "var(--text-primary)",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.borderColor = "#4472b8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        {t.directory.viewProfile}
      </button>
    </div>
  );
}

/* ─── Row (list view) ─── */
function MemberRow({ member, onViewProfile, t, dark }) {
  const url = member.photoURL || member.avatarUrl || null;
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const role = member.currentRole || null;

  return (
    <div
      style={{
        background: "var(--bg-primary)", border: "1.5px solid var(--border)",
        borderInlineStart: "4px solid #4472b8", borderRadius: 14,
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 2px 8px rgba(29,72,150,0.05)",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(29,72,150,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(29,72,150,0.05)"; }}
    >
      <MemberAvatar url={url} name={fullName} size={42} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {fullName || "—"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[role, member.region || member.city].filter(Boolean).join(" · ")}
        </div>
      </div>

      <button
        onClick={() => onViewProfile(member.id)}
        style={{
          flexShrink: 0, padding: "7px 16px", borderRadius: 10,
          border: "1.5px solid var(--border)", background: "var(--bg-secondary)",
          color: "var(--text-primary)", fontWeight: 600, fontSize: 12,
          cursor: "pointer", whiteSpace: "nowrap",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.borderColor = "#4472b8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        {t.directory.viewProfile}
      </button>
    </div>
  );
}

/* ─── Main ─── */
export default function MembersDirectoryPage({ onViewProfile }) {
  const { user } = useAuth();
  const { t, isRTL } = useLang();
  const { dark } = useTheme();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("emailVerified", "==", true)
        );
        const snap = await getDocs(q);
        if (!active) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));
        setMembers(list);
      } catch (err) {
        console.error("MembersDirectory fetch error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const REGIONS = t.profile.regionOptions;

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return members.filter((m) => {
      const fullName = [m.firstName, m.lastName].filter(Boolean).join(" ").toLowerCase();
      if (q && !fullName.includes(q)
        && !(m.currentRole || "").toLowerCase().includes(q)
        && !(m.city || "").toLowerCase().includes(q)
        && !(m.region || "").toLowerCase().includes(q)) return false;
      if (regionFilter && m.region !== regionFilter) return false;
      return true;
    });
  }, [members, searchText, regionFilter]);

  const pillStyle = (active) => ({
    padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: active ? 700 : 500,
    border: `1.5px solid ${active ? "#4472b8" : "var(--border)"}`,
    background: active ? (dark ? "rgba(68,114,184,0.22)" : "#daeaf8") : "var(--bg-primary)",
    color: active ? (dark ? "#7aaecc" : "#1d4896") : "var(--text-secondary)",
    cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
  });

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        width: "100%", height: "100%",
        overflowY: "auto", overflowX: "hidden",
        background: "var(--bg-secondary)",
        fontFamily: "var(--font,'Figtree','Heebo',system-ui,sans-serif)",
      }}
    >
      <style>{`
        @keyframes dirPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        .dir-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(29,72,150,0.12) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "var(--bg-primary)", borderBottom: "1.5px solid var(--border)",
        padding: "28px 24px 20px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
            {t.directory.title}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            {loading ? t.common.loading : t.directory.memberCount(members.length)}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 48px" }}>

        {/* Search + filter card */}
        <div style={{
          background: "var(--bg-primary)", borderRadius: 18, padding: "1.5rem",
          border: "1.5px solid var(--border)", borderInlineStart: "4px solid #4472b8",
          boxShadow: "0 2px 8px rgba(29,72,150,0.05)", marginBottom: "1.5rem",
        }}>
          {/* Search input */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{
              position: "absolute", insetInlineStart: 14, top: "50%",
              transform: "translateY(-50%)", fontSize: 15, color: "var(--text-muted)", pointerEvents: "none",
            }}></span>
            <input
              type="text"
              placeholder={t.directory.searchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "11px 14px 11px 42px",
                borderRadius: 13, border: "1.5px solid var(--border)",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                fontSize: 14, outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                fontFamily: "inherit", direction: isRTL ? "rtl" : "ltr",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#4472b8"; e.target.style.boxShadow = "0 0 0 3px rgba(68,114,184,0.14)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Filters row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>

            {/* Region dropdown */}
            <div style={{ position: "relative" }}>
              <button style={pillStyle(!!regionFilter)} onClick={() => setShowRegionDropdown((v) => !v)}>
                {regionFilter ? t.directory.regionLabel(regionFilter) : t.directory.filterRegion}
              </button>
              {showRegionDropdown && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)",
                  insetInlineStart: 0, zIndex: 50,
                  background: "var(--bg-primary)", border: "1.5px solid var(--border)",
                  borderRadius: 14, boxShadow: "0 8px 28px rgba(29,72,150,0.14)",
                  minWidth: 170, overflow: "hidden",
                  animation: "dirPulse 0s", // reset — just for mount
                }}>
                  <button
                    onClick={() => { setRegionFilter(""); setShowRegionDropdown(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "inherit",
                      padding: "9px 16px", border: "none", borderBottom: "1px solid var(--border)",
                      background: !regionFilter ? (dark ? "rgba(68,114,184,0.18)" : "#eef4ff") : "transparent",
                      color: !regionFilter ? (dark ? "#7aaecc" : "#1d4896") : "var(--text-primary)",
                      fontSize: 13, cursor: "pointer", fontWeight: !regionFilter ? 700 : 400,
                      fontFamily: "inherit",
                    }}
                  >
                    {t.directory.allRegions}
                  </button>
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRegionFilter(r); setShowRegionDropdown(false); }}
                      style={{
                        display: "block", width: "100%", textAlign: "inherit",
                        padding: "9px 16px", border: "none", borderBottom: "1px solid var(--border)",
                        background: regionFilter === r ? (dark ? "rgba(68,114,184,0.18)" : "#eef4ff") : "transparent",
                        color: regionFilter === r ? (dark ? "#7aaecc" : "#1d4896") : "var(--text-primary)",
                        fontSize: 13, cursor: "pointer", fontWeight: regionFilter === r ? 700 : 400,
                        fontFamily: "inherit",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View toggle */}
            <div style={{ marginInlineStart: "auto", display: "flex", gap: 4, background: "var(--bg-secondary)", borderRadius: 10, padding: 3, border: "1.5px solid var(--border)" }}>
              {[
                { mode: "grid", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: t.directory.viewGrid },
                { mode: "list", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, label: t.directory.viewList },
              ].map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  title={label}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: 8, border: "none",
                    background: viewMode === mode ? "#4472b8" : "transparent",
                    color: viewMode === mode ? "#fff" : "var(--text-muted)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
            {filtered.length === members.length
              ? t.directory.results(filtered.length)
              : t.directory.resultsFiltered(filtered.length, members.length)}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--text-muted)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 14, color: "var(--text-muted)" }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
              {t.directory.noResults}
            </div>
            <div style={{ fontSize: 13 }}>{t.directory.noResultsSub}</div>
            {(searchText || regionFilter) && (
              <button
                onClick={() => { setSearchText(""); setRegionFilter(""); }}
                style={{
                  marginTop: 18, padding: "9px 22px", borderRadius: 12,
                  border: "1.5px solid #4472b8", background: "transparent",
                  color: "#4472b8", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t.directory.clearFilters}
              </button>
            )}
          </div>
        )}

        {/* Grid view */}
        {!loading && filtered.length > 0 && viewMode === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} onViewProfile={onViewProfile} t={t} dark={dark} />
            ))}
          </div>
        )}

        {/* List view */}
        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((m) => (
              <MemberRow key={m.id} member={m} onViewProfile={onViewProfile} t={t} dark={dark} />
            ))}
          </div>
        )}
      </div>

      {showRegionDropdown && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowRegionDropdown(false)} />
      )}
    </div>
  );
}

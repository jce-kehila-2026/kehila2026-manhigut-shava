import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useLang } from "./LanguageContext";

/* ─── Avatar color helper ─── */
function avatarColor(name) {
  const colors = ["#4472b8", "#e8735a", "#6da3d4", "#f5a08c", "#5a8a6a", "#b8844a"];
  let h = 0;
  for (const c of (name || "")) h = c.charCodeAt(0) + h * 31;
  return colors[Math.abs(h) % colors.length];
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─── Avatar component ─── */
function Avatar({ url, name, size = 48 }) {
  const bg = avatarColor(name);
  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  };
  if (url) return <img src={url} alt={name || ""} style={base} />;
  return (
    <div
      style={{
        ...base,
        background: `linear-gradient(135deg, ${bg}, ${avatarColor((name || "").split("").reverse().join(""))})`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        userSelect: "none",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ─── Badge ─── */
function RoleBadge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: color + "22",
        color: color,
        border: `1px solid ${color}44`,
        marginInlineEnd: 4,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--border)",
          animation: "pulse 1.4s ease-in-out infinite",
        }}
      />
      <div style={{ width: "70%", height: 14, borderRadius: 6, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite" }} />
      <div style={{ width: "50%", height: 12, borderRadius: 6, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite" }} />
      <div style={{ width: "40%", height: 12, borderRadius: 6, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite" }} />
      <div style={{ width: "60%", height: 30, borderRadius: 8, background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite", marginTop: 4 }} />
    </div>
  );
}

/* ─── Member grid card ─── */
function MemberCard({ member, onViewProfile, t }) {
  const avatarUrl = member.photoURL || member.avatarUrl || null;
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        transition: "box-shadow 0.18s, transform 0.18s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(26,58,143,0.13)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      <Avatar url={avatarUrl} name={fullName} size={64} />

      <div style={{ textAlign: "center", width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 3 }}>
          {fullName || "—"}
        </div>
        {member.profession && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 2 }}>
            {member.profession}
          </div>
        )}
        {(member.city || member.region) && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span>📍</span>
            <span>{[member.city, member.region].filter(Boolean).join(" · ")}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, minHeight: 22 }}>
        {member.isMentor && <RoleBadge label={t.directory.roleMentor} color="#1a3a8f" />}
        {member.isMentee && <RoleBadge label={t.directory.roleMentee} color="#5a8a6a" />}
      </div>

      <button
        onClick={() => onViewProfile(member.id)}
        style={{
          marginTop: 4,
          width: "100%",
          padding: "8px 0",
          borderRadius: 8,
          border: "1.5px solid #1a3a8f",
          background: "transparent",
          color: "#1a3a8f",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#1a3a8f";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#1a3a8f";
        }}
      >
        {t.directory.viewProfile}
      </button>
    </div>
  );
}

/* ─── Member list row ─── */
function MemberRow({ member, onViewProfile, t }) {
  const avatarUrl = member.photoURL || member.avatarUrl || null;
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(26,58,143,0.10)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <Avatar url={avatarUrl} name={fullName} size={44} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {fullName || "—"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[member.profession, member.city].filter(Boolean).join(" · ")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {member.isMentor && <RoleBadge label={t.directory.roleMentor} color="#1a3a8f" />}
        {member.isMentee && <RoleBadge label={t.directory.roleMentee} color="#5a8a6a" />}
      </div>

      <button
        onClick={() => onViewProfile(member.id)}
        style={{
          flexShrink: 0,
          padding: "6px 14px",
          borderRadius: 7,
          border: "1.5px solid #1a3a8f",
          background: "transparent",
          color: "#1a3a8f",
          fontWeight: 600,
          fontSize: 12,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#1a3a8f";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#1a3a8f";
        }}
      >
        {t.directory.viewProfile}
      </button>
    </div>
  );
}

/* ─── Main component ─── */
export default function MembersDirectoryPage({ onViewProfile }) {
  const { user } = useAuth();
  const { t, isRTL } = useLang();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | "mentor" | "mentee"
  const [regionFilter, setRegionFilter] = useState("");
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  /* Fetch members */
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("emailVerified", "==", true),
          orderBy("firstName")
        );
        const snap = await getDocs(q);
        if (!active) return;
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMembers(data);
      } catch (err) {
        console.error("MembersDirectory fetch error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  /* Use translated region options from profile translations */
  const REGIONS = t.profile.regionOptions;

  /* Filtered members */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return members.filter((m) => {
      const fullName = [m.firstName, m.lastName].filter(Boolean).join(" ").toLowerCase();
      if (q && !fullName.includes(q) && !(m.profession || "").toLowerCase().includes(q) && !(m.city || "").toLowerCase().includes(q)) {
        return false;
      }
      if (roleFilter === "mentor" && !m.isMentor) return false;
      if (roleFilter === "mentee" && !m.isMentee) return false;
      if (regionFilter && m.region !== regionFilter) return false;
      return true;
    });
  }, [members, searchText, roleFilter, regionFilter]);

  /* Pill button style */
  const pillStyle = (active) => ({
    padding: "6px 16px",
    borderRadius: 20,
    border: `1.5px solid ${active ? "#1a3a8f" : "var(--border)"}`,
    background: active ? "#1a3a8f" : "var(--bg-secondary)",
    color: active ? "#fff" : "var(--text-secondary)",
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        padding: "0 0 48px",
      }}
    >
      {/* Keyframe injection */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          padding: "28px 24px 20px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
            {t.directory.title}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            {loading ? t.common.loading : t.directory.memberCount(members.length)}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 0" }}>

        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span
            style={{
              position: "absolute",
              insetInlineStart: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder={t.directory.searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "11px 16px 11px 42px",
              borderRadius: 10,
              border: "1.5px solid var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#1a3a8f"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Filters row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <button style={pillStyle(roleFilter === "all")} onClick={() => setRoleFilter("all")}>
            {t.directory.filterAll}
          </button>
          <button style={pillStyle(roleFilter === "mentor")} onClick={() => setRoleFilter("mentor")}>
            {t.directory.filterMentor}
          </button>
          <button style={pillStyle(roleFilter === "mentee")} onClick={() => setRoleFilter("mentee")}>
            {t.directory.filterMentee}
          </button>

          {/* Region dropdown */}
          <div style={{ position: "relative" }}>
            <button
              style={pillStyle(!!regionFilter)}
              onClick={() => setShowRegionDropdown((v) => !v)}
            >
              {regionFilter ? t.directory.regionLabel(regionFilter) : t.directory.filterRegion}
            </button>
            {showRegionDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  insetInlineStart: 0,
                  zIndex: 50,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
                  minWidth: 160,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => { setRegionFilter(""); setShowRegionDropdown(false); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "inherit",
                    padding: "9px 16px",
                    border: "none",
                    background: !regionFilter ? "#1a3a8f11" : "transparent",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: !regionFilter ? 700 : 400,
                  }}
                >
                  {t.directory.allRegions}
                </button>
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRegionFilter(r); setShowRegionDropdown(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "inherit",
                      padding: "9px 16px",
                      border: "none",
                      background: regionFilter === r ? "#1a3a8f11" : "transparent",
                      color: regionFilter === r ? "#1a3a8f" : "var(--text-primary)",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: regionFilter === r ? 700 : 400,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spacer + view toggle */}
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
            <button
              title={t.directory.viewGrid}
              onClick={() => setViewMode("grid")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1.5px solid ${viewMode === "grid" ? "#1a3a8f" : "var(--border)"}`,
                background: viewMode === "grid" ? "#1a3a8f" : "var(--bg-secondary)",
                color: viewMode === "grid" ? "#fff" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ▦
            </button>
            <button
              title={t.directory.viewList}
              onClick={() => setViewMode("list")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1.5px solid ${viewMode === "list" ? "#1a3a8f" : "var(--border)"}`,
                background: viewMode === "list" ? "#1a3a8f" : "var(--bg-secondary)",
                color: viewMode === "list" ? "#fff" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            {filtered.length === members.length
              ? t.directory.results(filtered.length)
              : t.directory.resultsFiltered(filtered.length, members.length)}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "64px 24px",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
              {t.directory.noResults}
            </div>
            <div style={{ fontSize: 14 }}>
              {t.directory.noResultsSub}
            </div>
            {(searchText || roleFilter !== "all" || regionFilter) && (
              <button
                onClick={() => { setSearchText(""); setRoleFilter("all"); setRegionFilter(""); }}
                style={{
                  marginTop: 20,
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1.5px solid #1a3a8f",
                  background: "transparent",
                  color: "#1a3a8f",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t.directory.clearFilters}
              </button>
            )}
          </div>
        )}

        {/* Grid view */}
        {!loading && filtered.length > 0 && viewMode === "grid" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} onViewProfile={onViewProfile} t={t} />
            ))}
          </div>
        )}

        {/* List view */}
        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((m) => (
              <MemberRow key={m.id} member={m} onViewProfile={onViewProfile} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* Close region dropdown on outside click */}
      {showRegionDropdown && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={() => setShowRegionDropdown(false)}
        />
      )}
    </div>
  );
}

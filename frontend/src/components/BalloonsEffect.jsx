import { useEffect, useState } from "react";

const BALLOON_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff922b", "#cc5de8", "#f06595", "#74c0fc"];
const COUNT = 18;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function makeBalloon(i) {
  return {
    id: i,
    left: randomBetween(3, 97),
    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
    size: randomBetween(28, 46),
    delay: randomBetween(0, 1.2),
    duration: randomBetween(2.2, 3.6),
    sway: randomBetween(-40, 40),
  };
}

export function BalloonsEffect({ onDone }) {
  const [balloons] = useState(() => Array.from({ length: COUNT }, (_, i) => makeBalloon(i)));

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none",
      zIndex: 99999, overflow: "hidden",
    }}>
      <style>{`
        @keyframes balloon-rise {
          0%   { transform: translateY(110vh) translateX(0)    rotate(-4deg); opacity: 1; }
          40%  { transform: translateY(55vh)  translateX(var(--sway))  rotate(4deg); opacity: 1; }
          80%  { transform: translateY(5vh)   translateX(calc(var(--sway) * -0.5)) rotate(-3deg); opacity: 0.85; }
          100% { transform: translateY(-15vh) translateX(0)    rotate(2deg); opacity: 0; }
        }
      `}</style>
      {balloons.map(b => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: `${b.left}%`,
            bottom: "-10%",
            "--sway": `${b.sway}px`,
            animation: `balloon-rise ${b.duration}s ${b.delay}s ease-in forwards`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Balloon oval */}
          <svg width={b.size} height={b.size * 1.25} viewBox="0 0 40 50" fill="none">
            <ellipse cx="20" cy="22" rx="18" ry="20" fill={b.color} opacity="0.92" />
            <ellipse cx="13" cy="14" rx="5" ry="4" fill="rgba(255,255,255,0.28)" />
            <path d="M20 42 Q18 46 20 50 Q22 46 20 42Z" fill={b.color} opacity="0.8" />
          </svg>
          {/* String */}
          <svg width="2" height={b.size * 0.8} viewBox={`0 0 2 ${b.size * 0.8}`}>
            <line x1="1" y1="0" x2="1" y2={b.size * 0.8} stroke={b.color} strokeWidth="1.2" opacity="0.6" />
          </svg>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => window.innerWidth <= 1200 && window.innerWidth > 960);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1200px) and (min-width: 961px)");
    const handler = (e) => setIsTablet(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isTablet;
}

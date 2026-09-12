import { useEffect } from "react";

// اسکرول نرم سینمایی برای حس گالری هنری — فقط دسکتاپ؛ روی موبایل اسکرول بومی روان است.
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let current = window.scrollY;
    let target = current;
    let raf = null;

    // اگر کرسر روی یک کانتینر اسکرول‌پذیر داخلی است، تداخل نکنیم
    function insideScrollable(el) {
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) return true;
        el = el.parentElement;
      }
      return false;
    }

    function maxScroll() {
      return document.documentElement.scrollHeight - window.innerHeight;
    }

    function step() {
      const diff = target - current;
      if (Math.abs(diff) < 0.5) {
        current = target;
        raf = null;
        window.scrollTo({ top: current, behavior: "instant" });
        return;
      }
      current += diff * 0.085;
      window.scrollTo({ top: current, behavior: "instant" });
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(step);
    }

    function onWheel(e) {
      if (e.ctrlKey) return; // زوم مرورگر
      if (document.body.style.overflow === "hidden") return; // مودال/لایت‌باکس باز است
      if (insideScrollable(e.target)) return;
      e.preventDefault();
      target = Math.max(0, Math.min(maxScroll(), target + e.deltaY));
      start();
    }

    // اسکرول با کیبورد/لنگرها را همگام نگه می‌داریم
    function onScroll() {
      if (!raf) {
        current = window.scrollY;
        target = current;
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
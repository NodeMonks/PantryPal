import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // must be imported before any component that uses useTranslation
import { DevErrorBoundary } from "./components/DevErrorBoundary";
import { registerSW } from "virtual:pwa-register";

// Register Service Worker for PWA
if (typeof window !== "undefined") {
  registerSW({
    onNeedRefresh() {
      // Could show a notification to the user here
      console.log("PWA: New content available, please refresh.");
    },
    onOfflineReady() {
      console.log("PWA: App ready for offline use.");
    },
  });
}

// --- Lenis smooth scroll integration ---
import Lenis from "lenis";

const lenis = new Lenis({
  duration: 1.2,
  orientation: "vertical",
  gestureOrientation: "vertical",
});

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

createRoot(document.getElementById("root")!).render(
  import.meta.env.DEV ? (
    <DevErrorBoundary>
      <App />
    </DevErrorBoundary>
  ) : (
    <App />
  ),
);

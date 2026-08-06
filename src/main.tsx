import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Clean up the old Turbo COOP/COEP service worker if it was ever registered.
try {
  localStorage.removeItem("vg.turbo");
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  }
} catch { /* */ }

createRoot(document.getElementById("root")!).render(<App />);

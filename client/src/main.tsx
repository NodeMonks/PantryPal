import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DevErrorBoundary } from "./components/DevErrorBoundary";

createRoot(document.getElementById("root")!).render(
  import.meta.env.DEV ? (
    <DevErrorBoundary>
      <App />
    </DevErrorBoundary>
  ) : (
    <App />
  )
);

import "./global.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App"; // ← Без расширения — правильно, TS сам найдёт .tsx
import "./i18n";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element. Check index.html");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

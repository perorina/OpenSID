import React from "react";
import { hydrateRoot } from "react-dom/client";
import App from "./App";
import type { PageRoute } from "./App";
import type { PublicInitialData } from "./api";
import "./styles.css";

declare global {
  interface Window {
    __YMS_INITIAL_DATA__?: PublicInitialData;
    __YMS_INITIAL_ROUTE__?: PageRoute;
  }
}

hydrateRoot(
  document.getElementById("root")!,
  <React.StrictMode>
    <App initialData={window.__YMS_INITIAL_DATA__} initialRoute={window.__YMS_INITIAL_ROUTE__} />
  </React.StrictMode>,
);

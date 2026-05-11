import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { VortexV2 } from "./VortexV2";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("missing #root element");

createRoot(rootEl).render(
  <StrictMode>
    <VortexV2 />
  </StrictMode>,
);

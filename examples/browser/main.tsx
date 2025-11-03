import React from "react";
import { createRoot } from "react-dom/client";
import { DialogueExample } from "../../src/react/DialogueExample.js";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element not found");
}

const root = createRoot(rootEl);
root.render(
  <React.StrictMode>
    <DialogueExample />
  </React.StrictMode>
);


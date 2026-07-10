import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { TextCreator } from "./index";
import { PreviewPage } from "./preview-page";

import "@/vendor/styles/tokens/index.css";
import "./dev.css";

const isPreview = window.location.pathname === "/preview";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<StrictMode>
  {
    isPreview ?
      <PreviewPage /> :
      <TextCreator localUsed />
  }
</StrictMode>);

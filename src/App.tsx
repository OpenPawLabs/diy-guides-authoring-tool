import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { BrowserGate } from "./components/BrowserGate";
import { GuideEditorRoute } from "./pages/GuideEditorRoute";
import { GuideFullPreviewRoute } from "./pages/GuideFullPreviewRoute";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <HashRouter>
      <BrowserGate>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide/:id/preview" element={<GuideFullPreviewRoute />} />
          <Route path="/guide/:id" element={<GuideEditorRoute />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </BrowserGate>
    </HashRouter>
  );
}

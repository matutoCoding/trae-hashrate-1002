import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import PatternAnalysis from "@/pages/PatternAnalysis";
import WeaveCoding from "@/pages/WeaveCoding";
import StepDiagram from "@/pages/StepDiagram";
import MaterialList from "@/pages/MaterialList";
import TemplateLibrary from "@/pages/TemplateLibrary";
import { useWeaveStore } from "@/store/weaveStore";

export default function App() {
  const initTemplates = useWeaveStore((s) => s.initTemplates);

  useEffect(() => {
    initTemplates();
  }, [initTemplates]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PatternAnalysis />} />
          <Route path="/coding" element={<WeaveCoding />} />
          <Route path="/steps" element={<StepDiagram />} />
          <Route path="/materials" element={<MaterialList />} />
          <Route path="/templates" element={<TemplateLibrary />} />
        </Route>
      </Routes>
    </Router>
  );
}

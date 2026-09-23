import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { Dashboard } from "./pages/Dashboard";
import { Generate } from "./pages/Generate";
import { Review } from "./pages/Review";
import { Sources } from "./pages/Sources";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="bronnen" element={<Sources />} />
          <Route path="genereren" element={<Generate />} />
          <Route path="review" element={<Review />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

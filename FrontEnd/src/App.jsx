import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import EditProfilePage from "./pages/EditProfilePage";
import SavedItinerariesPage from "./pages/SavedItinerariesPage";
import RouteDemoPage from "./pages/RouteDemoPage";
import Toast from "./components/Toast";
import { useToast } from "./context/ToastContext";

export default function App() {
  const { toast, hideToast } = useToast();

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/itineraries" element={<SavedItinerariesPage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/demo/route" element={<RouteDemoPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    </>
  );
}

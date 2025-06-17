import ProtectedRoute from "../components/ProtectedRoute";
import ServicosManager from "../components/ServicosManager";

export default function ServicosPage() {
  return (
    <ProtectedRoute>
      <ServicosManager />
    </ProtectedRoute>
  );
}
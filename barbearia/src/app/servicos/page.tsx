import ProtectedRoute from "../components/ProtectedRoute";
import ServicosManager from "../components/ServicosManager";

export default function ServicosPage() {
  return (
    <ProtectedRoute>
      <p className="text-black text-2xl font-bold mb-5">Serviços</p>
      <ServicosManager />
    </ProtectedRoute>
  );
}
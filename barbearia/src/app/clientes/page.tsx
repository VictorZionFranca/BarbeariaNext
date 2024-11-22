import ProtectedRoute from "../components/ProtectedRoute";

export default function ClientesPage() {
  return (
    <ProtectedRoute>
      <div className="text-black">
        <h1 className="text-2xl font-bold mb-4">Clientes</h1>
        <p>Gerencie seus clientes nesta página.</p>
      </div>
    </ProtectedRoute>
  );
}

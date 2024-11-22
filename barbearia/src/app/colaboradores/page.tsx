import ProtectedRoute from "../components/ProtectedRoute";

export default function ColaboradoresPage() {
  return (
    <ProtectedRoute>
      <div className="text-black">
        <h1 className="text-2xl font-bold mb-4">Colaboradores</h1>
        <p>Gerencie seus colaboradores nesta página.</p>
      </div>
    </ProtectedRoute>
  );
}

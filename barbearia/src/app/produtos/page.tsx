import ProtectedRoute from "../components/ProtectedRoute";

export default function ProdutosPage() {
  return (
    <ProtectedRoute>
      <div className="text-black">
        <h1 className="text-2xl font-bold mb-4">Produtos</h1>
        <p>Gerencie os produtos disponíveis na barbearia.</p>
      </div>
    </ProtectedRoute>
  );
}

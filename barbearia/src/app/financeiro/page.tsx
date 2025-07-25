import ProtectedRoute from "../components/ProtectedRoute";

export default function FinanceiroPage() {
  return (
    <ProtectedRoute>
      <div className="text-black">
        <h1 className="text-2xl font-bold mb-4">Financeiro</h1>
        <p>Gerencie as finanças da barbearia.</p>
      </div>
    </ProtectedRoute>
  );
}

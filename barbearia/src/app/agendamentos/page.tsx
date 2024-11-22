import ProtectedRoute from "../components/ProtectedRoute";

export default function AgendamentosPage() {
    return (
      <ProtectedRoute>
      <div className="text-black">
        <h1 className="text-2xl font-bold mb-4">Agendamentos</h1>
        <p>Bem-vindo à página de agendamentos!</p>
      </div>
      </ProtectedRoute>
    );
  }
  
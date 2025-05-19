import ProtectedRoute from "../components/ProtectedRoute";
import Calendario from "../components/Calendario";

export default function AgendamentosPage() {
  return (
    <ProtectedRoute>
      <div className="text-black p-4">
        <h1 className="text-2xl font-bold mb-4">Agendamentos</h1>
        <Calendario />
      </div>
    </ProtectedRoute>
  );
}

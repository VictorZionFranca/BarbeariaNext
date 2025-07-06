import ProtectedRoute from "./components/ProtectedRoute";
import DashboardClientes from "./components/DashboardClientes";
import BlocoAgendamentos from "./components/BlocoAgendamentos";
import BlocoBarbeiroMaisServicos from "./components/BlocoBarbeiroMaisServicos";
import BlocoServicoMaisAgendado from "./components/BlocoServicoMaisAgendado";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="text-black ">
        <DashboardClientes />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          <BlocoAgendamentos />
          <BlocoBarbeiroMaisServicos />
          <BlocoServicoMaisAgendado />
        </div>
      </div>
    </ProtectedRoute>
  );
}

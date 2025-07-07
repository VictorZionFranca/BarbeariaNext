import ProtectedRoute from "./components/ProtectedRoute";
import DashboardClientes from "./components/DashboardClientes";
import BlocoAgendamentos from "./components/BlocoAgendamentos";
import BlocoBarbeiroMaisServicos from "./components/BlocoBarbeiroMaisServicos";
import BlocoServicoMaisAgendado from "./components/BlocoServicoMaisAgendado";
import BlocoProdutosMaisVendidos from "./components/BlocoProdutosMaisVendidos";
import BlocoInformacoesFinanceiras from "./components/BlocoInformacoesFinanceiras";
import { FaUsers, FaUserTie, FaDollarSign } from "react-icons/fa";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="text-black mb-20">
        <h1 className="text-3xl font-extrabold mt-8 mb-4 tracking-tight">Home</h1>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide">
          <FaUsers className="text-lg" /> Dashboard Clientes
        </h2>
        <DashboardClientes />
        <hr className="my-8 border-gray-300" />
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-6 tracking-wide">
          <FaUserTie className="text-base" /> Dashboard Colaboradores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          <BlocoAgendamentos />
          <BlocoBarbeiroMaisServicos />
          <BlocoServicoMaisAgendado />
        </div>
        <hr className="my-8 border-gray-300" />
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-6 tracking-wide">
          <FaDollarSign className="text-base" /> Informações Financeiras
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <BlocoProdutosMaisVendidos />
          <BlocoInformacoesFinanceiras />
        </div>
      </div>
    </ProtectedRoute>
  );
}

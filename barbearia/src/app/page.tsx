import ProtectedRoute from "./components/ProtectedRoute";
import DashboardClientes from "./components/DashboardClientes";
import BlocoInformacoesFinanceiras from "./components/BlocoInformacoesFinanceiras";
import BlocoAgendamentosAtivos from "./components/BlocoAgendamentosAtivos";
import BlocoAgendamentosCancelados from "./components/BlocoAgendamentosCancelados";
import BlocoAgendamentosConcluidos from "./components/BlocoAgendamentosConcluidos";
import BlocoAgendamentosTotal from "./components/BlocoAgendamentosTotal";
import {
  FaUsers,
  FaUserTie,
  FaDollarSign,
  FaCalendarAlt,
  FaInfoCircle,
  //FaCut,
} from "react-icons/fa";
import {
  BlocoBarbeiroMaisAgendamentos,
  BlocoBarbeiroMaisServicosRealizados,
} from "./components/BlocoBarbeiroMaisServicos";
import BlocoColaboradoresAniversariantes from "./components/BlocoColaboradoresAniversariantes";
{/*import BlocoServicosAgendadosAtivos from "./components/BlocoServicosAgendadosAtivos";
import BlocoServicosAgendadosCancelados from "./components/BlocoServicosAgendadosCancelados";
import BlocoServicosAgendadosConcluidos from "./components/BlocoServicosAgendadosConcluidos";
import BlocoServicosAgendadosTotal from "./components/BlocoServicosAgendadosTotal";*/}
import BlocoServicosMaisAgendados from "./components/BlocoServicosMaisAgendados";
import BlocoProdutosMaisVendidos from "./components/BlocoProdutosMaisVendidos";
import BlocoNoticias from "./components/BlocoNoticias";
import BlocoUltimosAgendamentos from "./components/BlocoUltimosAgendamentos";

export default function Home() {
  return (
    <ProtectedRoute>
      <h1 className="text-3xl font-extrabold mt-8 mb-4 tracking-tight text-black">
        Home
      </h1>
      <div className="text-black mb-20">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-6 tracking-wide">
          <FaDollarSign className="text-base" /> Informações Financeiras
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-6">
          <BlocoInformacoesFinanceiras />
        </div>
        <hr className="my-8 border-gray-300" />

        <h2 className="text-xl font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide">
          <FaUsers className="text-lg" /> Dashboard Clientes
        </h2>
        <DashboardClientes />
        <hr className="my-8 border-gray-300" />
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-6 tracking-wide">
          <FaUserTie className="text-base" /> Dashboard Colaboradores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          <BlocoBarbeiroMaisAgendamentos />
          <BlocoBarbeiroMaisServicosRealizados />
          <BlocoColaboradoresAniversariantes />
        </div>
      </div>
      <hr className="my-8 border-gray-300" />
      {/* Blocos de Agendamentos */}
      <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide text-black">
        <FaCalendarAlt className="text-base text-black"/> Agendamentos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
        <BlocoAgendamentosAtivos />
        <BlocoAgendamentosCancelados />
        <BlocoAgendamentosConcluidos />
        <BlocoAgendamentosTotal />
      </div>
      <hr className="my-8 border-gray-300" />
      {/*<div className="text-black mb-20">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide">
          <FaCut className="text-base" /> Serviços
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
          <BlocoServicosAgendadosAtivos />
          <BlocoServicosAgendadosCancelados />
          <BlocoServicosAgendadosConcluidos />
          <BlocoServicosAgendadosTotal />
        </div>
        <hr className="my-8 border-gray-300" />
      </div>*/}
      <div className="text-black mb-20">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide text-black">
        <FaInfoCircle className="text-base text-black" /> Informações Adicionais
      </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
          <BlocoServicosMaisAgendados />
          <BlocoProdutosMaisVendidos />
          <BlocoNoticias />
          <BlocoUltimosAgendamentos />
        </div>
      </div>
    </ProtectedRoute>
  );
}

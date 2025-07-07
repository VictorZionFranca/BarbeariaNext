"use client";
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
  FaThLarge,
  FaSave,
  FaSync,
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
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useState, useEffect } from "react";
import { salvarLayoutDashboard, buscarLayoutDashboard } from "./utils/firestoreUtils";
import { useAuth } from "../context/AuthContext";
import React from "react";

export default function Home() {
  // IDs dos blocos principais
  const defaultBlocks = [
    "financeiro",
    "clientes",
    "colaboradores",
    "agendamentos",
    "infoAdicional"
  ];
  const [editMode, setEditMode] = useState(false);
  const [blocks, setBlocks] = useState<string[]>(defaultBlocks);
  const { user } = useAuth();
  const [loadingLayout, setLoadingLayout] = useState(true);

  // Carregar ordem do Firestore (admin) ou localStorage
  useEffect(() => {
    let ativo = true;
    async function carregarLayout() {
      setLoadingLayout(true);
      if (user?.uid) {
        const layoutSalvo = await buscarLayoutDashboard(user.uid);
        if (ativo && layoutSalvo && Array.isArray(layoutSalvo) && layoutSalvo.length > 0) {
          setBlocks(layoutSalvo);
          setLoadingLayout(false);
          return;
        }
      }
      // fallback localStorage (para compatibilidade)
      const saved = localStorage.getItem("dashboardBlocks");
      if (ativo && saved) setBlocks(JSON.parse(saved));
      setLoadingLayout(false);
    }
    carregarLayout();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Salvar ordem no Firestore (admin) e localStorage
  useEffect(() => {
    if (loadingLayout) return; // Não salvar enquanto carrega
    if (user?.uid) {
      salvarLayoutDashboard(user.uid, blocks);
    }
    localStorage.setItem("dashboardBlocks", JSON.stringify(blocks));
  }, [blocks, user?.uid, loadingLayout]);

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newBlocks = Array.from(blocks);
    const [removed] = newBlocks.splice(result.source.index, 1);
    newBlocks.splice(result.destination.index, 0, removed);
    setBlocks(newBlocks);
  }

  // Renderização dos blocos
  function renderBlock(id: string) {
    switch (id) {
      case "financeiro":
        return (
          <div key="financeiro" className="w-full">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-6 tracking-wide text-black">
              <FaDollarSign className="text-base" /> Informações Financeiras
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-6">
              <BlocoInformacoesFinanceiras />
            </div>
          </div>
        );
      case "clientes":
        return (
          <section key="clientes">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide text-black">
              <FaUsers className="text-lg" /> Dashboard Clientes
            </h2>
            <DashboardClientes />
          </section>
        );
      case "colaboradores":
        return (
          <div key="colaboradores" className="w-full">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-6 tracking-wide text-black">
              <FaUserTie className="text-base" /> Dashboard Colaboradores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              <BlocoBarbeiroMaisAgendamentos />
              <BlocoBarbeiroMaisServicosRealizados />
              <BlocoColaboradoresAniversariantes />
            </div>
          </div>
        );
      case "agendamentos":
        return (
          <div key="agendamentos" className="w-full">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide text-black">
              <FaCalendarAlt className="text-base text-black"/> Agendamentos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
              <BlocoAgendamentosAtivos />
              <BlocoAgendamentosCancelados />
              <BlocoAgendamentosConcluidos />
              <BlocoAgendamentosTotal />
            </div>
          </div>
        );
      case "infoAdicional":
        return (
          <section key="infoAdicional">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2 mt-10 tracking-wide text-black">
              <FaInfoCircle className="text-base text-black" /> Informações Adicionais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
              <BlocoServicosMaisAgendados />
              <BlocoProdutosMaisVendidos />
              <BlocoNoticias />
              <BlocoUltimosAgendamentos />
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  // Função para resetar layout para o padrão
  function resetLayout() {
    setBlocks(defaultBlocks);
    localStorage.removeItem("dashboardBlocks");
  }

  if (loadingLayout) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 text-lg">Carregando layout do dashboard...</div>
    );
  }

  return (
    <ProtectedRoute>
      <h1 className="text-3xl font-extrabold mt-8 mb-4 tracking-tight text-black">
        Home
      </h1>
      {/* Botões flutuantes de layout */}
      {!editMode && (
        <button
          className="fixed z-50 bottom-8 right-8 flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-lg transition-all duration-200 border-2 bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
          onClick={() => setEditMode(true)}
          title="Editar layout do dashboard"
          style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.12)" }}
        >
          <FaThLarge className="w-5 h-5" />
          Layout
        </button>
      )}
      {editMode && (
        <div className="fixed z-50 bottom-8 right-8 flex flex-col items-end gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-lg transition-all duration-200 border-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            onClick={() => setEditMode(false)}
            title="Salvar layout do dashboard"
            style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.12)" }}
          >
            <FaSave className="w-5 h-5" />
            Salvar
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-lg transition-all duration-200 border-2 bg-gray-200 text-gray-700 border-gray-400 hover:bg-gray-300"
            onClick={resetLayout}
            title="Voltar ao layout padrão do dashboard"
            style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.12)" }}
          >
            <FaSync className="w-5 h-5 animate-spin-slow" />
            Padrão
          </button>
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard-droppable">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col gap-2"
            >
              {blocks.map((blockId, idx) => (
                <React.Fragment key={blockId}>
                  <Draggable key={blockId} draggableId={blockId} index={idx} isDragDisabled={!editMode}>
                    {(prov, snapshot) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`transition-shadow duration-200 ${editMode ? "ring-2 ring-blue-400 cursor-move" : ""} bg-transparent ${idx < blocks.length - 1 ? "mb-12" : "mb-20"}`}
                        style={{
                          ...prov.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        {renderBlock(blockId)}
                      </div>
                    )}
                  </Draggable>
                  {idx < blocks.length - 1 && (
                    <hr className="my-2 border-gray-300" />
                  )}
                </React.Fragment>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </ProtectedRoute>
  );
}

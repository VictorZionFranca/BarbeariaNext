"use client";
import React, { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";
import { listarAgendamentos } from "../utils/firestoreAgendamentos";

interface Agendamento {
  id?: string;
  data: string;
  hora: string;
  clienteNome: string;
  colaboradorNome: string;
  servicoNome: string;
  status: string;
  unidadeNome?: string;
}

export default function BlocoUltimosAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [animandoSaida, setAnimandoSaida] = useState(false);

  useEffect(() => {
    async function fetchAgendamentos() {
      setCarregando(true);
      try {
        const todos = await listarAgendamentos({ status: "finalizado" });
        // Ordena por data/hora decrescente
        todos.sort((a, b) => {
          const dataA = new Date(`${a.data}T${a.hora}`);
          const dataB = new Date(`${b.data}T${b.hora}`);
          return dataB.getTime() - dataA.getTime();
        });
        setAgendamentos(todos);
      } finally {
        setCarregando(false);
      }
    }
    fetchAgendamentos();
  }, []);

  function abrirModal() {
    setModalAberto(true);
  }
  function fecharModal() {
    setAnimandoSaida(true);
    setTimeout(() => {
      setModalAberto(false);
      setAnimandoSaida(false);
    }, 200); // tempo igual ao da transição
  }

  function renderAgendamento(ag: Agendamento) {
    return (
      <li key={ag.id} className="flex items-center gap-3 p-2 border-b border-gray-100 last:border-b-0">
        <FaClock className="text-green-600 text-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 items-center">
            <span className="font-bold text-sm text-gray-900 truncate">{ag.clienteNome}</span>
            <span className="text-xs text-gray-500">• {ag.servicoNome}</span>
          </div>
          <div className="text-xs text-gray-600 truncate">
            Profissional: {ag.colaboradorNome} {ag.unidadeNome && <span>• {ag.unidadeNome}</span>}
          </div>
          <div className="text-xs text-gray-400">
            {ag.data.split("-").reverse().join("/")} {ag.hora}
          </div>
        </div>
      </li>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaClock className="text-green-600 text-2xl" />
        <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Últimos Agendamentos</span>
        <button
          className="ml-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1 rounded-lg text-sm transition-colors duration-200"
          onClick={abrirModal}
          disabled={carregando || agendamentos.length <= 3}
        >
          Ver mais
        </button>
      </div>
      {carregando ? (
        <div className="text-center text-gray-500 py-8">Carregando agendamentos...</div>
      ) : agendamentos.length === 0 ? (
        <div className="text-center text-gray-500 py-8">Nenhum agendamento finalizado.</div>
      ) : (
        <ul className="space-y-1">
          {agendamentos.slice(0, 3).map(renderAgendamento)}
        </ul>
      )}
      {/* Modal de ver mais */}
      {modalAberto && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-350 ${animandoSaida ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}
        >
          <div
            className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative transition-all duration-350 ${animandoSaida ? 'opacity-0 scale-90 translate-y-10' : 'opacity-100 scale-100 translate-y-0'}`}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={fecharModal}
              aria-label="Fechar"
              type="button"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center text-black">Últimos Agendamentos Realizados</h2>
            <ul className="divide-y divide-gray-100">
              {agendamentos.slice(0, 10).map(renderAgendamento)}
            </ul>
            <div className="flex justify-center mt-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                onClick={fecharModal}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
} 
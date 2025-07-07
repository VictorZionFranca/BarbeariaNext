"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaCut, FaTrophy } from "react-icons/fa";
import { listarAgendamentos } from "../utils/firestoreAgendamentos";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

interface ServicoTop {
  nome: string;
  quantidade: number;
}

export default function BlocoServicosMaisAgendados() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [servicosMaisAgendados, setServicosMaisAgendados] = useState<ServicoTop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getDataInicio = (periodo: Periodo): string => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();
    switch (periodo) {
      case "dia":
        return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      case "mes":
        return `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      case "ano":
        return `${ano}-01-01`;
    }
  };
  const getDataFim = (periodo: Periodo): string => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();
    switch (periodo) {
      case "dia":
        return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      case "mes":
        const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
        return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;
      case "ano":
        return `${ano}-12-31`;
    }
  };

  const buscarServicosMaisAgendados = useCallback(async (periodo: Periodo) => {
    setLoading(true);
    try {
      const dataInicio = getDataInicio(periodo);
      const dataFim = getDataFim(periodo);
      const agendamentos = await listarAgendamentos({ status: "ativo" });
      const agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = ag.data;
        return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
      });
      const contagemServicos: Record<string, number> = {};
      agendamentosPeriodo.forEach(ag => {
        const servicoNome = ag.servicoNome || "Serviço não definido";
        contagemServicos[servicoNome] = (contagemServicos[servicoNome] || 0) + 1;
      });
      const topServicos = Object.entries(contagemServicos)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);
      setServicosMaisAgendados(topServicos);
    } catch (error) {
      console.error("Erro ao buscar serviços mais agendados:", error);
      setServicosMaisAgendados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarServicosMaisAgendados(periodo);
  }, [periodo, buscarServicosMaisAgendados]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaTrophy className="text-pink-600 text-2xl" />
        <div className="flex flex-wrap gap-1 min-w-0 overflow-x-auto">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                periodo === opt.value
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPeriodo(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Serviços Mais Agendados</span>
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span className="text-gray-400">Carregando...</span>
          </div>
        ) : servicosMaisAgendados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 text-center">
            <FaCut className="text-gray-300 text-2xl mb-1" />
            <span className="text-gray-500 text-sm">Nenhum serviço</span>
            <span className="text-xs text-gray-400">({periodOptions.find(p => p.value === periodo)?.label} atual)</span>
          </div>
        ) : (
          <div className="space-y-2">
            {servicosMaisAgendados.map((servico, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-pink-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-pink-200 rounded flex items-center justify-center overflow-hidden">
                    <FaCut className="text-pink-600 text-lg" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-pink-600">#{index + 1}</span>
                    <h3 className="text-xs font-semibold text-gray-900 truncate">
                      {servico.nome}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600">
                      {servico.quantidade} agendamento{servico.quantidade === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!loading && servicosMaisAgendados.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          Top 3 serviços ({periodOptions.find(p => p.value === periodo)?.label} atual)
        </div>
      )}
    </section>
  );
}

"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaUserTie } from "react-icons/fa";
import { listarAgendamentos } from "../utils/firestoreAgendamentos";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

interface BarbeiroMaisServicos {
  nome: string;
  quantidade: number;
}

export default function BlocoBarbeiroMaisServicos() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [barbeiroMaisServicos, setBarbeiroMaisServicos] = useState<BarbeiroMaisServicos>({ nome: "Nenhum", quantidade: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  // Função para obter a data de início do período
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

  // Função para obter a data de fim do período
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

  // Buscar barbeiro com mais serviços do período
  const buscarBarbeiroMaisServicos = useCallback(async (periodo: Periodo) => {
    setLoading(true);
    try {
      const dataInicio = getDataInicio(periodo);
      const dataFim = getDataFim(periodo);
      
      // Buscar todos os agendamentos finalizados (serviços realizados)
      const agendamentos = await listarAgendamentos({ status: "finalizado" });
      
      // Filtrar por período
      const agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = ag.data;
        return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
      });
      
      // Contar serviços por barbeiro
      const contagemBarbeiros: Record<string, number> = {};
      agendamentosPeriodo.forEach(ag => {
        const barbeiroNome = ag.colaboradorNome || "Barbeiro não definido";
        contagemBarbeiros[barbeiroNome] = (contagemBarbeiros[barbeiroNome] || 0) + 1;
      });
      
      // Encontrar o barbeiro com mais serviços
      let barbeiroMaisServicos: BarbeiroMaisServicos = { nome: "Nenhum", quantidade: 0 };
      
      Object.entries(contagemBarbeiros).forEach(([nome, quantidade]) => {
        if (quantidade > barbeiroMaisServicos.quantidade) {
          barbeiroMaisServicos = { nome, quantidade };
        }
      });
      
      setBarbeiroMaisServicos(barbeiroMaisServicos);
    } catch (error) {
      console.error("Erro ao buscar barbeiro com mais serviços:", error);
      setBarbeiroMaisServicos({ nome: "Erro", quantidade: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar dados quando mudar o período
  useEffect(() => {
    buscarBarbeiroMaisServicos(periodo);
  }, [periodo, buscarBarbeiroMaisServicos]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaUserTie className="text-purple-600 text-2xl" />
        <div className="flex gap-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                periodo === opt.value
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPeriodo(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Barbeiro com Mais Serviços</span>
      <div className="flex flex-col gap-1">
        {loading ? (
          <>
            <span className="text-lg font-bold text-gray-400">Carregando...</span>
            <span className="text-2xl font-bold text-gray-400">...</span>
          </>
        ) : (
          <>
            <span className="text-lg font-bold text-gray-900">{barbeiroMaisServicos.nome}</span>
            <span className="text-2xl font-bold text-purple-700">
              {barbeiroMaisServicos.quantidade} serviço{barbeiroMaisServicos.quantidade === 1 ? "" : "s"}
            </span>
          </>
        )}
        <span className="text-xs text-gray-500">
          ({periodOptions.find(p => p.value === periodo)?.label} atual)
        </span>
      </div>
    </section>
  );
} 
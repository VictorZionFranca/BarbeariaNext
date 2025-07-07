"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import { listarAgendamentos } from "../utils/firestoreAgendamentos";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

export default function BlocoAgendamentosTotal() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [quantidade, setQuantidade] = useState<number>(0);
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

  const buscarAgendamentosPeriodo = useCallback(async (periodo: Periodo) => {
    setLoading(true);
    try {
      const dataInicio = getDataInicio(periodo);
      const dataFim = getDataFim(periodo);
      const agendamentos = await listarAgendamentos({}); // Busca todos
      const agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = ag.data;
        return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
      });
      setQuantidade(agendamentosPeriodo.length);
    } catch (error) {
      console.error("Erro ao buscar total de agendamentos:", error);
      setQuantidade(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarAgendamentosPeriodo(periodo);
  }, [periodo, buscarAgendamentosPeriodo]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaCalendarAlt className="text-gray-600 text-2xl" />
        <div className="flex flex-wrap gap-1 min-w-0 overflow-x-auto">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                periodo === opt.value
                  ? "bg-gray-600 text-white border-gray-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPeriodo(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Total de Agendamentos</span>
      <div className="flex items-end gap-3">
        {loading ? (
          <span className="text-4xl font-bold text-gray-400">...</span>
        ) : (
          <span className="text-4xl font-bold text-gray-900">{quantidade}</span>
        )}
        <span className="text-sm text-gray-500 mb-1">
          Agendamento{quantidade === 1 ? "" : "s"}
        </span>
      </div>
    </section>
  );
} 
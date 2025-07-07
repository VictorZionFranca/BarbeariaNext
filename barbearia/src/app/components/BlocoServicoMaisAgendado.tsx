"use client";
import React, { useState } from "react";
import { FaCut } from "react-icons/fa";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

export default function BlocoServicoMaisAgendado() {
  const [periodo, setPeriodo] = useState<Periodo>("dia");

  // Mock de dados (substituir por dados reais depois)
  const mockData: Record<Periodo, { nome: string; quantidade: number }> = {
    dia: { nome: "Corte Masculino", quantidade: 4 },
    mes: { nome: "Barba Completa", quantidade: 35 },
    ano: { nome: "Corte + Barba", quantidade: 320 },
  };

  const dados = mockData[periodo];

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaCut className="text-pink-600 text-2xl" />
        <div className="flex gap-1">
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
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Serviço Mais Agendado</span>
      <div className="flex flex-col gap-1">
        <span className="text-lg font-bold text-gray-900">{dados.nome}</span>
        <span className="text-2xl font-bold text-pink-700">{dados.quantidade} agendamentos</span>
        <span className="text-xs text-gray-500">({periodOptions.find(p => p.value === periodo)?.label} atual)</span>
      </div>
    </section>
  );
} 
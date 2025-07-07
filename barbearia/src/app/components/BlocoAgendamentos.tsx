"use client";
import React, { useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

export default function BlocoAgendamentos() {
  const [periodo, setPeriodo] = useState<Periodo>("dia");

  // Mock de dados (substituir por dados reais depois)
  const mockData: Record<Periodo, number> = {
    dia: 8,
    mes: 120,
    ano: 950,
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaCalendarAlt className="text-blue-600 text-2xl" />
        <div className="flex gap-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                periodo === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPeriodo(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Agendamentos</span>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-gray-900">{mockData[periodo]}</span>
        <span className="text-sm text-gray-500 mb-1">{periodOptions.find(p => p.value === periodo)?.label}</span>
      </div>
    </section>
  );
} 
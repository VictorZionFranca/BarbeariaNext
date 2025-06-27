"use client"
import React, { useEffect, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { FaUserCheck, FaUserTimes } from "react-icons/fa";

// Interface para definir a estrutura de uma pessoa/cliente
interface Pessoa {
  id: string;
  tipoPessoa: number;
  criadoEm?: Timestamp;
  dataInativacao?: Timestamp;
  [key: string]: unknown; // Para outras propriedades que possam existir
}

// Opções de período para o filtro
const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Total", value: "total" },
];

function isSameDay(ts: Timestamp, now: Date) {
  const d = ts.toDate();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isSameMonth(ts: Timestamp, now: Date) {
  const d = ts.toDate();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function DashboardClientes() {
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoAtivos, setPeriodoAtivos] = useState("total");
  const [periodoInativos, setPeriodoInativos] = useState("total");

  useEffect(() => {
    async function fetchClientes() {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "pessoas"));
      const data = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Pessoa))
        .filter((p: Pessoa) => p.tipoPessoa === 1);
      setClientes(data);
      setLoading(false);
    }
    fetchClientes();
  }, []);

  const now = new Date();

  // Ativos
  const ativos = clientes.filter((c) => !c.dataInativacao);
  const ativosTotal = ativos.length;
  const ativosMes = ativos.filter((c) => c.criadoEm && isSameMonth(c.criadoEm, now)).length;
  const ativosDia = ativos.filter((c) => c.criadoEm && isSameDay(c.criadoEm, now)).length;
  const getAtivos = () => {
    if (periodoAtivos === "dia") return ativosDia;
    if (periodoAtivos === "mes") return ativosMes;
    return ativosTotal;
  };

  // Inativos
  const inativos = clientes.filter((c) => c.dataInativacao);
  const inativosTotal = inativos.length;
  const inativosMes = inativos.filter((c) => c.dataInativacao && isSameMonth(c.dataInativacao, now)).length;
  const inativosDia = inativos.filter((c) => c.dataInativacao && isSameDay(c.dataInativacao, now)).length;
  const getInativos = () => {
    if (periodoInativos === "dia") return inativosDia;
    if (periodoInativos === "mes") return inativosMes;
    return inativosTotal;
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-black mb-2">Resumo de Clientes</h2>
      </div>
      {loading ? (
        <div className="text-center text-gray-500">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bloco Ativos */}
          <section className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col gap-2 min-h-[110px] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FaUserCheck className="text-neutral-400 text-xl" />
              <div className="flex gap-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${periodoAtivos === opt.value ? "bg-neutral-800 text-white border-neutral-800" : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"}`}
                    onClick={() => setPeriodoAtivos(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Clientes Ativos</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-neutral-900">{getAtivos()}</span>
              <span className="text-xs text-neutral-500">{periodOptions.find(p => p.value === periodoAtivos)?.label}</span>
            </div>
          </section>
          {/* Bloco Inativos */}
          <section className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col gap-2 min-h-[110px] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FaUserTimes className="text-neutral-400 text-xl" />
              <div className="flex gap-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${periodoInativos === opt.value ? "bg-neutral-800 text-white border-neutral-800" : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"}`}
                    onClick={() => setPeriodoInativos(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Clientes Perdidos</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-neutral-900">{getInativos()}</span>
              <span className="text-xs text-neutral-500">{periodOptions.find(p => p.value === periodoInativos)?.label}</span>
            </div>
          </section>
        </div>
      )}
      {/*
        Documentação:
        - Minimalista: cores neutras, blocos compactos, filtros e ícones alinhados à esquerda.
        - Cada bloco mostra apenas o valor filtrado.
        - Busca clientes (tipoPessoa === 1) na coleção 'pessoas'.
        - Usa 'criadoEm' e 'dataInativacao' para ativos/inativos.
      */}
    </div>
  );
}

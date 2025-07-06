"use client"
import React, { useEffect, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { FaUserCheck, FaUserTimes, FaBirthdayCake } from "react-icons/fa";

// Interface para definir a estrutura de uma pessoa/cliente
interface Pessoa {
  id: string;
  tipoPessoa: number;
  criadoEm?: Timestamp;
  dataInativacao?: Timestamp;
  dataNascimento?: string; // Adicionando campo para aniversário
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

  // Aniversariantes
  function parseDataNascimento(dataNascimento?: string): Date | null {
    if (!dataNascimento) return null;
    // Espera-se formato dd/MM/yyyy ou yyyy-MM-dd
    if (dataNascimento.includes("/")) {
      const [dia, mes, ano] = dataNascimento.split("/").map(Number);
      if (!dia || !mes || !ano) return null;
      return new Date(ano, mes - 1, dia);
    } else if (dataNascimento.includes("-")) {
      // yyyy-MM-dd
      const [ano, mes, dia] = dataNascimento.split("-").map(Number);
      if (!dia || !mes || !ano) return null;
      return new Date(ano, mes - 1, dia);
    }
    return null;
  }

  const aniversariantesMes = clientes.filter((c) => {
    const data = parseDataNascimento(c.dataNascimento as string);
    return data && data.getMonth() === now.getMonth();
  });

  return (
    <div className="flex flex-col min-h-[78vh]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black my-8">Dashboard de Clientes</h1>
      </div>
      {loading ? (
        <div className="text-center text-gray-500">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bloco Ativos */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <FaUserCheck className="text-green-600 text-2xl" />
              <div className="flex gap-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      periodoAtivos === opt.value 
                        ? "bg-green-600 text-white border-green-600" 
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setPeriodoAtivos(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Clientes Ativos</span>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900">{getAtivos()}</span>
              <span className="text-sm text-gray-500 mb-1">{periodOptions.find(p => p.value === periodoAtivos)?.label}</span>
            </div>
          </section>
          
          {/* Bloco Inativos */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <FaUserTimes className="text-red-600 text-2xl" />
              <div className="flex gap-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      periodoInativos === opt.value 
                        ? "bg-red-600 text-white border-red-600" 
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setPeriodoInativos(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Clientes Perdidos</span>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900">{getInativos()}</span>
              <span className="text-sm text-gray-500 mb-1">{periodOptions.find(p => p.value === periodoInativos)?.label}</span>
            </div>
          </section>

          {/* Bloco Aniversariantes */}
          <section
            className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md"
            title="Aniversariantes do mês"
          >
            <div className="flex items-center gap-3 mb-2">
              <FaBirthdayCake className="text-yellow-500 text-2xl" />
              <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Aniversariantes do Mês</span>
              <span className="ml-2 text-lg text-gray-500 font-bold">({aniversariantesMes.length})</span>
            </div>
            {/* Lista de aniversariantes do mês, ordenada por data do mês (menor para maior) */}
            <div className="mt-2 max-h-40 overflow-y-auto pr-2">
              {(() => {
                // Ordenar aniversariantes por data do mês (menor para maior)
                const hoje = new Date();
                const ordenarPorData = (c: Pessoa) => {
                  const data = parseDataNascimento(c.dataNascimento as string);
                  if (!data) return 9999;
                  return data.getDate();
                };
                const ordenados = [...aniversariantesMes].sort((a, b) => ordenarPorData(a) - ordenarPorData(b));
                if (ordenados.length === 0) {
                  return <div className="text-gray-500 text-sm">Nenhum aniversariante neste mês.</div>;
                }
                return (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {ordenados.slice(0, 5).map((c) => {
                      const data = parseDataNascimento(c.dataNascimento as string);
                      const isHoje = data && data.getDate() === hoje.getDate() && data.getMonth() === hoje.getMonth();
                      return (
                        <li
                          key={c.id}
                          className={`font-medium ${isHoje ? 'text-green-600 font-bold' : 'text-gray-800'}`}
                        >
                          {typeof c.nomeCompleto === 'string' && c.nomeCompleto.trim() !== '' ? c.nomeCompleto : "(Sem nome)"}
                          {c.dataNascimento && (
                            <span className="text-xs text-gray-500 ml-2">
                              {data ? `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}` : ""}
                            </span>
                          )}
                          {isHoje && <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">Hoje!</span>}
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
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

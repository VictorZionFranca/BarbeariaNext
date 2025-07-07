"use client";
import React, { useEffect, useState } from "react";
import { listarColaboradores } from "../utils/firestoreColaboradores";
import { FaBirthdayCake } from "react-icons/fa";

interface Colaborador {
  id?: string;
  nomeCompleto: string;
  dataNascimento?: string;
}

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

export default function BlocoColaboradoresAniversariantes() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  useEffect(() => {
    listarColaboradores().then((data) => {
      setColaboradores(data);
    });
  }, []);

  const now = new Date();
  // Novo filtro: apenas aniversariantes do mês a partir do dia de hoje
  const aniversariantesMes = colaboradores.filter((c) => {
    const data = parseDataNascimento(c.dataNascimento);
    return (
      data &&
      data.getMonth() === now.getMonth() &&
      data.getDate() >= now.getDate() // Só a partir do dia de hoje
    );
  });

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md">
      <div className="flex items-center gap-3 mb-2">
        <FaBirthdayCake className="text-yellow-500 text-2xl" />
        <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Aniversariantes do Mês</span>
        <span className="ml-2 text-lg text-gray-500 font-bold">({aniversariantesMes.length})</span>
      </div>
      <div className="mt-2 max-h-40 overflow-y-auto pr-2">
        {(() => {
          // Ordenar aniversariantes por data do mês (menor para maior)
          const hoje = new Date();
          const ordenarPorData = (c: Colaborador) => {
            const data = parseDataNascimento(c.dataNascimento);
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
                const data = parseDataNascimento(c.dataNascimento);
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
  );
} 
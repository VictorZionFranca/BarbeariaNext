"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaUserTie, FaTrophy } from "react-icons/fa";
import { listarAgendamentos } from "../utils/firestoreAgendamentos";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";
import { listarColaboradores, Colaborador } from "../utils/firestoreColaboradores";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

interface BarbeiroTop {
  nome: string;
  quantidade: number;
}

export function BlocoBarbeiroMaisAgendamentos() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todos");
  const [topBarbeiros, setTopBarbeiros] = useState<BarbeiroTop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  useEffect(() => {
    listarUnidades().then(setUnidades).catch(() => setUnidades([]));
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
  }, []);

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

  const buscarTopBarbeiros = useCallback(async (periodo: Periodo, unidadeId: string) => {
    setLoading(true);
    try {
      const dataInicio = getDataInicio(periodo);
      const dataFim = getDataFim(periodo);
      // Buscar todos os agendamentos ativos e finalizados
      const agendamentosAtivos = await listarAgendamentos({ status: "ativo" });
      const agendamentosFinalizados = await listarAgendamentos({ status: "finalizado" });
      const agendamentos = [...agendamentosAtivos, ...agendamentosFinalizados];
      let agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = ag.data;
        return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
      });
      if (unidadeId !== "todos") {
        const unidade = unidades.find(u => u.id === unidadeId);
        if (unidade) {
          const normalizar = (str: string) => str.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
          const nomesBarbeirosUnidade = colaboradores
            .filter(col => col.unidadeNome && normalizar(col.unidadeNome) === normalizar(unidade.nome))
            .map(col => normalizar(col.nomeCompleto));
          agendamentosPeriodo = agendamentosPeriodo.filter(ag => nomesBarbeirosUnidade.includes(normalizar(ag.colaboradorNome || "")));
        }
      }
      const contagemBarbeiros: Record<string, number> = {};
      agendamentosPeriodo.forEach(ag => {
        const barbeiroNome = ag.colaboradorNome || "Barbeiro não definido";
        contagemBarbeiros[barbeiroNome] = (contagemBarbeiros[barbeiroNome] || 0) + 1;
      });
      const barbeirosOrdenados = Object.entries(contagemBarbeiros)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);
      setTopBarbeiros(barbeirosOrdenados);
    } finally {
      setLoading(false);
    }
  }, [unidades, colaboradores]);

  useEffect(() => {
    buscarTopBarbeiros(periodo, unidadeSelecionada);
  }, [periodo, unidadeSelecionada, buscarTopBarbeiros]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaTrophy className="text-purple-600 text-2xl" />
        <div className="flex flex-wrap gap-1 min-w-0 overflow-x-auto">
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
          <select
            className="ml-2 px-2 py-1 rounded-lg border text-sm font-medium bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            value={unidadeSelecionada}
            onChange={e => setUnidadeSelecionada(e.target.value)}
          >
            <option value="todos">Todas as unidades</option>
            {unidades.map(unidade => (
              <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>
            ))}
          </select>
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Top 3 Barbeiros com Mais Agendamentos</span>
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span className="text-gray-400">Carregando...</span>
          </div>
        ) : topBarbeiros.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 text-center">
            <FaUserTie className="text-gray-300 text-2xl mb-1" />
            <span className="text-gray-500 text-sm">Nenhum agendamento</span>
            <span className="text-xs text-gray-400">({periodOptions.find(p => p.value === periodo)?.label} atual)</span>
          </div>
        ) : (
          <div className="space-y-2">
            {topBarbeiros.map((barbeiro, index) => {
              const normalizar = (str: string) => str.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
              const colab = colaboradores.find(c => c.nomeCompleto && normalizar(c.nomeCompleto) === normalizar(barbeiro.nome));
              const unidadeBarbeiro = colab?.unidadeNome || "Unidade não definida";
              return (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center overflow-hidden">
                      <FaUserTie className="text-purple-600 text-lg" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                      <h3 className="text-xs font-semibold text-gray-900 truncate">
                        {barbeiro.nome}
                        <span className="ml-2 text-xs text-gray-400 font-normal">- {unidadeBarbeiro}</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-600">
                        {barbeiro.quantidade} agendamento{barbeiro.quantidade === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!loading && topBarbeiros.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          Top 3 barbeiros ({periodOptions.find(p => p.value === periodo)?.label} atual)
        </div>
      )}
    </section>
  );
}

export function BlocoBarbeiroMaisServicosRealizados() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todos");
  const [topBarbeiros, setTopBarbeiros] = useState<BarbeiroTop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  // Buscar unidades para o dropdown
  useEffect(() => {
    listarUnidades().then(setUnidades).catch(() => setUnidades([]));
  }, []);

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

  // Buscar barbeiros top 3 do período e unidade
  const buscarTopBarbeiros = useCallback(async (periodo: Periodo, unidadeId: string) => {
    setLoading(true);
    try {
      const dataInicio = getDataInicio(periodo);
      const dataFim = getDataFim(periodo);
      // Buscar todos os agendamentos finalizados (serviços realizados)
      const agendamentos = await listarAgendamentos({ status: "finalizado" });
      let agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = ag.data;
        return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
      });
      if (unidadeId !== "todos") {
        const unidade = unidades.find(u => u.id === unidadeId);
        if (unidade) {
          const normalizar = (str: string) => str.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
          const nomesBarbeirosUnidade = colaboradores
            .filter(col => col.unidadeNome && normalizar(col.unidadeNome) === normalizar(unidade.nome))
            .map(col => normalizar(col.nomeCompleto));
          agendamentosPeriodo = agendamentosPeriodo.filter(ag => nomesBarbeirosUnidade.includes(normalizar(ag.colaboradorNome || "")));
        }
      }
      const contagemBarbeiros: Record<string, number> = {};
      agendamentosPeriodo.forEach(ag => {
        const barbeiroNome = ag.colaboradorNome || "Barbeiro não definido";
        contagemBarbeiros[barbeiroNome] = (contagemBarbeiros[barbeiroNome] || 0) + 1;
      });
      const barbeirosOrdenados = Object.entries(contagemBarbeiros)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);
      setTopBarbeiros(barbeirosOrdenados);
    } finally {
      setLoading(false);
    }
  }, [unidades, colaboradores]);

  // Buscar dados quando mudar o período ou unidade
  useEffect(() => {
    buscarTopBarbeiros(periodo, unidadeSelecionada);
  }, [periodo, unidadeSelecionada, buscarTopBarbeiros]);

  // Buscar colaboradores para exibir unidade no Top 3
  useEffect(() => {
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
  }, []);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaTrophy className="text-purple-600 text-2xl" />
        <div className="flex flex-wrap gap-1 min-w-0 overflow-x-auto">
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
          <select
            className="ml-2 px-2 py-1 rounded-lg border text-sm font-medium bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            value={unidadeSelecionada}
            onChange={e => setUnidadeSelecionada(e.target.value)}
          >
            <option value="todos">Todas as unidades</option>
            {unidades.map(unidade => (
              <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>
            ))}
          </select>
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Top 3 Barbeiros com mais serviços realizados</span>
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span className="text-gray-400">Carregando...</span>
          </div>
        ) : topBarbeiros.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 text-center">
            <FaUserTie className="text-gray-300 text-2xl mb-1" />
            <span className="text-gray-500 text-sm">Nenhum serviço realizado</span>
            <span className="text-xs text-gray-400">({periodOptions.find(p => p.value === periodo)?.label} atual)</span>
          </div>
        ) : (
          <div className="space-y-2">
            {topBarbeiros.map((barbeiro, index) => {
              // Função para normalizar nomes (remover acentos, espaços extras e minúsculo)
              const normalizar = (str: string) => str.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
              // Buscar colaborador correspondente
              const colab = colaboradores.find(c => c.nomeCompleto && normalizar(c.nomeCompleto) === normalizar(barbeiro.nome));
              const unidadeBarbeiro = colab?.unidadeNome || "Unidade não definida";
              return (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center overflow-hidden">
                      <FaUserTie className="text-purple-600 text-lg" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                      <h3 className="text-xs font-semibold text-gray-900 truncate">
                        {barbeiro.nome}
                        <span className="ml-2 text-xs text-gray-400 font-normal">- {unidadeBarbeiro}</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-600">
                        {barbeiro.quantidade} serviço{barbeiro.quantidade === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!loading && topBarbeiros.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          Top 3 barbeiros ({periodOptions.find(p => p.value === periodo)?.label} atual)
        </div>
      )}
    </section>
  );
}

export default BlocoBarbeiroMaisServicosRealizados; 
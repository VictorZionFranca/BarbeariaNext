"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaChartLine } from "react-icons/fa";
import { listarAgendamentos } from "../utils/firestoreAgendamentos";
import { listarVendasProdutos } from "../utils/firestoreProdutos";
import { listarServicos } from "../utils/firestoreServicos";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

export default function BlocoInformacoesFinanceiras() {
  // Receita Total
  const [periodoTotal, setPeriodoTotal] = useState<Periodo>("ano");
  const [receitaTotal, setReceitaTotal] = useState<number>(0);
  const [loadingTotal, setLoadingTotal] = useState<boolean>(true);

  // Receita Serviços
  const [periodoServicos, setPeriodoServicos] = useState<Periodo>("ano");
  const [receitaServicos, setReceitaServicos] = useState<number>(0);
  const [loadingServicos, setLoadingServicos] = useState<boolean>(true);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todos");

  // Receita Produtos
  const [periodoProdutos, setPeriodoProdutos] = useState<Periodo>("ano");
  const [receitaProdutos, setReceitaProdutos] = useState<number>(0);
  const [loadingProdutos, setLoadingProdutos] = useState<boolean>(true);

  // Função para obter o intervalo de datas do período
  const getIntervaloPeriodo = (periodo: Periodo): { inicio: Date; fim: Date } => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();
    let inicio: Date, fim: Date;
    switch (periodo) {
      case "dia":
        inicio = new Date(ano, mes, dia, 0, 0, 0, 0);
        fim = new Date(ano, mes, dia + 1, 0, 0, 0, 0);
        break;
      case "mes":
        inicio = new Date(ano, mes, 1, 0, 0, 0, 0);
        fim = new Date(ano, mes + 1, 1, 0, 0, 0, 0);
        break;
      case "ano":
        inicio = new Date(ano, 0, 1, 0, 0, 0, 0);
        fim = new Date(ano + 1, 0, 1, 0, 0, 0, 0);
        break;
    }
    return { inicio, fim };
  };

  // Função para formatar preço
  const formatarPreco = (preco: number) => {
    return `R$ ${preco.toFixed(2).replace('.', ',')}`;
  };

  // Buscar unidades para o filtro
  useEffect(() => {
    listarUnidades().then(setUnidades).catch(() => setUnidades([]));
  }, []);

  // Buscar receita total
  const buscarReceitaTotal = useCallback(async (periodo: Periodo) => {
    setLoadingTotal(true);
    try {
      const { inicio, fim } = getIntervaloPeriodo(periodo);
      const [agendamentos, vendas, servicos] = await Promise.all([
        listarAgendamentos({ status: "finalizado" }),
        listarVendasProdutos(),
        listarServicos()
      ]);
      const servicosMap = new Map<string, number>();
      servicos.forEach(servico => {
        servicosMap.set(servico.id, servico.valor);
      });
      const agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = new Date(ag.data + 'T00:00:00');
        return dataAgendamento >= inicio && dataAgendamento < fim;
      });
      const vendasPeriodo = vendas.filter(venda => {
        if (!venda.dataVenda) return false;
        const dataVenda = venda.dataVenda.toDate();
        return dataVenda >= inicio && dataVenda < fim;
      });
      const receitaServicos = agendamentosPeriodo.reduce((total, agendamento) => {
        const precoServico = servicosMap.get(agendamento.servicoId) || 0;
        return total + precoServico;
      }, 0);
      const receitaProdutos = vendasPeriodo.reduce((total, venda) => {
        return total + venda.totalVenda;
      }, 0);
      setReceitaTotal(receitaServicos + receitaProdutos);
    } catch {
      setReceitaTotal(0);
    } finally {
      setLoadingTotal(false);
    }
  }, []);

  // Buscar receita de serviços
  const buscarReceitaServicos = useCallback(async (periodo: Periodo, unidadeId: string) => {
    setLoadingServicos(true);
    try {
      const { inicio, fim } = getIntervaloPeriodo(periodo);
      const [agendamentos, servicos] = await Promise.all([
        listarAgendamentos({ status: "finalizado" }),
        listarServicos()
      ]);
      const servicosMap = new Map<string, number>();
      servicos.forEach(servico => {
        servicosMap.set(servico.id, servico.valor);
      });
      let agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = new Date(ag.data + 'T00:00:00');
        return dataAgendamento >= inicio && dataAgendamento < fim;
      });
      if (unidadeId !== "todos") {
        const unidade = unidades.find(u => u.id === unidadeId);
        if (unidade) {
          const colaboradores = await import("../utils/firestoreColaboradores").then(m => m.listarColaboradores());
          const normalizar = (str: string) => str.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
          const nomesColaboradoresUnidade = colaboradores
            .filter(col => col.unidadeNome && normalizar(col.unidadeNome) === normalizar(unidade.nome))
            .map(col => normalizar(col.nomeCompleto));
          agendamentosPeriodo = agendamentosPeriodo.filter(ag => nomesColaboradoresUnidade.includes(normalizar(ag.colaboradorNome || "")));
        }
      }
      const receitaServicos = agendamentosPeriodo.reduce((total, agendamento) => {
        const precoServico = servicosMap.get(agendamento.servicoId) || 0;
        return total + precoServico;
      }, 0);
      setReceitaServicos(receitaServicos);
    } catch {
      setReceitaServicos(0);
    } finally {
      setLoadingServicos(false);
    }
  }, [unidades]);

  // Buscar receita de produtos
  const buscarReceitaProdutos = useCallback(async (periodo: Periodo) => {
    setLoadingProdutos(true);
    try {
      const { inicio, fim } = getIntervaloPeriodo(periodo);
      const vendas = await listarVendasProdutos();
      const vendasPeriodo = vendas.filter(venda => {
        if (!venda.dataVenda) return false;
        const dataVenda = venda.dataVenda.toDate();
        return dataVenda >= inicio && dataVenda < fim;
      });
      const receitaProdutos = vendasPeriodo.reduce((total, venda) => {
        return total + venda.totalVenda;
      }, 0);
      setReceitaProdutos(receitaProdutos);
    } catch {
      setReceitaProdutos(0);
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  useEffect(() => {
    buscarReceitaTotal(periodoTotal);
  }, [periodoTotal, buscarReceitaTotal]);

  useEffect(() => {
    buscarReceitaServicos(periodoServicos, unidadeSelecionada);
  }, [periodoServicos, unidadeSelecionada, buscarReceitaServicos]);

  useEffect(() => {
    buscarReceitaProdutos(periodoProdutos);
  }, [periodoProdutos, buscarReceitaProdutos]);

  return (
    <>
      <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
        <div className="flex flex-wrap items-center gap-2 mb-2 min-w-0 overflow-x-auto">
          <FaChartLine className="text-green-600 text-2xl" />
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                periodoTotal === opt.value
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPeriodoTotal(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-800 font-semibold uppercase tracking-wide mb-2">Receita Total</span>
        <div className="flex items-end gap-3">
          {loadingTotal ? (
            <span className="text-4xl font-bold text-gray-400">...</span>
          ) : (
            <span className="text-4xl font-bold text-green-600">{formatarPreco(receitaTotal)}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">({periodOptions.find(p => p.value === periodoTotal)?.label} atual)</span>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
        <div className="flex flex-wrap items-center gap-2 mb-2 min-w-0 overflow-x-auto">
          <FaChartLine className="text-green-600 text-2xl" />
          <span className="text-sm text-gray-800 font-semibold uppercase tracking-wide">Receita de Serviços</span>
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
          <div className="flex gap-1 ml-2">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  periodoServicos === opt.value
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => setPeriodoServicos(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-800 font-semibold uppercase tracking-wide mb-2">Receita de Serviços</span>
        <div className="flex items-end gap-3">
          {loadingServicos ? (
            <span className="text-4xl font-bold text-gray-400">...</span>
          ) : (
            <span className="text-4xl font-bold text-green-600">{formatarPreco(receitaServicos)}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">({periodOptions.find(p => p.value === periodoServicos)?.label} atual)</span>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
        <div className="flex flex-wrap items-center gap-2 mb-2 min-w-0 overflow-x-auto">
          <FaChartLine className="text-green-600 text-2xl" />
          <span className="text-sm text-gray-800 font-semibold uppercase tracking-wide">Receita de Produtos</span>
          <div className="flex gap-1 ml-2">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  periodoProdutos === opt.value
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => setPeriodoProdutos(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-800 font-semibold uppercase tracking-wide mb-2">Receita de Produtos</span>
        <div className="flex items-end gap-3">
          {loadingProdutos ? (
            <span className="text-4xl font-bold text-gray-400">...</span>
          ) : (
            <span className="text-4xl font-bold text-green-600">{formatarPreco(receitaProdutos)}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">({periodOptions.find(p => p.value === periodoProdutos)?.label} atual)</span>
      </section>
    </>
  );
} 
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaDollarSign, FaChartLine } from "react-icons/fa";
import { listarAgendamentos } from "../utils/firestoreAgendamentos";
import { listarVendasProdutos } from "../utils/firestoreProdutos";
import { listarServicos } from "../utils/firestoreServicos";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

interface ReceitaFinanceira {
  servicos: number;
  produtos: number;
  total: number;
}

export default function BlocoInformacoesFinanceiras() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [receita, setReceita] = useState<ReceitaFinanceira>({ servicos: 0, produtos: 0, total: 0 });
  const [loading, setLoading] = useState<boolean>(true);

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

  // Buscar informações financeiras do período
  const buscarInformacoesFinanceiras = useCallback(async (periodo: Periodo) => {
    setLoading(true);
    try {
      const { inicio, fim } = getIntervaloPeriodo(periodo);
      // Buscar agendamentos finalizados, vendas de produtos e serviços
      const [agendamentos, vendas, servicos] = await Promise.all([
        listarAgendamentos({ status: "finalizado" }),
        listarVendasProdutos(),
        listarServicos()
      ]);
      // Criar mapa de serviços para buscar preços
      const servicosMap = new Map<string, number>();
      servicos.forEach(servico => {
        servicosMap.set(servico.id, servico.valor);
      });
      // Filtrar agendamentos por período
      const agendamentosPeriodo = agendamentos.filter(ag => {
        const dataAgendamento = new Date(ag.data + 'T00:00:00');
        return dataAgendamento >= inicio && dataAgendamento < fim;
      });
      // Filtrar vendas por período
      const vendasPeriodo = vendas.filter(venda => {
        if (!venda.dataVenda) return false;
        const dataVenda = venda.dataVenda.toDate();
        return dataVenda >= inicio && dataVenda < fim;
      });
      // Calcular receita de serviços (agendamentos finalizados)
      const receitaServicos = agendamentosPeriodo.reduce((total, agendamento) => {
        const precoServico = servicosMap.get(agendamento.servicoId) || 0;
        return total + precoServico;
      }, 0);
      // Calcular receita de produtos
      const receitaProdutos = vendasPeriodo.reduce((total, venda) => {
        return total + venda.totalVenda;
      }, 0);
      const receitaTotal = receitaServicos + receitaProdutos;
      setReceita({
        servicos: receitaServicos,
        produtos: receitaProdutos,
        total: receitaTotal
      });
    } catch (error) {
      console.error("Erro ao buscar informações financeiras:", error);
      setReceita({ servicos: 0, produtos: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar dados quando mudar o período
  useEffect(() => {
    buscarInformacoesFinanceiras(periodo);
  }, [periodo, buscarInformacoesFinanceiras]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaDollarSign className="text-green-600 text-2xl" />
        <div className="flex gap-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                periodo === opt.value
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPeriodo(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Informações Financeiras</span>
      
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span className="text-gray-400">Carregando...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Receita Total */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FaChartLine className="text-green-600 text-lg" />
                <span className="text-sm font-medium text-green-800">Receita Total</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatarPreco(receita.total)}
              </div>
            </div>
            
            {/* Receita de Serviços */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-800">Serviços</span>
                <span className="text-sm font-semibold text-blue-900">
                  {formatarPreco(receita.servicos)}
                </span>
              </div>
            </div>
            
            {/* Receita de Produtos */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-purple-800">Produtos</span>
                <span className="text-sm font-semibold text-purple-900">
                  {formatarPreco(receita.produtos)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {!loading && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          ({periodOptions.find(p => p.value === periodo)?.label} atual)
        </div>
      )}
    </section>
  );
} 
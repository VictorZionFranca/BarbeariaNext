"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaShoppingCart, FaTrophy } from "react-icons/fa";
import { listarVendasProdutos, listarProdutos } from "../utils/firestoreProdutos";
import type { Produto } from "../utils/firestoreProdutos";
import Image from "next/image";

const periodOptions = [
  { label: "Dia", value: "dia" },
  { label: "Mês", value: "mes" },
  { label: "Ano", value: "ano" },
] as const;

type Periodo = typeof periodOptions[number]["value"];

interface ProdutoVendido {
  nome: string;
  imagemURL: string;
  quantidadeTotal: number;
  totalVendas: number;
}

export default function BlocoProdutosMaisVendidos() {
  const [periodo, setPeriodo] = useState<Periodo>("ano");
  const [produtosVendidos, setProdutosVendidos] = useState<ProdutoVendido[]>([]);
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

  // Buscar produtos mais vendidos do período
  const buscarProdutosMaisVendidos = useCallback(async (periodo: Periodo) => {
    setLoading(true);
    try {
      const { inicio, fim } = getIntervaloPeriodo(periodo);
      // Buscar todas as vendas e produtos
      const [vendas, produtos] = await Promise.all([
        listarVendasProdutos(),
        listarProdutos()
      ]);
      // Criar mapa de produtos para buscar imagens
      const produtosMap = new Map<string, Produto>();
      produtos.forEach(produto => {
        produtosMap.set(produto.id, produto);
      });
      // Filtrar por período
      const vendasPeriodo = vendas.filter(venda => {
        if (!venda.dataVenda) return false;
        const dataVenda = venda.dataVenda.toDate();
        return dataVenda >= inicio && dataVenda < fim;
      });
      // Agrupar vendas por produto
      const produtosAgrupados: Record<string, ProdutoVendido> = {};
      vendasPeriodo.forEach(venda => {
        if (!produtosAgrupados[venda.produtoId]) {
          const produto = produtosMap.get(venda.produtoId);
          produtosAgrupados[venda.produtoId] = {
            nome: venda.nomeProduto,
            imagemURL: produto?.imagemURL || "",
            quantidadeTotal: 0,
            totalVendas: 0,
          };
        }
        produtosAgrupados[venda.produtoId].quantidadeTotal += venda.quantidadeVendida;
        produtosAgrupados[venda.produtoId].totalVendas += venda.totalVenda;
      });
      // Converter para array e ordenar por quantidade vendida
      const produtosOrdenados = Object.values(produtosAgrupados)
        .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
        .slice(0, 3); // Top 3 produtos
      setProdutosVendidos(produtosOrdenados);
    } catch (error) {
      console.error("Erro ao buscar produtos mais vendidos:", error);
      setProdutosVendidos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar dados quando mudar o período
  useEffect(() => {
    buscarProdutosMaisVendidos(periodo);
  }, [periodo, buscarProdutosMaisVendidos]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaTrophy className="text-yellow-600 text-2xl" />
        <div className="flex flex-wrap gap-1 min-w-0 overflow-x-auto">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                periodo === opt.value
                  ? "bg-yellow-600 text-white border-yellow-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPeriodo(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Produtos Mais Vendidos</span>
      
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span className="text-gray-400">Carregando...</span>
          </div>
        ) : produtosVendidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 text-center">
            <FaShoppingCart className="text-gray-300 text-2xl mb-1" />
            <span className="text-gray-500 text-sm">Nenhuma venda</span>
            <span className="text-xs text-gray-400">({periodOptions.find(p => p.value === periodo)?.label} atual)</span>
          </div>
        ) : (
          <div className="space-y-2">
            {produtosVendidos.map((produto, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    {produto.imagemURL ? (
                      <Image
                        src={produto.imagemURL}
                        alt={produto.nome}
                        width={32}
                        height={32}
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <FaShoppingCart className="text-gray-400 text-sm" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-yellow-600">#{index + 1}</span>
                    <h3 className="text-xs font-semibold text-gray-900 truncate">
                      {produto.nome}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600">
                      {produto.quantidadeTotal} unidade{produto.quantidadeTotal === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs font-semibold text-green-600">
                      {formatarPreco(produto.totalVendas)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {!loading && produtosVendidos.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          Top 3 produtos ({periodOptions.find(p => p.value === periodo)?.label} atual)
        </div>
      )}
    </section>
  );
} 
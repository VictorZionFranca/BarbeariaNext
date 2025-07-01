"use client";
import React, {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  listarProdutos,
  criarProdutoComIdIncremental,
  atualizarProduto,
  deletarProduto,
  Produto,
} from "../utils/firestoreProdutos";
import { FaPencilAlt, FaTrash, FaPlus, FaEye } from "react-icons/fa";
import { createPortal } from "react-dom";
import Image from "next/image";


const camposIniciais = {
  nome: "",
  descricao: "",
  preco: 0,
  quantidade: 0,
  imagemURL: "",
  ativo: true,
};

export default function ProdutosManager() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(camposIniciais);
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalExcluir, setModalExcluir] = useState<{
    aberto: boolean;
    id: string | null;
  }>({ aberto: false, id: null });
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalVisualizar, setModalVisualizar] = useState<{
    aberto: boolean;
    produto: Produto | null;
  }>({ aberto: false, produto: null });
  const [modalAnimando, setModalAnimando] = useState<
    "cadastro" | "editar" | "excluir" | "visualizar" | null
  >(null);

  const carregarProdutos = useCallback(async () => {
    const lista = await listarProdutos();
    setProdutos(lista);
  }, []);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    if (
      !form.nome ||
      !form.descricao ||
      form.preco <= 0 ||
      form.quantidade < 0 ||
      !form.imagemURL
    ) {
      setErro("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    try {
      if (editId) {
        await atualizarProduto(editId, form);
      } else {
        await criarProdutoComIdIncremental(form);
      }
      setForm(camposIniciais);
      setEditId(null);
      setErro("");
      carregarProdutos();
      setModalCadastro(false);
      setModalEditar(false);
    } catch (error) {
      console.error("Erro ao processar produto:", error);
      setErro("Erro ao processar o produto. Tente novamente.");
    }
  }

  function handleEditar(produto: Produto) {
    setForm({
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      quantidade: produto.quantidade,
      imagemURL: produto.imagemURL,
      ativo: produto.ativo,
    });
    setEditId(produto.id);
    setModalEditar(true);
    setModalAnimando("editar");
    setTimeout(() => setModalAnimando(null), 100);
  }

  function handleVisualizar(produto: Produto) {
    setModalVisualizar({ aberto: true, produto });
    setModalAnimando("visualizar");
    setTimeout(() => setModalAnimando(null), 100);
  }

  async function handleExcluir(id: string) {
    try {
      setModalExcluir({ aberto: true, id });
      setModalAnimando("excluir");
      setTimeout(() => setModalAnimando(null), 100);
    } catch (error) {
      console.error("Erro ao abrir modal de exclusão:", error);
      setErro("Erro ao tentar excluir o produto.");
    }
  }

  async function confirmarExcluir() {
    if (modalExcluir.id) {
      try {
        await deletarProduto(modalExcluir.id);
        setModalExcluir({ aberto: false, id: null });
        setModalAnimando(null);
        setProdutos(produtos.filter((p) => p.id !== modalExcluir.id));
        setErro("Produto excluído com sucesso!");
        setTimeout(() => setErro(null), 3000);
      } catch (error) {
        console.error("Erro ao excluir produto:", error);
        setErro("Não foi possível excluir o produto. Tente novamente.");
      }
    }
  }

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  function fecharModalCadastroAnimado() {
    setModalAnimando("cadastro");
    setTimeout(() => {
      setModalCadastro(false);
      setModalAnimando(null);
      setForm(camposIniciais);
      setErro("");
    }, 300);
  }

  function fecharModalEditarAnimado() {
    setModalAnimando("editar");
    setTimeout(() => {
      setModalEditar(false);
      setModalAnimando(null);
      setForm(camposIniciais);
      setEditId(null);
      setErro("");
    }, 300);
  }

  function fecharModalExcluirAnimado() {
    setModalAnimando("excluir");
    setTimeout(() => {
      setModalExcluir({ aberto: false, id: null });
      setModalAnimando(null);
    }, 300);
  }

  function fecharModalVisualizarAnimado() {
    setModalAnimando("visualizar");
    setTimeout(() => {
      setModalVisualizar({ aberto: false, produto: null });
      setModalAnimando(null);
    }, 300);
  }

  function truncarTexto(texto: string, limite: number) {
    if (!texto) return "";
    if (texto.length <= limite) return texto;
    return texto.slice(0, limite) + "...";
  }

  // Função utilitária para formatar preço igual à página de serviços
  function formatarPreco(preco: number) {
    return `R$ ${preco.toFixed(2).replace('.', ',')}`;
  }

  return (
    <div className="flex flex-col min-h-[78vh]">
      <div className="flex mb-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-[400px]">
            <h1 className="text-2xl font-bold text-black my-8">Produtos</h1>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="border p-2 rounded text-black w-full pr-8"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2 bottom-1 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                aria-label="Limpar busca"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg min-w-[180px] transition-colors duration-200 hover:bg-green-700 flex items-center gap-2"
          onClick={() => {
            setModalCadastro(true);
            setEditId(null);
            setForm(camposIniciais);
            setModalAnimando("cadastro");
            setTimeout(() => setModalAnimando(null), 100);
          }}
        >
          <FaPlus className="h-4 w-4" />
          Cadastrar Produto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imagem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {produtosFiltrados.filter(p => p.ativo).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nenhum produto ativo encontrado.
                  </td>
                </tr>
              ) : (
                produtosFiltrados.filter(p => p.ativo).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative h-24 w-24">
                        <Image
                          src={p.imagemURL}
                          alt={p.nome}
                          fill
                          className="object-contain rounded"
                          sizes="96px"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {truncarTexto(p.nome, 30)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {truncarTexto(p.descricao, 50)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatarPreco(p.preco)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {p.quantidade} unidades
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVisualizar(p)}
                          className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                          title="Visualizar"
                        >
                          <FaEye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEditar(p)}
                          className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                          title="Editar"
                        >
                          <FaPencilAlt className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleExcluir(p.id)}
                          className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors duration-200"
                          title="Excluir"
                        >
                          <FaTrash className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção de Produtos Inativos */}
      {produtosFiltrados.filter(p => !p.ativo).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">Produtos Inativos</h2>
          <div className="bg-gray-50 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Imagem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 divide-y divide-gray-200">
                  {produtosFiltrados.filter(p => !p.ativo).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative h-24 w-24">
                          <Image
                            src={p.imagemURL}
                            alt={p.nome}
                            fill
                            className="object-contain rounded opacity-75"
                            sizes="96px"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-600">
                          {truncarTexto(p.nome, 30)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {truncarTexto(p.descricao, 50)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatarPreco(p.preco)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">
                          {p.quantidade} unidades
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVisualizar(p)}
                            className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                            title="Visualizar"
                          >
                            <FaEye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEditar(p)}
                            className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                            title="Editar"
                          >
                            <FaPencilAlt className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleExcluir(p.id)}
                            className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors duration-200"
                            title="Excluir"
                          >
                            <FaTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {modalVisualizar.aberto &&
        modalVisualizar.produto &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModalVisualizarAnimado();
              }
            }}
          >
            <div
              className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
                transform transition-all duration-300
                ${
                  modalAnimando === "visualizar"
                    ? "opacity-0 -translate-y-80 scale-95"
                    : "opacity-100 translate-y-0 scale-100"
                }
                overflow-y-auto max-h-[90vh]`}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={fecharModalVisualizarAnimado}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-black">
                Detalhes do Produto
              </h2>
              <div className="space-y-4">
                <div className="relative h-96 w-full">
                  <Image
                    src={modalVisualizar.produto.imagemURL}
                    alt={modalVisualizar.produto.nome}
                    fill
                    className="object-contain rounded-lg"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {modalVisualizar.produto.nome}
                  </h3>
                  <p className="text-gray-600 mt-2">
                    {modalVisualizar.produto.descricao}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Preço</span>
                    <p className="text-lg text-black font-bold">
                      {formatarPreco(modalVisualizar.produto.preco)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Estoque</span>
                    <p className="text-lg font-semibold text-gray-800">
                      {modalVisualizar.produto.quantidade} unidades
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de confirmação de exclusão */}
      {modalExcluir.aberto &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModalExcluirAnimado();
              }
            }}
          >
            <div
              className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative
                transform transition-all duration-300
                ${
                  modalAnimando === "excluir"
                    ? "opacity-0 -translate-y-80 scale-95"
                    : "opacity-100 translate-y-0 scale-100"
                }
              `}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={fecharModalExcluirAnimado}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-black">
                Excluir Produto
              </h2>
              <p className="text-center text-black mb-8">
                Tem certeza que deseja excluir este produto?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={confirmarExcluir}
                  className="bg-red-600 hover:bg-red-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Excluir
                </button>
                <button
                  onClick={fecharModalExcluirAnimado}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de Cadastro */}
      {modalCadastro &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModalCadastroAnimado();
              }
            }}
          >
            <div
              className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
                transform transition-all duration-300
                ${
                  modalAnimando === "cadastro"
                    ? "opacity-0 -translate-y-80 scale-95"
                    : "opacity-100 translate-y-0 scale-100"
                }
                overflow-y-auto max-h-[90vh]`}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={fecharModalCadastroAnimado}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-black">
                Cadastrar Produto
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    name="nome"
                    id="nome"
                    placeholder=" "
                    value={form.nome}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                    required
                  />
                  <label
                    htmlFor="nome"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    Nome do Produto
                  </label>
                </div>
                <div className="relative">
                  <textarea
                    name="descricao"
                    id="descricao"
                    placeholder=" "
                    value={form.descricao}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full min-h-[100px]"
                    required
                  />
                  <label
                    htmlFor="descricao"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    Descrição
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      name="preco"
                      id="preco"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder=" "
                      value={form.preco}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label
                      htmlFor="preco"
                      className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                    >
                      Preço
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      name="quantidade"
                      id="quantidade"
                      type="number"
                      min="0"
                      placeholder=" "
                      value={form.quantidade}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label
                      htmlFor="quantidade"
                      className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                    >
                      Quantidade
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <input
                    name="imagemURL"
                    id="imagemURL"
                    type="url"
                    placeholder=" "
                    value={form.imagemURL}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                    required
                  />
                  <label
                    htmlFor="imagemURL"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    URL da Imagem
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="ativo"
                      checked={form.ativo}
                      onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">Produto Ativo</span>
                  </label>
                </div>
                {erro && (
                  <span className="text-red-500 text-center">{erro}</span>
                )}
                <div className="flex gap-4 mt-4 justify-center">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                  >
                    Cadastrar
                  </button>
                  <button
                    type="button"
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                    onClick={fecharModalCadastroAnimado}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de Edição */}
      {modalEditar &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModalEditarAnimado();
              }
            }}
          >
            <div
              className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
                transform transition-all duration-300
                ${
                  modalAnimando === "editar"
                    ? "opacity-0 -translate-y-80 scale-95"
                    : "opacity-100 translate-y-0 scale-100"
                }
                overflow-y-auto max-h-[90vh]`}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={fecharModalEditarAnimado}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-black">
                Editar Produto
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    name="nome"
                    id="nome"
                    placeholder=" "
                    value={form.nome}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                    required
                  />
                  <label
                    htmlFor="nome"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    Nome do Produto
                  </label>
                </div>
                <div className="relative">
                  <textarea
                    name="descricao"
                    id="descricao"
                    placeholder=" "
                    value={form.descricao}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full min-h-[100px]"
                    required
                  />
                  <label
                    htmlFor="descricao"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    Descrição
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      name="preco"
                      id="preco"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder=" "
                      value={form.preco}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label
                      htmlFor="preco"
                      className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                    >
                      Preço
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      name="quantidade"
                      id="quantidade"
                      type="number"
                      min="0"
                      placeholder=" "
                      value={form.quantidade}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label
                      htmlFor="quantidade"
                      className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                    >
                      Quantidade
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <input
                    name="imagemURL"
                    id="imagemURL"
                    type="url"
                    placeholder=" "
                    value={form.imagemURL}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                    required
                  />
                  <label
                    htmlFor="imagemURL"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    URL da Imagem
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="ativo"
                      checked={form.ativo}
                      onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">Produto Ativo</span>
                  </label>
                </div>
                {erro && (
                  <span className="text-red-500 text-center">{erro}</span>
                )}
                <div className="flex gap-4 mt-4 justify-center">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                    onClick={fecharModalEditarAnimado}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

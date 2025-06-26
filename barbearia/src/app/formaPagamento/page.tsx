"use client";
import React, { useState, useEffect } from "react";
import { FaPlus, FaPencilAlt, FaTrash } from "react-icons/fa";
import { createPortal } from "react-dom";
import {
  listarFormasPagamento,
  criarFormaPagamento,
  atualizarFormaPagamento,
  deletarFormaPagamento,
  FormaPagamento,
} from "../utils/firestoreFormaPagamento";

const camposIniciais = {
  nome: "",
  ativo: true,
};

export default function FormaPagamentoManager() {
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
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
  const [modalAnimando, setModalAnimando] = useState<
    "cadastro" | "editar" | "excluir" | null
  >(null);

  useEffect(() => {
    carregarFormasPagamento();
  }, []);

  async function carregarFormasPagamento() {
    try {
      const lista = await listarFormasPagamento();
      setFormasPagamento(lista);
    } catch (error) {
      console.error("Erro ao carregar formas de pagamento:", error);
      setErro("Erro ao carregar formas de pagamento");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    if (!form.nome) {
      setErro("O nome é obrigatório.");
      return;
    }

    try {
      if (editId) {
        await atualizarFormaPagamento(editId, form);
      } else {
        await criarFormaPagamento(form);
      }
      setForm(camposIniciais);
      setEditId(null);
      setErro("");
      carregarFormasPagamento();
      setModalCadastro(false);
      setModalEditar(false);
    } catch (error) {
      console.error("Erro ao processar forma de pagamento:", error);
      setErro("Erro ao processar a forma de pagamento. Tente novamente.");
    }
  }

  function handleEditar(formaPagamento: FormaPagamento) {
    if (!formaPagamento.id) return;
    setForm({
      nome: formaPagamento.nome,
      ativo: formaPagamento.ativo,
    });
    setEditId(formaPagamento.id);
    setModalEditar(true);
    setModalAnimando("editar");
    setTimeout(() => setModalAnimando(null), 100);
  }

  async function handleExcluir(id: string) {
    try {
      setModalExcluir({ aberto: true, id });
      setModalAnimando("excluir");
      setTimeout(() => setModalAnimando(null), 100);
    } catch (error) {
      console.error("Erro ao abrir modal de exclusão:", error);
      setErro("Erro ao tentar excluir a forma de pagamento.");
    }
  }

  async function confirmarExcluir() {
    if (modalExcluir.id) {
      try {
        await deletarFormaPagamento(modalExcluir.id);
        setModalExcluir({ aberto: false, id: null });
        setModalAnimando(null);
        setFormasPagamento(formasPagamento.filter((fp) => fp.id !== modalExcluir.id));
        setTimeout(() => setErro(null), 3000);
      } catch (error) {
        console.error("Erro ao excluir forma de pagamento:", error);
        setErro("Não foi possível excluir a forma de pagamento. Tente novamente.");
      }
    }
  }

  const formasPagamentoFiltradas = formasPagamento.filter(
    (fp) =>
      fp.nome.toLowerCase().includes(busca.toLowerCase())
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

  return (
    <div className="flex flex-col min-h-[78vh]">
      <div className="flex mb-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-[400px]">
            <h1 className="text-2xl font-bold text-black my-8">Formas de Pagamento</h1>
            <input
              type="text"
              placeholder="Buscar forma de pagamento..."
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
          Cadastrar Forma de Pagamento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formasPagamentoFiltradas.filter(fp => fp.ativo).length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma forma de pagamento ativa encontrada.
                  </td>
                </tr>
              ) : (
                formasPagamentoFiltradas.filter(fp => fp.ativo).map((fp) => (
                  <tr key={fp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {fp.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditar(fp)}
                          className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                          title="Editar"
                        >
                          <FaPencilAlt className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleExcluir(fp.id)}
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

      {/* Seção de Formas de Pagamento Inativas */}
      {formasPagamentoFiltradas.filter(fp => !fp.ativo).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">Formas de Pagamento Inativas</h2>
          <div className="bg-gray-50 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 divide-y divide-gray-200">
                  {formasPagamentoFiltradas.filter(fp => !fp.ativo).map((fp) => (
                    <tr key={fp.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-600">
                          {fp.nome}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditar(fp)}
                            className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                            title="Editar"
                          >
                            <FaPencilAlt className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleExcluir(fp.id)}
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
                Excluir Forma de Pagamento
              </h2>
              <p className="text-center text-black mb-8">
                Tem certeza que deseja excluir esta forma de pagamento?
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
                Cadastrar Forma de Pagamento
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
                    Nome
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
                    <span className="ml-3 text-sm font-medium text-gray-900">Forma de Pagamento Ativa</span>
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
                Editar Forma de Pagamento
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
                    Nome
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
                    <span className="ml-3 text-sm font-medium text-gray-900">Forma de Pagamento Ativa</span>
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
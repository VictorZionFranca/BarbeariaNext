"use client";
import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { db } from "../../lib/firebaseConfig";
import { collection, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FaPencilAlt, FaTrash, FaPlus } from "react-icons/fa";

interface FormaPagamento {
  id?: string;
  nome: string;
  criadoEm?: Date | null;
}

const formasPagamentoCollection = collection(db, "formaPagamento");

export default function FormaPagamentoPage() {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [form, setForm] = useState({ nome: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState(false);
  const [modalAnimando, setModalAnimando] = useState<"abrindo" | "fechando" | null>(null);
  const [busca, setBusca] = useState("");
  const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);
  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);
  const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
  const [modalExcluirAnimando, setModalExcluirAnimando] = useState<"abrindo" | "fechando" | null>(null);
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalCadastroAnimando, setModalCadastroAnimando] = useState<"abrindo" | "fechando" | null>(null);

  async function carregarFormas() {
    const snapshot = await getDocs(formasPagamentoCollection);
    setFormas(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FormaPagamento[]);
  }

  useEffect(() => {
    carregarFormas();
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErro(""); // limpa o erro ao digitar
  }

  // Função para mostrar notificação
  function mostrarNotificacao(mensagem: string, tipo: "sucesso" | "erro") {
    setNotificacao({ mensagem, tipo });
    setNotificacaoVisivel(true);
    setTimeout(() => {
      setNotificacaoVisivel(false);
      setTimeout(() => setNotificacao(null), 200); 
    }, 2500);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }

    // Validação: não permitir nomes duplicados ao cadastrar ou editar
    const nomeNormalizado = form.nome.trim().toLowerCase();
    const jaExiste = formas.some(f =>
      f.nome.trim().toLowerCase() === nomeNormalizado &&
      (!editId || f.id !== editId)
    );
    if (jaExiste) {
      setErro("Já existe uma forma de pagamento com esse nome.");
      return;
    }

    if (editId) {
      await updateDoc(doc(formasPagamentoCollection, editId), {
        nome: form.nome,
      });
      mostrarNotificacao("Forma de pagamento editada com sucesso!", "sucesso");
      fecharModalAnimado(); // Fecha o modal de edição
    } else {
      await setDoc(doc(formasPagamentoCollection, form.nome), {
        nome: form.nome,
        criadoEm: serverTimestamp(),
      });
      mostrarNotificacao("Forma de pagamento cadastrada com sucesso!", "sucesso");
      fecharModalCadastroAnimado(); // Fecha o modal de cadastro
    }
    setForm({ nome: "" });
    setEditId(null);
    setErro("");
    carregarFormas();
  }

  // Função para abrir modal de exclusão
  function abrirModalExcluirAnimado(id: string) {
    setModalExcluir({ aberto: true, id });
    setModalExcluirAnimando("abrindo");
    setTimeout(() => setModalExcluirAnimando(null), 100);
  }

  // Função para fechar modal de exclusão
  function fecharModalExcluirAnimado() {
    setModalExcluirAnimando("fechando");
    setTimeout(() => {
      setModalExcluir({ aberto: false, id: null });
      setModalExcluirAnimando(null);
    }, 300);
  }

  // Função para confirmar exclusão
  async function confirmarExcluir() {
    if (modalExcluir.id) {
      await deleteDoc(doc(formasPagamentoCollection, modalExcluir.id));
      mostrarNotificacao("Forma de pagamento excluída!", "erro");
      carregarFormas();
      fecharModalExcluirAnimado();
    }
  }

  function handleEditar(forma: FormaPagamento) {
    setForm({ nome: forma.nome });
    setEditId(forma.id!);
    abrirModalAnimado();
  }

  function abrirModalAnimado() {
    setModal(true);
    setModalAnimando("abrindo");
    setTimeout(() => setModalAnimando(null), 100);
  }

  function fecharModalAnimado() {
    setModalAnimando("fechando");
    setTimeout(() => {
      setModal(false);
      setModalAnimando(null);
      setForm({ nome: "" });
      setEditId(null);
      setErro("");
    }, 300);
  }

  // Função para abrir modal de cadastro animado
  function abrirModalCadastroAnimado() {
    setModalCadastro(true);
    setModalCadastroAnimando("abrindo");
    setTimeout(() => setModalCadastroAnimando(null), 100);
  }

  // Função para fechar modal de cadastro animado
  function fecharModalCadastroAnimado() {
    setModalCadastroAnimando("fechando");
    setTimeout(() => {
      setModalCadastro(false);
      setModalCadastroAnimando(null);
      setForm({ nome: "" });
      setEditId(null);
      setErro("");
    }, 300);
  }

  // Filtro aplicado na lista
  const formasFiltradas = formas.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-[78vh]">
      <div className="flex mb-4 items-center justify-between">
        <div className="relative w-[400px]">
          <h1 className="text-2xl font-bold text-black my-8">Formas de Pagamento</h1>
          <input
            type="text"
            placeholder="Buscar forma de pagamento..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="border p-2 rounded text-black w-full pr-8"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-2 top-1/2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              aria-label="Limpar busca"
              style={{ transform: "translateY(100%)" }}
            >
              ×
            </button>
          )}
        </div>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-green-700 flex items-center gap-2"
          onClick={abrirModalCadastroAnimado}
        >
          <FaPlus className="h-4 w-4" />
          Nova Forma de Pagamento
        </button>
      </div>
      <table className="w-full bg-white text-black rounded-xl shadow overflow-hidden">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="p-4 text-left font-semibold text-gray-700">Nome</th>
            <th className="p-4 text-left font-semibold text-gray-700">Ações</th>
          </tr>
        </thead>
        <tbody>
          {formasFiltradas.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-6 text-center text-gray-500">
                Nenhuma forma de pagamento cadastrada.
              </td>
            </tr>
          ) : (
            formasFiltradas.map((f) => (
              <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-4 align-middle">{f.nome}</td>
                <td className="p-4 align-middle">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditar(f)}
                      className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
                      title="Editar"
                    >
                      <FaPencilAlt className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => abrirModalExcluirAnimado(f.id!)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-red-800"
                      title="Excluir"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {modal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              fecharModalAnimado();
            }
          }}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative
              transform transition-all duration-300
              ${modalAnimando === "abrindo" ? "opacity-0 -translate-y-80 scale-95" : ""}
              ${modalAnimando === "fechando" ? "opacity-0 translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
              `}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={fecharModalAnimado}
              aria-label="Fechar"
              type="button"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center text-black">
              {editId ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
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
                  Nome da Forma de Pagamento
                </label>
              </div>
              {erro && <span className="text-red-500 text-center">{erro}</span>}
              <div className="flex gap-4 mt-4 justify-center">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  {editId ? "Salvar Alterações" : "Cadastrar"}
                </button>
                <button
                  type="button"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                  onClick={fecharModalAnimado}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalExcluir.aberto && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              fecharModalExcluirAnimado();
            }
          }}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative
              transform transition-all duration-300
              ${modalExcluirAnimando === "abrindo" ? "opacity-0 -translate-y-80 scale-95" : ""}
              ${modalExcluirAnimando === "fechando" ? "opacity-0 translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
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
            <h2 className="text-2xl font-bold mb-6 text-center text-black">Excluir Forma de Pagamento</h2>
            <p className="text-center text-black mb-8">Tem certeza que deseja excluir esta forma de pagamento?</p>
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
        </div>
      )}
      {modalCadastro && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              fecharModalCadastroAnimado();
            }
          }}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative
              transform transition-all duration-300
              ${modalCadastroAnimando === "abrindo" ? "opacity-0 -translate-y-80 scale-95" : ""}
              ${modalCadastroAnimando === "fechando" ? "opacity-0 translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
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
              {editId ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
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
                  Nome da Forma de Pagamento
                </label>
              </div>
              {erro && <span className="text-red-500 text-center">{erro}</span>}
              <div className="flex gap-4 mt-4 justify-center">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  {editId ? "Salvar Alterações" : "Cadastrar"}
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
        </div>
      )}
      {notificacao && (
        <div
          className={`
            fixed bottom-6 right-6 z-[99999] px-6 py-4 rounded-lg shadow-lg text-white font-semibold
            ${notificacao.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"}
            ${notificacaoVisivel ? "animate-slide-in-right" : "animate-slide-out-right"}
          `}
          style={{ pointerEvents: "none" }}
        >
          {notificacao.mensagem}
        </div>
      )}
    </div>
  );
}
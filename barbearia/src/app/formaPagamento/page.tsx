"use client";
import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { db } from "../../lib/firebaseConfig";
import { collection, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FaPencilAlt, FaTrash } from "react-icons/fa";

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

  async function carregarFormas() {
    const snapshot = await getDocs(formasPagamentoCollection);
    setFormas(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FormaPagamento[]);
  }

  useEffect(() => {
    carregarFormas();
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    if (editId) {
      await updateDoc(doc(formasPagamentoCollection, editId), {
        nome: form.nome,
      });
    } else {
      await setDoc(doc(formasPagamentoCollection, form.nome), {
        nome: form.nome,
        criadoEm: serverTimestamp(),
      });
    }
    setForm({ nome: "" });
    setEditId(null);
    fecharModalAnimado();
    setErro("");
    carregarFormas();
  }

  async function handleExcluir(id: string) {
    await deleteDoc(doc(formasPagamentoCollection, id));
    carregarFormas();
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

  return (
    <div className="flex flex-col min-h-[78vh]">
      <div className="flex mb-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Formas de Pagamento</h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-green-700"
          onClick={abrirModalAnimado}
        >
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
          {formas.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-6 text-center text-gray-500">
                Nenhuma forma de pagamento cadastrada.
              </td>
            </tr>
          ) : (
            formas.map((f) => (
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
                      onClick={() => handleExcluir(f.id!)}
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
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 transition-opacity duration-300">
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
              <input
                name="nome"
                placeholder="Nome"
                value={form.nome}
                onChange={handleChange}
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                required
              />
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
    </div>
  );
}
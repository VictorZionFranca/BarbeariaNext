/* eslint-disable @next/next/no-img-element */

"use client";

import { useState, useEffect } from "react";
import { FaPencilAlt, FaTrash, FaEye, FaPlus } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { createPortal } from "react-dom";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { getAuth } from "firebase/auth";
import { db } from "../../lib/firebaseConfig";
import {
  criarNoticiaComIdIncremental,
  Noticia,
} from "../utils/firestoreNoticias";

export default function NoticiasPage() {
  const auth = getAuth();
  const usuario = auth.currentUser;

  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [noticiaVisualizando, setNoticiaVisualizando] =
    useState<Noticia | null>(null);

  function abrirModalVisualizar(noticia: Noticia) {
    setNoticiaVisualizando(noticia);
    setModalVisualizarAberto(true);
    setTimeout(() => setAnimandoModalVisualizar(true), 10);
  }

  function fecharModalVisualizar() {
    setAnimandoModalVisualizar(false);
    setTimeout(() => {
      setModalVisualizarAberto(false);
    }, 300); // Tempo da animação
  }

  const { userName } = useAuth();

  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [noticiaEditando, setNoticiaEditando] = useState<Noticia | null>(null);
  const [noticiaExcluir, setNoticiaExcluir] = useState<Noticia | null>(null);

  const [formTitulo, setFormTitulo] = useState("");
  const [formConteudo, setFormConteudo] = useState("");
  const [formImagemURL, setFormImagemURL] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);

  // Carregar notícias do Firestore
  async function carregarNoticias() {
    const snapshot = await getDocs(collection(db, "noticias"));
    const lista = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Noticia, "id">),
    }));
    setNoticias(lista);
  }

  useEffect(() => {
    carregarNoticias();
  }, []);

  // Filtro de busca (título e conteúdo)
  const noticiasFiltradas = noticias.filter(
    (noticia) =>
      noticia.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      noticia.conteudo.toLowerCase().includes(busca.toLowerCase())
  );

  const [animandoModal, setAnimandoModal] = useState(false);
  const [animandoModalVisualizar, setAnimandoModalVisualizar] = useState(false);
  const [animandoModalExcluir, setAnimandoModalExcluir] = useState(false);

  // Abrir modal novo cadastro
  function abrirModalCadastro() {
    setNoticiaEditando(null);
    setFormTitulo("");
    setFormConteudo("");
    setFormImagemURL("");
    setFormAtivo(true);
    setModalAberto(true);
    setTimeout(() => setAnimandoModal(true), 10); // Dá tempo do DOM montar antes de animar
  }

  function abrirModalEditar(noticia: Noticia) {
    setNoticiaEditando(noticia);
    setFormTitulo(noticia.titulo);
    setFormConteudo(noticia.conteudo);
    setFormImagemURL(noticia.imagemURL || "");
    setFormAtivo(noticia.ativo);
    setModalAberto(true);
    setTimeout(() => setAnimandoModal(true), 10);
  }

  function fecharModal() {
    setAnimandoModal(false);
    setTimeout(() => {
      setModalAberto(false);
    }, 300); // tempo da animação
  }

  function abrirModalExcluir(noticia: Noticia) {
    setNoticiaExcluir(noticia);
    setModalExcluirAberto(true);
    setTimeout(() => setAnimandoModalExcluir(true), 10);
  }

  function fecharModalExcluir() {
    setAnimandoModalExcluir(false);
    setTimeout(() => {
      setModalExcluirAberto(false);
    }, 300);
  }

  // Salvar notícia (novo ou editar)
  async function salvarNoticia(e: React.FormEvent) {
    e.preventDefault();

    if (!usuario) {
      alert("Usuário não autenticado!");
      return;
    }

    if (noticiaEditando) {
      // Atualizar notícia existente
      const docRef = doc(db, "noticias", noticiaEditando.id);
      await updateDoc(docRef, {
        titulo: formTitulo,
        conteudo: formConteudo,
        imagemURL: formImagemURL,
        ativo: formAtivo,
        autor: userName,
      });
    } else {
      // Criar nova notícia
      await criarNoticiaComIdIncremental({
        titulo: formTitulo,
        conteudo: formConteudo,
        autor: userName,
        imagemURL: formImagemURL,
        ativo: formAtivo,
      });
    }

    await carregarNoticias();
    fecharModal();
  }

  // Confirmar exclusão
  async function confirmarExcluir() {
    if (!noticiaExcluir) return;

    await deleteDoc(doc(db, "noticias", noticiaExcluir.id));
    await carregarNoticias();
    fecharModalExcluir();
  }

  function truncarTexto(texto: string, limite: number) {
    if (!texto) return "";
    if (texto.length <= limite) return texto;
    return texto.slice(0, limite) + "...";
  }

  return (
    <div className="flex flex-col min-h-[78vh] p-6">
      <div className="flex mb-4 items-center justify-between">
        <div className="relative w-[400px]">
          <h1 className="text-2xl font-bold text-black my-8">Notícias</h1>
          <input
            type="text"
            placeholder="Buscar notícia..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
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
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
          onClick={abrirModalCadastro}
        >
          <FaPlus className="h-4 w-4" /> Nova Notícia
        </button>
      </div>

      {/* Tabela de Notícias Ativas */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imagem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conteúdo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Autor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Publicação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {noticiasFiltradas.filter((n) => n.ativo).length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Nenhuma notícia ativa encontrada.
                  </td>
                </tr>
              ) : (
                noticiasFiltradas
                  .filter((n) => n.ativo)
                  .map((n) => (
                    <tr key={n.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {n.imagemURL ? (
                          <img
                            src={n.imagemURL}
                            alt={n.titulo}
                            className="h-24 w-24 object-cover rounded-lg"
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {truncarTexto(n.titulo, 30)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {truncarTexto(n.conteudo, 50)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{n.autor}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {n.dataPublicacao
                            ? new Date(
                                n.dataPublicacao.seconds * 1000
                              ).toLocaleString()
                            : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirModalVisualizar(n)}
                            className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                            title="Visualizar"
                          >
                            <FaEye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => abrirModalEditar(n)}
                            className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                            title="Editar"
                          >
                            <FaPencilAlt className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => abrirModalExcluir(n)}
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

      {/* Seção de Notícias Inativas */}
      {noticiasFiltradas.filter((n) => !n.ativo).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">
            Notícias Inativas
          </h2>
          <div className="bg-gray-50 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Imagem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conteúdo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Autor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Publicação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 divide-y divide-gray-200">
                  {noticiasFiltradas
                    .filter((n) => !n.ativo)
                    .map((n) => (
                      <tr key={n.id} className="hover:bg-gray-100">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {n.imagemURL ? (
                            <img
                              src={n.imagemURL}
                              alt={n.titulo}
                              className="h-24 w-24 object-cover rounded-lg opacity-75"
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-600">
                            {truncarTexto(n.titulo, 30)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-400">
                            {truncarTexto(n.conteudo, 50)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{n.autor}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">
                            {n.dataPublicacao
                              ? new Date(
                                  n.dataPublicacao.seconds * 1000
                                ).toLocaleString()
                              : "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => abrirModalVisualizar(n)}
                              className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                              title="Visualizar"
                            >
                              <FaEye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => abrirModalEditar(n)}
                              className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                              title="Editar"
                            >
                              <FaPencilAlt className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => abrirModalExcluir(n)}
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

      {/* Modal Cadastro / Edição */}
      {modalAberto &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80
                ${animandoModal ? "opacity-100" : "opacity-0"}
                transition-opacity duration-300
            `}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModal();
              }
            }}
          >
            <div
              className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative border border-gray-200
                    transform transition-all duration-300
                    ${
                      animandoModal
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 -translate-y-20 scale-95"
                    }
                `}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={fecharModal}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-black">
                {noticiaEditando ? "Editar Notícia" : "Nova Notícia"}
              </h2>
              <form onSubmit={salvarNoticia} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="text"
                    id="titulo"
                    placeholder=" "
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                    required
                  />
                  <label
                    htmlFor="titulo"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    Título da Notícia
                  </label>
                </div>
                <div className="relative">
                  <textarea
                    id="conteudo"
                    placeholder=" "
                    value={formConteudo}
                    onChange={(e) => setFormConteudo(e.target.value)}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full min-h-[100px]"
                    required
                  />
                  <label
                    htmlFor="conteudo"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    Conteúdo
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    id="imagem"
                    placeholder=" "
                    value={formImagemURL}
                    onChange={(e) => setFormImagemURL(e.target.value)}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                  />
                  <label
                    htmlFor="imagem"
                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                  >
                    URL da imagem
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAtivo}
                      onChange={(e) => setFormAtivo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      Notícia Ativa
                    </span>
                  </label>
                </div>
                <div className="flex gap-4 mt-4 justify-center">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                  >
                    {noticiaEditando ? "Salvar Alterações" : "Cadastrar"}
                  </button>
                  <button
                    type="button"
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                    onClick={fecharModal}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Excluir */}
      {modalExcluirAberto &&
        createPortal(
          <div
            className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80
                ${animandoModalExcluir ? "opacity-100" : "opacity-0"}
                transition-opacity duration-300
            `}
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModalExcluir();
              }
            }}
          >
            <div
              className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative border border-gray-200
                    transform transition-all duration-300
                    ${
                      animandoModalExcluir
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 -translate-y-20 scale-95"
                    }
                `}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={fecharModalExcluir}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-black">
                Excluir Notícia
              </h2>
              <p className="text-center text-black mb-8">
                Tem certeza que deseja excluir a notícia{" "}
                <strong>{noticiaExcluir?.titulo}</strong>?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={confirmarExcluir}
                  className="bg-red-600 hover:bg-red-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Excluir
                </button>
                <button
                  onClick={fecharModalExcluir}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {modalVisualizarAberto &&
        noticiaVisualizando &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80
        ${animandoModalVisualizar ? "opacity-100" : "opacity-0"}
        transition-opacity duration-300
      `}
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModalVisualizar();
              }
            }}
          >
            <div
              className={`bg-white rounded-2xl shadow-2xl w-full max-w-xl relative overflow-hidden
          transform transition-all duration-300
          ${
            animandoModalVisualizar
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-20 scale-95"
          }
        `}
            >
              {noticiaVisualizando.imagemURL && (
                <div className="relative w-full h-full bg-neutral-100">
                  <img
                    src={noticiaVisualizando.imagemURL}
                    alt={noticiaVisualizando.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  <button
                    className="absolute top-4 right-4 bg-black bg-opacity-60 text-white hover:bg-opacity-80 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    onClick={fecharModalVisualizar}
                    aria-label="Fechar"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-4 p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {noticiaVisualizando.titulo}
                </h3>
                <div className="max-h-[40vh] overflow-y-auto">
                  <div className="text-gray-600 whitespace-pre-wrap break-words">
                    {noticiaVisualizando.conteudo}
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                  <span>Autor: {noticiaVisualizando.autor}</span>
                  <span>
                    {noticiaVisualizando.dataPublicacao
                      ? new Date(
                          noticiaVisualizando.dataPublicacao.seconds * 1000
                        ).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

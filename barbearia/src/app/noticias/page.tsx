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
import { criarNoticiaComIdIncremental, Noticia } from "../utils/firestoreNoticias";

export default function NoticiasPage() {
    const auth = getAuth();
    const usuario = auth.currentUser;

    const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
    const [noticiaVisualizando, setNoticiaVisualizando] = useState<Noticia | null>(null);

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

            <table className="w-full bg-white text-black rounded-xl shadow overflow-hidden">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-4 text-left font-semibold text-gray-700">Imagem</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Título</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Conteúdo</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Ativo</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Autor</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Data Publicação</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {noticiasFiltradas.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-6 text-center text-gray-500">
                                Nenhuma notícia cadastrada.
                            </td>
                        </tr>
                    ) : (
                        noticiasFiltradas.map((noticia) => (
                            <tr
                                key={noticia.id}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <td className="p-4 align-middle">
                                    {noticia.imagemURL ? (
                                        <img
                                            src={noticia.imagemURL}
                                            alt={noticia.titulo}
                                            className="max-w-[100px] rounded-lg"
                                        />
                                    ) : (
                                        "—"
                                    )}
                                </td>
                                <td className="p-4 align-middle font-semibold">
                                    {noticia.titulo.length > 50 ? `${noticia.titulo.slice(0, 50)}...` : noticia.titulo}
                                </td>
                                <td className="p-4 align-middle">
                                    {noticia.conteudo.length > 50 ? `${noticia.conteudo.slice(0, 50)}...` : noticia.conteudo}
                                </td>
                                <td className="p-4 align-middle">{noticia.ativo ? "Sim" : "Não"}</td>
                                <td className="p-4 align-middle">{noticia.autor}</td>
                                <td className="p-4 align-middle">
                                    {noticia.dataPublicacao
                                        ? new Date(noticia.dataPublicacao.seconds * 1000).toLocaleString()
                                        : "—"}
                                </td>
                                <td className="p-4 align-middle">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => abrirModalEditar(noticia)}
                                            className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200"
                                            title="Editar"
                                        >
                                            <FaPencilAlt className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => abrirModalExcluir(noticia)}
                                            className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center justify-center hover:bg-red-800 transition-colors duration-200"
                                            title="Excluir"
                                        >
                                            <FaTrash className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => abrirModalVisualizar(noticia)}
                                            className="bg-purple-600 text-white px-3 py-2 rounded-lg flex items-center justify-center hover:bg-purple-800 transition-colors duration-200"
                                            title="Visualizar"
                                        >
                                            <FaEye className="h-4 w-4" />
                                        </button>

                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

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
                    ${animandoModal ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-20 scale-95"}
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
                            <form onSubmit={salvarNoticia} className="flex flex-col gap-6">

                                {/* Título */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="titulo"
                                        placeholder=" "
                                        value={formTitulo}
                                        onChange={(e) => setFormTitulo(e.target.value)}
                                        className="peer w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                                        required
                                    />
                                    <label
                                        htmlFor="titulo"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Título
                                    </label>
                                </div>

                                {/* Conteúdo */}
                                <div className="relative">
                                    <textarea
                                        id="conteudo"
                                        placeholder=" "
                                        value={formConteudo}
                                        onChange={(e) => setFormConteudo(e.target.value)}
                                        className="peer w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-y text-black"
                                        rows={5}
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

                                {/* Imagem URL */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="imagem"
                                        placeholder=" "
                                        value={formImagemURL}
                                        onChange={(e) => setFormImagemURL(e.target.value)}
                                        className="peer w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
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

                                {/* Checkbox Ativo */}
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formAtivo}
                                        onChange={(e) => setFormAtivo(e.target.checked)}
                                        className="w-5 h-5"
                                    />
                                    <span className="text-black select-none">Ativo</span>
                                </label>

                                {/* Botões */}
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
                )
            }

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
                    ${animandoModalExcluir ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-20 scale-95"}
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
            {modalVisualizarAberto && noticiaVisualizando &&
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
                            className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl relative border border-gray-200
                    transform transition-all duration-300
                    ${animandoModalVisualizar ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-20 scale-95"}
                `}
                        >
                            <button
                                className="absolute top-0 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                                onClick={fecharModalVisualizar}
                                aria-label="Fechar"
                                type="button"
                            >
                                ×
                            </button>
                            {noticiaVisualizando.imagemURL && (
                                <img
                                    src={noticiaVisualizando.imagemURL}
                                    alt={noticiaVisualizando.titulo}
                                    className="w-full max-h-[300px] object-cover rounded-xl mb-2"
                                />
                            )}
                            <div className="text-sm text-gray-600 text-left mb-6">
                                <span>
                                    {(() => {
                                        if (noticiaVisualizando.dataPublicacao) {
                                            const dateObj = noticiaVisualizando.dataPublicacao.toDate();
                                            const day = String(dateObj.getDate()).padStart(2, "0");
                                            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                                            const year = dateObj.getFullYear();

                                            return `${day}/${month}/${year} por ${noticiaVisualizando.autor}`;
                                        }
                                        return `por ${noticiaVisualizando.autor}`;
                                    })()}
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold mb-4 text-center text-black">
                                {noticiaVisualizando.titulo}
                            </h2>
                            <p className="text-black text-justify mb-6 whitespace-pre-line">
                                {noticiaVisualizando.conteudo}
                            </p>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div>
    );
}

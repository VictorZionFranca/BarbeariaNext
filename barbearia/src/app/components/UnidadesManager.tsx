"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import {
    listarUnidades,
    criarUnidade,
    atualizarUnidade,
    deletarUnidade,
} from "../utils/firestoreUnidades";
import { FaPencilAlt, FaTrash } from "react-icons/fa";
import { createPortal } from "react-dom";

// Defina a interface no topo do arquivo
interface Unidade {
    id: string;
    nome: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    pais: string;
    telefone: string;
    cep?: string;
}

const camposIniciais = {
    id: "",
    nome: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "",
    telefone: "",
    cep: "",
};

export default function UnidadesManager() {
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState(camposIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | null>(null);

    const carregarUnidades = useCallback(async () => {
        const lista = await listarUnidades();
        setUnidades(
            lista.map(u => ({
                ...u,
                id: u.id ?? "", // garante string
            }))
        );
    }, []);

    useEffect(() => {
        carregarUnidades();
    }, [carregarUnidades]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (
            !form.nome ||
            !form.rua ||
            !form.numero ||
            !form.bairro ||
            !form.cidade ||
            !form.estado ||
            !form.pais ||
            !form.telefone ||
            !form.cep
        ) {
            setErro("Preencha todos os campos obrigatórios.");
            return;
        }
        if (editId) {
            await atualizarUnidade(editId, form);
        } else {
            await criarUnidade(form);
        }
        setForm(camposIniciais);
        setEditId(null);
        setErro("");
        carregarUnidades();
    }

    function handleEditar(unidade: Unidade) {
        setForm({
            id: unidade.id,
            nome: unidade.nome,
            rua: unidade.rua,
            numero: unidade.numero,
            bairro: unidade.bairro,
            cidade: unidade.cidade,
            estado: unidade.estado,
            pais: unidade.pais,
            telefone: unidade.telefone,
            cep: unidade.cep ?? "",
        });
        setEditId(unidade.id);
        setModalEditar(true); // Abre o modal de edição!
        setModalAnimando("editar");
        setTimeout(() => setModalAnimando(null), 100);
    }

    // Função para abrir modal de exclusão
    function handleExcluir(id: string) {
        setModalExcluir({ aberto: true, id });
        setModalAnimando(null);
    }

    // Função para confirmar exclusão
    async function confirmarExcluir() {
        if (modalExcluir.id) {
            await deletarUnidade(modalExcluir.id);
            setModalExcluir({ aberto: false, id: null });
            setModalAnimando(null);
            carregarUnidades();
        }
    }

    const unidadesFiltradas = unidades.filter(u =>
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.cidade.toLowerCase().includes(busca.toLowerCase())
    );

    // Funções para fechar modais com animação
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
                        <input
                            type="text"
                            placeholder="Buscar unidade..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="border p-2 rounded text-black w-full pr-8"
                        />
                        {busca && (
                            <button
                                type="button"
                                onClick={() => setBusca("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                                aria-label="Limpar busca"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
                {/* Botão de cadastro */}
                <button
                    className="bg-green-600 text-white px-4 py-2 rounded-lg min-w-[180px] transition-colors duration-200 hover:bg-green-700"
                    onClick={() => {
                        setModalCadastro(true);
                        setEditId(null);
                        setForm(camposIniciais);
                        setModalAnimando("cadastro");
                        setTimeout(() => setModalAnimando(null), 100);
                    }}
                >
                    Cadastrar Unidade
                </button>
            </div>
            <table className="w-full bg-white text-black rounded-xl shadow overflow-hidden">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-4 text-left font-semibold text-gray-700">Nome</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Endereço</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Telefone</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {unidadesFiltradas.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-6 text-center text-gray-500">
                                Nenhuma unidade encontrada.
                            </td>
                        </tr>
                    ) : (
                        unidadesFiltradas.map((u) => (
                            <tr
                                key={u.id}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <td className="p-4 align-middle">{u.nome}</td>
                                <td className="p-4 align-middle">{`${u.rua}, ${u.numero}, ${u.bairro}, ${u.cidade}, ${u.estado}, ${u.pais}`}</td>
                                <td className="p-4 align-middle">{u.telefone}</td>
                                <td className="p-4 align-middle">
                                    <div className="flex gap-2">
                                        {/* Botão de editar (em cada linha da tabela) */}
                                        <button
                                            onClick={() => handleEditar(u)}
                                            className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
                                            title="Editar"
                                        >
                                            <FaPencilAlt className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleExcluir(u.id!)}
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
            {/* Modal de confirmação de exclusão */}
            {modalExcluir.aberto && typeof window !== "undefined" && document.body &&
                createPortal(
                    <div className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300">
                        <div
                            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative
                                transform transition-all duration-300
                                ${modalAnimando === "excluir" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Excluir Unidade</h2>
                            <p className="text-center text-black mb-8">Tem certeza que deseja excluir esta unidade?</p>
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
            {modalCadastro && typeof window !== "undefined" && document.body &&
                createPortal(
                    <div className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300">
                        <div
                            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
                                transform transition-all duration-300
                                ${modalAnimando === "cadastro" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Cadastrar Unidade</h2>
                            <form
                                onSubmit={async (e) => {
                                    await handleSubmit(e);
                                    setModalCadastro(false);
                                }}
                                className="flex flex-col gap-4"
                            >
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
                                        Nome da unidade
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="rua"
                                        id="rua"
                                        placeholder=" "
                                        value={form.rua}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="rua"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Rua
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="numero"
                                        id="numero"
                                        placeholder=" "
                                        value={form.numero}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="numero"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Número
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="bairro"
                                        id="bairro"
                                        placeholder=" "
                                        value={form.bairro}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="bairro"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Bairro
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="cidade"
                                        id="cidade"
                                        placeholder=" "
                                        value={form.cidade}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="cidade"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Cidade
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="estado"
                                        id="estado"
                                        placeholder=" "
                                        value={form.estado}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="estado"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Estado
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="pais"
                                        id="pais"
                                        placeholder=" "
                                        value={form.pais}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="pais"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        País
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="cep"
                                        id="cep"
                                        placeholder=" "
                                        value={form.cep}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="cep"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        CEP
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="telefone"
                                        id="telefone"
                                        placeholder=" "
                                        value={form.telefone}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="telefone"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Telefone
                                    </label>
                                </div>
                                {erro && <span className="text-red-500 text-center">{erro}</span>}
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
            {modalEditar && typeof window !== "undefined" && document.body &&
                createPortal(
                    <div className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300">
                        <div
                            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
                                transform transition-all duration-300
                                ${modalAnimando === "editar" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Editar Unidade</h2>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (
                                        !form.nome ||
                                        !form.rua ||
                                        !form.numero ||
                                        !form.bairro ||
                                        !form.cidade ||
                                        !form.estado ||
                                        !form.pais ||
                                        !form.telefone ||
                                        !form.cep
                                    ) {
                                        setErro("Preencha todos os campos obrigatórios.");
                                        return;
                                    }
                                    await atualizarUnidade(editId!, form);
                                    setForm(camposIniciais);
                                    setEditId(null);
                                    setErro("");
                                    setModalEditar(false);
                                    carregarUnidades();
                                }}
                                className="flex flex-col gap-4"
                            >
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
                                        Nome da unidade
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="rua"
                                        id="rua"
                                        placeholder=" "
                                        value={form.rua}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="rua"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Rua
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="numero"
                                        id="numero"
                                        placeholder=" "
                                        value={form.numero}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="numero"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Número
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="bairro"
                                        id="bairro"
                                        placeholder=" "
                                        value={form.bairro}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="bairro"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Bairro
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="cidade"
                                        id="cidade"
                                        placeholder=" "
                                        value={form.cidade}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="cidade"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Cidade
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="estado"
                                        id="estado"
                                        placeholder=" "
                                        value={form.estado}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="estado"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Estado
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="pais"
                                        id="pais"
                                        placeholder=" "
                                        value={form.pais}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="pais"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        País
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="cep"
                                        id="cep"
                                        placeholder=" "
                                        value={form.cep}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="cep"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        CEP
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="telefone"
                                        id="telefone"
                                        placeholder=" "
                                        value={form.telefone}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="telefone"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Telefone
                                    </label>
                                </div>
                                {erro && <span className="text-red-500 text-center">{erro}</span>}
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
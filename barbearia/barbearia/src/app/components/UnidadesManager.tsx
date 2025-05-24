"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import {
    listarUnidades,
    criarUnidade,
    atualizarUnidade,
    deletarUnidade,
} from "../utils/firestoreUnidades";
import { FaPencilAlt, FaTrash } from "react-icons/fa";

const camposIniciais = { nome: "", endereco: { rua: "", numero: "", bairro: "", cidade: "", estado: "", pais: "" }, telefone: "" };

export default function UnidadesManager() {
    type Unidade = {
        id: string;
        nome: string;
        endereco: {
            rua: string;
            numero: string;
            bairro: string;
            cidade: string;
            estado: string;
            pais: string;
        };
        telefone: string;
    };

    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState(camposIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | null>(null);

    const carregarUnidades = useCallback(async () => {
        const lista = await listarUnidades();
        setUnidades(lista);
    }, []);

    useEffect(() => {
        carregarUnidades();
    }, [carregarUnidades]);

    function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const { name, value } = e.target;
        if (name in form.endereco) {
            setForm({ ...form, endereco: { ...form.endereco, [name]: value } });
        } else {
            setForm({ ...form, [name]: value });
        }
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form.nome || !form.endereco.rua || !form.endereco.numero || !form.endereco.bairro || !form.endereco.cidade || !form.endereco.estado || !form.endereco.pais || !form.telefone) {
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
        setForm(unidade);
        setEditId(unidade.id);
        setModalCadastro(true);
        setModalAnimando("editar");
        setTimeout(() => setModalAnimando(null), 100);
    }

    function handleExcluir(id: string) {
        setModalExcluir({ aberto: true, id });
        setModalAnimando("excluir");
        setTimeout(() => setModalAnimando(null), 100);
    }

    async function confirmarExcluir() {
        if (modalExcluir.id) {
            await deletarUnidade(modalExcluir.id);
            setModalExcluir({ aberto: false, id: null });
            carregarUnidades();
        }
    }

    const unidadesFiltradas = unidades.filter(u =>
        u.nome.toLowerCase().includes(busca.toLowerCase()) || u.endereco.cidade.toLowerCase().includes(busca.toLowerCase())
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
                            <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="p-4 align-middle">{u.nome}</td>
                                <td className="p-4 align-middle">{`${u.endereco.rua}, ${u.endereco.numero}, ${u.endereco.bairro}, ${u.endereco.cidade}, ${u.endereco.estado}, ${u.endereco.pais}`}</td>
                                <td className="p-4 align-middle">{u.telefone}</td>
                                <td className="p-4 align-middle">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditar(u)}
                                            className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
                                            title="Editar"
                                        >
                                            <FaPencilAlt className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleExcluir(u.id)}
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
            {modalExcluir.aberto && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 transition-opacity duration-300">
                    <div className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative transform transition-all duration-300 ${modalAnimando === "excluir" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}`}>
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={fecharModalCadastroAnimado}
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
                                onClick={fecharModalCadastroAnimado}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {modalCadastro && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 transition-opacity duration-300">
                    <div className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative transform transition-all duration-300 ${modalAnimando === "cadastro" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}`}>
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={fecharModalCadastroAnimado}
                            aria-label="Fechar"
                            type="button"
                        >
                            ×
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-center text-black">{editId ? "Editar Unidade" : "Cadastrar Unidade"}</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="relative">
                                <input
                                    name="nome"
                                    placeholder="Nome da unidade"
                                    value={form.nome}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    name="rua"
                                    placeholder="Rua"
                                    value={form.endereco.rua}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    name="numero"
                                    placeholder="Número"
                                    value={form.endereco.numero}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    name="bairro"
                                    placeholder="Bairro"
                                    value={form.endereco.bairro}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    name="cidade"
                                    placeholder="Cidade"
                                    value={form.endereco.cidade}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    name="estado"
                                    placeholder="Estado"
                                    value={form.endereco.estado}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    name="pais"
                                    placeholder="País"
                                    value={form.endereco.pais}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <input
                                    name="telefone"
                                    placeholder="Telefone"
                                    value={form.telefone}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                    required
                                />
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
        </div>
    );
}
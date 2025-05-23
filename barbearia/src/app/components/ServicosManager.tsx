"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import {
    listarServicos,
    criarServicoComIdIncremental,
    atualizarServico,
    deletarServico,
} from "../utils/firestoreServicos";
import { Timestamp } from "firebase/firestore";
import { FaPencilAlt, FaTrash } from "react-icons/fa";

const camposIniciais = { nomeDoServico: "", valor: "", duracaoEmMinutos: "" };

export default function ServicosManager() {
    type Servico = {
        id: string;
        nomeDoServico: string;
        valor: number;
        duracaoEmMinutos: number;
    };

    const [servicos, setServicos] = useState<Servico[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState(camposIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);

    const carregarServicos = useCallback(async () => {
        type ServicoFirestore = { id: string; nomeDoServico?: string; valor?: number; duracaoEmMinutos?: number };
        const lista = await listarServicos() as ServicoFirestore[];
        const listaCompletada = lista.map((item) => ({
            id: item.id,
            nomeDoServico: item.nomeDoServico ?? "",
            valor: item.valor ?? 0,
            duracaoEmMinutos: item.duracaoEmMinutos ?? 0,
        }));
        setServicos(listaCompletada);
    }, []);

    useEffect(() => {
        carregarServicos();
    }, [busca, carregarServicos]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form.nomeDoServico || !form.valor || !form.duracaoEmMinutos) {
            setErro("Preencha todos os campos obrigatórios.");
            return;
        }
        if (editId) {
            await atualizarServico(editId, {
                nomeDoServico: form.nomeDoServico,
                valor: Number(form.valor),
                duracaoEmMinutos: Number(form.duracaoEmMinutos),
            });
        } else {
            await criarServicoComIdIncremental({
                nomeDoServico: form.nomeDoServico,
                valor: Number(form.valor),
                duracaoEmMinutos: Number(form.duracaoEmMinutos),
                criadoEm: Timestamp.now(),
            });
        }
        setForm(camposIniciais);
        setEditId(null);
        setErro("");
        carregarServicos();
    }

    function handleEditar(servico: Servico) {
        setForm({
            nomeDoServico: servico.nomeDoServico,
            valor: servico.valor.toString(),
            duracaoEmMinutos: servico.duracaoEmMinutos.toString(),
        });
        setEditId(servico.id);
        setModalEditar(true);
    }

    function handleExcluir(id: string) {
        setModalExcluir({ aberto: true, id });
    }

    async function confirmarExcluir() {
        if (modalExcluir.id) {
            await deletarServico(modalExcluir.id);
            setModalExcluir({ aberto: false, id: null });
            carregarServicos();
        }
    }

    const servicosFiltrados = servicos.filter(s =>
        s.nomeDoServico.toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <div>
            <div className="flex mb-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-[400px]">
                        <input
                            type="text"
                            placeholder="Buscar serviço..."
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
                    }}
                >
                    Cadastrar Serviço
                </button>
            </div>
            <table className="w-full bg-white text-black rounded shadow mb-[150]">
                <thead>
                    <tr>
                        <th className="p-2 text-left">Nome</th>
                        <th className="p-2 text-left">Valor</th>
                        <th className="p-2 text-left">Duração (min)</th>
                        <th className="p-2 text-left">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {servicosFiltrados.map((s) => (
                        <tr key={s.id}>
                            <td className="p-2">{s.nomeDoServico}</td>
                            <td className="p-2">R$ {Number(s.valor).toFixed(2)}</td>
                            <td className="p-2">{s.duracaoEmMinutos}</td>
                            <td className="p-2 flex gap-2">
                                <button
                                    onClick={() => handleEditar(s)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
                                    title="Editar"
                                >
                                    <FaPencilAlt className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleExcluir(s.id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded flex items-center justify-center transition-colors duration-200 hover:bg-red-800"
                                    title="Excluir"
                                >
                                    <FaTrash className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Modal de confirmação de exclusão */}
            {modalExcluir.aberto && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={() => setModalExcluir({ aberto: false, id: null })}
                            aria-label="Fechar"
                            type="button"
                        >
                            ×
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-center text-black">Excluir Serviço</h2>
                        <p className="text-center text-black mb-8">Tem certeza que deseja excluir este serviço?</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={confirmarExcluir}
                                className="bg-red-600 hover:bg-red-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                            >
                                Excluir
                            </button>
                            <button
                                onClick={() => setModalExcluir({ aberto: false, id: null })}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {modalCadastro && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={() => {
                                setModalCadastro(false);
                                setForm(camposIniciais);
                                setErro("");
                            }}
                            aria-label="Fechar"
                            type="button"
                        >
                            ×
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-center text-black">Cadastrar Serviço</h2>
                        <form
                            onSubmit={async (e) => {
                                await handleSubmit(e);
                                setModalCadastro(false);
                            }}
                            className="flex flex-col gap-4"
                        >
                            <div className="relative">
                                <input
                                    name="nomeDoServico"
                                    id="nomeDoServico"
                                    placeholder=" "
                                    value={form.nomeDoServico}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                    required
                                />
                                <label
                                    htmlFor="nomeDoServico"
                                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                >
                                    Nome do serviço
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    name="valor"
                                    id="valor"
                                    placeholder=" "
                                    type="number"
                                    value={form.valor}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                    required
                                />
                                <label
                                    htmlFor="valor"
                                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                >
                                    Valor
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    name="duracaoEmMinutos"
                                    id="duracaoEmMinutos"
                                    placeholder=" "
                                    type="number"
                                    value={form.duracaoEmMinutos}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                    required
                                />
                                <label
                                    htmlFor="duracaoEmMinutos"
                                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                >
                                    Duração (min)
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
                                    onClick={() => {
                                        setModalCadastro(false);
                                        setForm(camposIniciais);
                                        setErro("");
                                    }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {modalEditar && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={() => {
                                setModalEditar(false);
                                setForm(camposIniciais);
                                setEditId(null);
                                setErro("");
                            }}
                            aria-label="Fechar"
                            type="button"
                        >
                            ×
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-center text-black">Editar Serviço</h2>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!form.nomeDoServico || !form.valor || !form.duracaoEmMinutos) {
                                    setErro("Preencha todos os campos obrigatórios.");
                                    return;
                                }
                                await atualizarServico(editId!, {
                                    nomeDoServico: form.nomeDoServico,
                                    valor: Number(form.valor),
                                    duracaoEmMinutos: Number(form.duracaoEmMinutos),
                                });
                                setForm(camposIniciais);
                                setEditId(null);
                                setErro("");
                                setModalEditar(false);
                                carregarServicos();
                            }}
                            className="flex flex-col gap-4"
                        >
                            <div className="relative">
                                <input
                                    name="nomeDoServico"
                                    id="nomeDoServico"
                                    placeholder=" "
                                    value={form.nomeDoServico}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                    required
                                />
                                <label
                                    htmlFor="nomeDoServico"
                                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                >
                                    Nome do serviço
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    name="valor"
                                    id="valor"
                                    placeholder=" "
                                    type="number"
                                    value={form.valor}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                    required
                                />
                                <label
                                    htmlFor="valor"
                                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                >
                                    Valor
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    name="duracaoEmMinutos"
                                    id="duracaoEmMinutos"
                                    placeholder=" "
                                    type="number"
                                    value={form.duracaoEmMinutos}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                    required
                                />
                                <label
                                    htmlFor="duracaoEmMinutos"
                                    className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                        peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                        peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                        peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                >
                                    Duração (min)
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
                                    onClick={() => {
                                        setModalEditar(false);
                                        setForm(camposIniciais);
                                        setEditId(null);
                                        setErro("");
                                    }}
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
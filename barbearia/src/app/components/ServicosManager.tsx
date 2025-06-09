"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { listarServicos, criarServicoComIdIncremental, atualizarServico, deletarServico } from "../utils/firestoreServicos";
import { Timestamp } from "firebase/firestore";
import { FaPencilAlt, FaTrash, FaCheck, FaPlus } from "react-icons/fa";

const camposIniciais = { nomeDoServico: "", valor: "", duracaoEmMinutos: "", descricao: "" };

export default function ServicosManager() {
    type Servico = {
        id: string;
        nomeDoServico: string;
        valor: number;
        duracaoEmMinutos: number;
        descricao?: string;
    };

    const [servicos, setServicos] = useState<Servico[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState<{ nomeDoServico: string; valor: string; duracaoEmMinutos: string; descricao: string }>(camposIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | null>(null);
    const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);
    const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);

    const carregarServicos = useCallback(async () => {
        type ServicoFirestore = { id: string; nomeDoServico?: string; valor?: number; duracaoEmMinutos?: number; descricao?: string };
        const lista = await listarServicos() as ServicoFirestore[];
        const listaCompletada = lista.map((item) => ({
            id: item.id,
            nomeDoServico: item.nomeDoServico ?? "",
            valor: item.valor ?? 0,
            duracaoEmMinutos: item.duracaoEmMinutos ?? 0,
            descricao: item.descricao ?? "",
        }));
        setServicos(listaCompletada);
    }, []);

    useEffect(() => {
        carregarServicos();
    }, [busca, carregarServicos]);

    function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErro(""); // limpa o erro ao digitar
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form.nomeDoServico || !form.valor || !form.duracaoEmMinutos) {
            setErro("Preencha todos os campos obrigatórios.");
            return;
        }

        // Validação: não permitir nomes duplicados ao cadastrar ou editar
        const nomeNormalizado = form.nomeDoServico.trim().toLowerCase();
        const jaExiste = servicos.some(s =>
            s.nomeDoServico.trim().toLowerCase() === nomeNormalizado &&
            (!editId || s.id !== editId)
        );
        if (jaExiste) {
            setErro("Já existe um serviço com esse nome.");
            return;
        }

        if (editId) {
            await atualizarServico(editId, {
                nomeDoServico: form.nomeDoServico,
                valor: Number(form.valor),
                duracaoEmMinutos: Number(form.duracaoEmMinutos),
                descricao: form.descricao,
            });
            mostrarNotificacao("Serviço editado com sucesso!", "sucesso");
            fecharModalEditarAnimado();
        } else {
            await criarServicoComIdIncremental({
                nomeDoServico: form.nomeDoServico,
                valor: Number(form.valor),
                duracaoEmMinutos: Number(form.duracaoEmMinutos),
                descricao: form.descricao,
                criadoEm: Timestamp.now(),
            });
            mostrarNotificacao("Serviço cadastrado com sucesso!", "sucesso");
            fecharModalCadastroAnimado();
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
            descricao: servico.descricao ?? "",
        });
        setEditId(servico.id);
        setModalEditar(true);
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
            await deletarServico(modalExcluir.id);
            mostrarNotificacao("Serviço excluído!", "erro");
            setModalExcluir({ aberto: false, id: null });
            carregarServicos();
        }
    }

    function mostrarNotificacao(mensagem: string, tipo: "sucesso" | "erro" = "sucesso") {
        setNotificacao({ mensagem, tipo });
        setNotificacaoVisivel(true);
        setTimeout(() => setNotificacaoVisivel(false), 2700); // inicia saída antes de sumir
        setTimeout(() => setNotificacao(null), 3000); // remove do DOM após animação
    }

    const servicosFiltrados = servicos.filter(s =>
        s.nomeDoServico.toLowerCase().includes(busca.toLowerCase())
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
                    className="bg-green-600 text-white px-4 py-2 rounded-lg min-w-[180px] transition-colors duration-200 hover:bg-green-700 flex items-center gap-2"
                    onClick={() => {
                        setModalCadastro(true);
                        setEditId(null);
                        setForm(camposIniciais);
                        setModalAnimando("cadastro");
                        setTimeout(() => setModalAnimando(null), 100);
                    }}
                >
                    <FaPlus className="h-4 w-4" /> Cadastrar Serviço
                </button>
            </div>
            <table className="w-full bg-white text-black rounded-xl shadow overflow-hidden">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-4 text-left font-semibold text-gray-700">Nome</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Valor</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Duração (min)</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Descrição</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {servicosFiltrados.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-6 text-center text-gray-500">
                                Nenhum serviço encontrado.
                            </td>
                        </tr>
                    ) : (
                        servicosFiltrados.map((s) => (
                            <tr
                                key={s.id}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <td className="p-4 align-middle">{s.nomeDoServico}</td>
                                <td className="p-4 align-middle">
                                    R$ {Number(s.valor).toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-4 align-middle">
                                    {s.duracaoEmMinutos}:00
                                </td>
                                <td className="p-4 align-middle">
                                    {s.descricao ? (s.descricao.length > 40 ? s.descricao.slice(0, 40) + "..." : s.descricao) : ""}
                                </td>
                                <td className="p-4 align-middle">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditar(s)}
                                            className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
                                            title="Editar"
                                        >
                                            <FaPencilAlt className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleExcluir(s.id)}
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
                        <h2 className="text-2xl font-bold mb-6 text-center text-red-700">Excluir Serviço</h2>
                        <p className="text-center text-black mb-8">Tem certeza que deseja excluir este serviço?</p>
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
                    className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 transition-opacity duration-300"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            fecharModalCadastroAnimado();
                        }
                    }}
                >
                    <div
                        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative
                            transform transition-all duration-300
                            ${modalAnimando === "cadastro" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
                        `}
                    >
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={fecharModalCadastroAnimado}
                            aria-label="Fechar"
                            type="button"
                        >
                            ×
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-center text-black">Cadastrar Serviço</h2>
                        <form
                            onSubmit={handleSubmit}
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
                            <div className="relative">
                                <textarea
                                    name="descricao"
                                    id="descricao"
                                    placeholder=" "
                                    value={form.descricao}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full resize-none"
                                    maxLength={200}
                                    rows={3}
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
                </div>
            )}
            {modalEditar && (
                <div 
                    className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80 transition-opacity duration-300"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            fecharModalEditarAnimado();
                        }
                    }}
                >
                    <div
                        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative
                            transform transition-all duration-300
                            ${modalAnimando === "editar" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
                        `}
                    >
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={fecharModalEditarAnimado}
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
                                // Validação: não permitir nomes duplicados ao editar
                                const nomeNormalizado = form.nomeDoServico.trim().toLowerCase();
                                const jaExiste = servicos.some(s =>
                                    s.nomeDoServico.trim().toLowerCase() === nomeNormalizado &&
                                    s.id !== editId // ignora o próprio serviço
                                );
                                if (jaExiste) {
                                    setErro("Já existe um serviço com esse nome.");
                                    return;
                                }
                                await atualizarServico(editId!, {
                                    nomeDoServico: form.nomeDoServico,
                                    valor: Number(form.valor),
                                    duracaoEmMinutos: Number(form.duracaoEmMinutos),
                                    descricao: form.descricao,
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
                            <div className="relative">
                                <textarea
                                    name="descricao"
                                    id="descricao"
                                    placeholder=" "
                                    value={form.descricao}
                                    onChange={handleChange}
                                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full resize-none"
                                    maxLength={200}
                                    rows={3}
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
                </div>
            )}
            {notificacao && (
                <div
                    className={`
      fixed bottom-6 right-6 z-[9999]
      px-6 py-4 rounded-lg shadow-lg
      text-white text-base font-semibold
      flex items-center gap-2
      transition-all duration-500
      ${notificacao.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"}
      ${notificacaoVisivel ? "animate-slide-in-right" : "animate-slide-out-right"}
    `}
                    style={{ minWidth: 220 }}
                >
                    {notificacao.tipo === "erro" && (
                        <FaTrash className="inline-block mr-2 text-white" />
                    )}
                    {notificacao.tipo === "sucesso" && (
                        <FaCheck className="inline-block mr-2 text-white" />
                    )}
                    {notificacao.mensagem}
                </div>
            )}
        </div>
    );
}
"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { listarServicos, criarServicoComIdIncremental, atualizarServico, deletarServico } from "../utils/firestoreServicos";
import { Timestamp } from "firebase/firestore";
import { FaPencilAlt, FaTrash, FaCheck, FaPlus } from "react-icons/fa";

const camposIniciais = { 
    nomeDoServico: "", 
    valor: "", 
    duracaoEmMinutos: "", 
    descricao: "",
    ativo: true 
};

export default function ServicosManager() {
    type Servico = {
        id: string;
        nomeDoServico: string;
        valor: number;
        duracaoEmMinutos: number;
        descricao?: string;
        ativo: boolean;
    };

    const [servicos, setServicos] = useState<Servico[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState<{ nomeDoServico: string; valor: string; duracaoEmMinutos: string; descricao: string; ativo: boolean }>(camposIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | null>(null);
    const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);
    const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);

    const carregarServicos = useCallback(async () => {
        type ServicoFirestore = { 
            id: string; 
            nomeDoServico?: string; 
            valor?: number; 
            duracaoEmMinutos?: number; 
            descricao?: string;
            ativo?: boolean;
        };
        const lista = await listarServicos() as ServicoFirestore[];
        const listaCompletada = lista.map((item) => ({
            id: item.id,
            nomeDoServico: item.nomeDoServico ?? "",
            valor: item.valor ?? 0,
            duracaoEmMinutos: item.duracaoEmMinutos ?? 0,
            descricao: item.descricao ?? "",
            ativo: item.ativo ?? true,
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
                ativo: form.ativo
            });
            mostrarNotificacao("Serviço editado com sucesso!", "sucesso");
            fecharModalEditarAnimado();
        } else {
            await criarServicoComIdIncremental({
                nomeDoServico: form.nomeDoServico,
                valor: Number(form.valor),
                duracaoEmMinutos: Number(form.duracaoEmMinutos),
                descricao: form.descricao,
                ativo: form.ativo,
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
            ativo: servico.ativo
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
                        <h1 className="text-2xl font-bold text-black my-8">Serviços</h1>
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
                    <FaPlus className="h-4 w-4" /> Cadastrar Serviço
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
                                    Preço
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Duração
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Descrição
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {servicosFiltrados.filter(s => s.ativo).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        Nenhum serviço ativo encontrado.
                                    </td>
                                </tr>
                            ) : (
                                servicosFiltrados.filter(s => s.ativo).map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {s.nomeDoServico}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                R$ {Number(s.valor).toFixed(2).replace('.', ',')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                {s.duracaoEmMinutos}:00
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                {s.descricao ? (s.descricao.length > 40 ? s.descricao.slice(0, 40) + "..." : s.descricao) : ""}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditar(s)}
                                                    className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                                                    title="Editar"
                                                >
                                                    <FaPencilAlt className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleExcluir(s.id)}
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

            {/* Seção de Serviços Inativos */}
            {servicosFiltrados.filter(s => !s.ativo).length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-gray-600 mb-4">Serviços Inativos</h2>
                    <div className="bg-gray-50 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nome
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Preço
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Duração
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Descrição
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-50 divide-y divide-gray-200">
                                    {servicosFiltrados.filter(s => !s.ativo).map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-100">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-600">
                                                    {s.nomeDoServico}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-400">
                                                    R$ {Number(s.valor).toFixed(2).replace('.', ',')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-400">
                                                    {s.duracaoEmMinutos}:00
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-400">
                                                    {s.descricao ? (s.descricao.length > 40 ? s.descricao.slice(0, 40) + "..." : s.descricao) : ""}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditar(s)}
                                                        className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                                                        title="Editar"
                                                    >
                                                        <FaPencilAlt className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcluir(s.id)}
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
            {modalExcluir.aberto && (
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
                                onClick={fecharModalExcluirAnimado}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Cadastro */}
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
                                    Preço
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
                                    <span className="ml-3 text-sm font-medium text-gray-900">Serviço Ativo</span>
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
            {/* Modal de Edição */}
            {modalEditar && (
                <div 
                    className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
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
                                    ativo: form.ativo
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
                                    Preço
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
                                    <span className="ml-3 text-sm font-medium text-gray-900">Serviço Ativo</span>
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
                        fixed bottom-6 right-6 z-[99999]
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
"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { 
    listarColaboradoresInformacoes, 
    buscarColaboradorInformacoes,
    atualizarColaboradorInformacoes,
    deletarColaboradorInformacoes,
    ColaboradorInformacoes,
    getDiasSemana
} from "../utils/firestoreColaboradoresInformacoes";
import { listarColaboradores, Colaborador } from "../utils/firestoreColaboradores";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";
import { FaPencilAlt, FaTrash, FaPlus, FaCalendarAlt } from "react-icons/fa";
import { createPortal } from "react-dom";

const camposIniciais = {
    dataAdmissao: "",
    folgas: [] as string[],
    periodoFeriasInicio: "",
    periodoFeriasFim: "",
    unidadeNome: "",
};

export default function ColaboradoresInformacoesManager() {
    const [colaboradoresInfo, setColaboradoresInfo] = useState<ColaboradorInformacoes[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState(camposIniciais);
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null);
    const [erro, setErro] = useState("");
    const [modalEditar, setModalEditar] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"editar" | null>(null);
    const [diasSemana] = useState(getDiasSemana());

    const carregarDados = useCallback(async () => {
        try {
            const [listaInfo, listaColaboradores, listaUnidades] = await Promise.all([
                listarColaboradoresInformacoes(),
                listarColaboradores(),
                listarUnidades()
            ]);
            setColaboradoresInfo(listaInfo);
            setColaboradores(listaColaboradores);
            setUnidades(listaUnidades);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            setErro("Erro ao carregar dados dos colaboradores");
        }
    }, []);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleFolgaChange(dia: string, checked: boolean) {
        setForm(prev => ({
            ...prev,
            folgas: checked 
                ? [...prev.folgas, dia]
                : prev.folgas.filter(f => f !== dia)
        }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErro("");

        if (!colaboradorSelecionado) {
            setErro("Selecione um colaborador");
            return;
        }

        if (!form.dataAdmissao) {
            setErro("Data de admissão é obrigatória");
            return;
        }

        if (!form.unidadeNome) {
            setErro("Selecione uma unidade");
            return;
        }

        try {
            const dataAdmissao = new Date(form.dataAdmissao);
            const periodoFeriasInicio = form.periodoFeriasInicio ? new Date(form.periodoFeriasInicio) : undefined;
            const periodoFeriasFim = form.periodoFeriasFim ? new Date(form.periodoFeriasFim) : undefined;

            await atualizarColaboradorInformacoes(colaboradorSelecionado.id!, {
                dataAdmissao,
                folgas: form.folgas,
                periodoFeriasInicio,
                periodoFeriasFim,
                unidadeNome: form.unidadeNome,
            });

            setForm(camposIniciais);
            setColaboradorSelecionado(null);
            setErro("");
            carregarDados();
            setModalEditar(false);
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : "Erro ao processar a requisição";
            setErro(mensagem);
        }
    }

    function handleEditar(colaborador: Colaborador) {
        setColaboradorSelecionado(colaborador);
        
        // Buscar informações existentes
        const info = colaboradoresInfo.find(i => i.pessoaId === colaborador.id);
        if (info) {
            setForm({
                dataAdmissao: info.dataAdmissao instanceof Date 
                    ? info.dataAdmissao.toISOString().split('T')[0]
                    : new Date(info.dataAdmissao).toISOString().split('T')[0],
                folgas: info.folgas || [],
                periodoFeriasInicio: info.periodoFeriasInicio 
                    ? new Date(info.periodoFeriasInicio).toISOString().split('T')[0]
                    : "",
                periodoFeriasFim: info.periodoFeriasFim
                    ? new Date(info.periodoFeriasFim).toISOString().split('T')[0]
                    : "",
                unidadeNome: info.unidadeNome || "",
            });
        } else {
            setForm(camposIniciais);
        }
        
        setModalEditar(true);
        setModalAnimando("editar");
        setTimeout(() => setModalAnimando(null), 100);
    }

    async function handleExcluir(pessoaId: string) {
        if (confirm("Tem certeza que deseja excluir as informações profissionais deste colaborador?")) {
            try {
                await deletarColaboradorInformacoes(pessoaId);
                carregarDados();
            } catch (error) {
                console.error("Erro ao excluir informações:", error);
                setErro("Erro ao excluir informações profissionais");
            }
        }
    }

    const colaboradoresFiltrados = colaboradores.filter(c =>
        c.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) ||
        c.email.toLowerCase().includes(busca.toLowerCase())
    );

    function fecharModalEditarAnimado() {
        setModalAnimando("editar");
        setTimeout(() => {
            setModalEditar(false);
            setModalAnimando(null);
            setForm(camposIniciais);
            setColaboradorSelecionado(null);
            setErro("");
        }, 300);
    }

    function formatarData(data: Date | string): string {
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR');
    }

    function getInformacoesColaborador(colaboradorId: string): ColaboradorInformacoes | undefined {
        return colaboradoresInfo.find(info => info.pessoaId === colaboradorId);
    }

    return (
        <div className="flex flex-col min-h-[78vh]">
            <div className="flex mb-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-[400px]">
                        <input
                            type="text"
                            placeholder="Buscar colaborador..."
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
                <h1 className="text-2xl font-bold text-gray-800">Informações Profissionais</h1>
            </div>

            <table className="w-full bg-white text-black rounded-xl shadow overflow-hidden">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-4 text-left font-semibold text-gray-700">Nome</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Email</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Unidade</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Data Admissão</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Folgas</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Férias</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {colaboradoresFiltrados.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-6 text-center text-gray-500">
                                Nenhum colaborador encontrado.
                            </td>
                        </tr>
                    ) : (
                        colaboradoresFiltrados.map((c) => {
                            const info = getInformacoesColaborador(c.id!);
                            return (
                                <tr
                                    key={c.id}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                    <td className="p-4 align-middle">{c.nomeCompleto}</td>
                                    <td className="p-4 align-middle">{c.email}</td>
                                    <td className="p-4 align-middle">{info?.unidadeNome || "Não definida"}</td>
                                    <td className="p-4 align-middle">
                                        {info?.dataAdmissao ? formatarData(info.dataAdmissao) : "Não definida"}
                                    </td>
                                    <td className="p-4 align-middle">
                                        {info?.folgas && info.folgas.length > 0 
                                            ? info.folgas.join(", ") 
                                            : "Não definidas"
                                        }
                                    </td>
                                    <td className="p-4 align-middle">
                                        {info?.periodoFeriasInicio && info?.periodoFeriasFim
                                            ? `${formatarData(info.periodoFeriasInicio)} - ${formatarData(info.periodoFeriasFim)}`
                                            : "Não definidas"
                                        }
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditar(c)}
                                                className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
                                                title="Editar Informações"
                                            >
                                                <FaPencilAlt className="h-4 w-4" />
                                            </button>
                                            {info && (
                                                <button
                                                    onClick={() => handleExcluir(c.id!)}
                                                    className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-red-800"
                                                    title="Excluir Informações"
                                                >
                                                    <FaTrash className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* Modal de Edição */}
            {modalEditar && typeof window !== "undefined" && document.body &&
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">
                                Informações Profissionais - {colaboradorSelecionado?.nomeCompleto}
                            </h2>
                            <form
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-4"
                            >
                                <div className="relative">
                                    <input
                                        name="dataAdmissao"
                                        id="dataAdmissao"
                                        type="date"
                                        placeholder=" "
                                        value={form.dataAdmissao}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="dataAdmissao"
                                        className="absolute left-3 -top-3 text-xs text-black bg-white px-1"
                                    >
                                        Data de Admissão
                                    </label>
                                </div>

                                <div className="relative">
                                    <select
                                        name="unidadeNome"
                                        id="unidadeNome"
                                        value={form.unidadeNome || ""}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                                        required
                                    >
                                        <option value="">Selecione uma unidade</option>
                                        {unidades.map((unidade) => (
                                            <option key={unidade.id} value={unidade.nome}>
                                                {unidade.nome}
                                            </option>
                                        ))}
                                    </select>
                                    <label
                                        htmlFor="unidadeNome"
                                        className="absolute left-3 -top-3 text-xs text-black bg-white px-1"
                                    >
                                        Unidade
                                    </label>
                                </div>

                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Dias de Folga
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {diasSemana.map((dia) => (
                                            <label key={dia} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={form.folgas.includes(dia)}
                                                    onChange={(e) => handleFolgaChange(dia, e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{dia}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <input
                                            name="periodoFeriasInicio"
                                            id="periodoFeriasInicio"
                                            type="date"
                                            placeholder=" "
                                            value={form.periodoFeriasInicio}
                                            onChange={handleChange}
                                            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        />
                                        <label
                                            htmlFor="periodoFeriasInicio"
                                            className="absolute left-3 -top-3 text-xs text-black bg-white px-1"
                                        >
                                            Início das Férias
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            name="periodoFeriasFim"
                                            id="periodoFeriasFim"
                                            type="date"
                                            placeholder=" "
                                            value={form.periodoFeriasFim}
                                            onChange={handleChange}
                                            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        />
                                        <label
                                            htmlFor="periodoFeriasFim"
                                            className="absolute left-3 -top-3 text-xs text-black bg-white px-1"
                                        >
                                            Fim das Férias
                                        </label>
                                    </div>
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
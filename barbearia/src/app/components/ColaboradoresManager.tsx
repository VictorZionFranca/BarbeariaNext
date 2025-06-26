"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { listarColaboradores, criarColaborador, atualizarColaborador, deletarColaborador, Colaborador } from "../utils/firestoreColaboradores";
import { listarColaboradoresInformacoes, ColaboradorInformacoes, buscarColaboradorInformacoes, atualizarColaboradorInformacoes, getDiasSemana, criarColaboradorInformacoes } from "../utils/firestoreColaboradoresInformacoes";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";
import { FaPencilAlt, FaTrash, FaPlus, FaInfoCircle } from "react-icons/fa";
import { createPortal } from "react-dom";

const camposIniciais = {
    cpf: "",
    dataNascimento: "",
    email: "",
    nomeCompleto: "",
    telefone: "",
    tipoPessoa: 2,
    unidadeNome: "",
};

const camposInfoIniciais = {
    dataAdmissao: "",
    folgas: [] as string[],
    periodoFeriasInicio: "",
    periodoFeriasFim: "",
    unidadeNome: "",
};

export default function ColaboradoresManager() {
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [colaboradoresInfo, setColaboradoresInfo] = useState<ColaboradorInformacoes[]>([]);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState(camposIniciais);
    const [formInfo, setFormInfo] = useState(camposInfoIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null);
    const [erro, setErro] = useState("");
    const [erroInfo, setErroInfo] = useState("");
    const [errosCampos, setErrosCampos] = useState({
        email: "",
        telefone: "",
        cpf: "",
        dataNascimento: ""
    });
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalInfo, setModalInfo] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | "info" | null>(null);
    const [diasSemana] = useState(getDiasSemana());

    const carregarColaboradores = useCallback(async () => {
        try {
            const [lista, listaInfo, listaUnidades] = await Promise.all([
                listarColaboradores(),
                listarColaboradoresInformacoes(),
                listarUnidades()
            ]);
            setColaboradores(lista);
            setColaboradoresInfo(listaInfo);
            setUnidades(listaUnidades);
        } catch (error) {
            console.error("Erro ao carregar colaboradores:", error);
            setErro("Erro ao carregar dados dos colaboradores");
        }
    }, []);

    useEffect(() => {
        carregarColaboradores();
    }, [carregarColaboradores]);

    function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errosCampos[e.target.name as keyof typeof errosCampos]) {
            setErrosCampos(prev => ({ ...prev, [e.target.name]: "" }));
        }
    }

    function handleChangeInfo(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setFormInfo({ ...formInfo, [e.target.name]: e.target.value });
    }

    function handleFolgaChange(dia: string, checked: boolean) {
        setFormInfo(prev => ({
            ...prev,
            folgas: checked 
                ? [...prev.folgas, dia]
                : prev.folgas.filter(f => f !== dia)
        }));
    }

    // Função para validar data de nascimento
    function validarDataNascimento(data: string): boolean {
        // Verifica se a data está no formato DD/MM/YYYY
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
            return false;
        }

        const [dia, mes, ano] = data.split('/').map(Number);
        
        // Verifica se o ano está entre 1900 e o ano atual
        const anoAtual = new Date().getFullYear();
        if (ano < 1900 || ano > anoAtual) {
            return false;
        }

        // Verifica se o mês está entre 1 e 12
        if (mes < 1 || mes > 12) {
            return false;
        }

        // Verifica se o dia é válido para o mês
        const diasNoMes = new Date(ano, mes, 0).getDate();
        if (dia < 1 || dia > diasNoMes) {
            return false;
        }

        // Verifica se a data não é futura
        const dataNascimento = new Date(ano, mes - 1, dia);
        if (dataNascimento > new Date()) {
            return false;
        }

        return true;
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErro("");
        setErrosCampos({ email: "", telefone: "", cpf: "", dataNascimento: "" });

        if (!form.cpf || !form.dataNascimento || !form.email || !form.nomeCompleto || !form.telefone || !form.unidadeNome) {
            setErro("Preencha todos os campos obrigatórios.");
            return;
        }

        // Validar data de nascimento
        if (!validarDataNascimento(form.dataNascimento)) {
            setErrosCampos(prev => ({ ...prev, dataNascimento: "Data de nascimento inválida" }));
            return;
        }

        try {
            if (editId) {
                await atualizarColaborador(editId, form);
            } else {
                await criarColaborador(form);
                // Após criar colaborador, criar informações profissionais
                if (form.unidadeNome) {
                    const dataAdmissao = new Date(); // Data atual
                    await criarColaboradorInformacoes(form.email, dataAdmissao, [], undefined, undefined, form.unidadeNome);
                }
                carregarColaboradores();
            }
            setForm(camposIniciais);
            setEditId(null);
            setErro("");
            setModalCadastro(false);
            setModalEditar(false);
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : "Erro ao processar a requisição";
            if (mensagem.includes("Email já cadastrado")) {
                setErrosCampos(prev => ({ ...prev, email: "Email já cadastrado" }));
            }
            if (mensagem.includes("Telefone já cadastrado")) {
                setErrosCampos(prev => ({ ...prev, telefone: "Telefone já cadastrado" }));
            }
            if (mensagem.includes("CPF já cadastrado")) {
                setErrosCampos(prev => ({ ...prev, cpf: "CPF já cadastrado" }));
            }
        }
    }

    async function handleEditar(colaborador: Colaborador) {
        // Buscar informações profissionais para pegar a unidade
        const info = await buscarColaboradorInformacoes(colaborador.id!);
        setForm({
            cpf: colaborador.cpf,
            dataNascimento: colaborador.dataNascimento,
            email: colaborador.email,
            nomeCompleto: colaborador.nomeCompleto,
            telefone: colaborador.telefone,
            tipoPessoa: colaborador.tipoPessoa,
            unidadeNome: info?.unidadeNome || "",
        });
        setEditId(colaborador.id!);
        setModalEditar(true);
        setModalAnimando("editar");
        setTimeout(() => setModalAnimando(null), 100);
    }

    async function handleExcluir(id: string) {
        try {
            setModalExcluir({ aberto: true, id });
            setModalAnimando("excluir");
            setTimeout(() => setModalAnimando(null), 100);
        } catch (error) {
            console.error("Erro ao abrir modal de exclusão:", error);
            setErro("Erro ao tentar excluir o colaborador.");
        }
    }

    async function confirmarExcluir() {
        if (modalExcluir.id) {
            try {
                await deletarColaborador(modalExcluir.id);
                setModalExcluir({ aberto: false, id: null });
                setModalAnimando(null);
                await carregarColaboradores();
            } catch (error) {
                console.error("Erro ao excluir colaborador:", error);
                setErro("Não foi possível excluir o colaborador. Tente novamente.");
            }
        }
    }

    const colaboradoresFiltrados = colaboradores.filter(c =>
        c.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) ||
        c.cpf.includes(busca) ||
        c.email.toLowerCase().includes(busca.toLowerCase())
    );

    function fecharModalCadastroAnimado() {
        setModalAnimando("cadastro");
        setTimeout(() => {
            setModalCadastro(false);
            setModalAnimando(null);
            setForm(camposIniciais);
            setErro("");
            setErrosCampos({ email: "", telefone: "", cpf: "", dataNascimento: "" });
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
            setErrosCampos({ email: "", telefone: "", cpf: "", dataNascimento: "" });
        }, 300);
    }

    function fecharModalExcluirAnimado() {
        setModalAnimando("excluir");
        setTimeout(() => {
            setModalExcluir({ aberto: false, id: null });
            setModalAnimando(null);
        }, 300);
    }

    function fecharModalInfoAnimado() {
        setModalAnimando("info");
        setTimeout(() => {
            setModalInfo(false);
            setModalAnimando(null);
            setFormInfo(camposInfoIniciais);
            setErroInfo("");
        }, 300);
    }

    function aplicarMascaraCPF(valor: string) {
        valor = valor.replace(/\D/g, "");
        if (valor.length <= 3) return valor;
        if (valor.length <= 6) return `${valor.slice(0, 3)}.${valor.slice(3)}`;
        if (valor.length <= 9) return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;
        return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9, 11)}`;
    }

    function aplicarMascaraTelefone(valor: string) {
        valor = valor.replace(/\D/g, "");
        if (valor.length === 0) return "";
        if (valor.length < 3) return `(${valor}`;
        if (valor.length < 7) return `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
        if (valor.length < 11)
            return `(${valor.slice(0, 2)}) ${valor.slice(2, 6)}-${valor.slice(6)}`;
        return `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7, 11)}`;
    }

    function aplicarMascaraData(valor: string) {
        valor = valor.replace(/\D/g, "");
        if (valor.length <= 2) return valor;
        if (valor.length <= 4) return `${valor.slice(0, 2)}/${valor.slice(2)}`;
        return `${valor.slice(0, 2)}/${valor.slice(2, 4)}/${valor.slice(4, 8)}`;
    }

    async function handleInfoSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErroInfo("");

        if (!colaboradorSelecionado) {
            setErroInfo("Colaborador não selecionado");
            return;
        }

        if (!formInfo.dataAdmissao) {
            setErroInfo("Data de admissão é obrigatória");
            return;
        }

        if (!formInfo.unidadeNome) {
            setErroInfo("Selecione uma unidade");
            return;
        }

        try {
            const dataAdmissao = new Date(formInfo.dataAdmissao);
            
            // Preparar dados apenas com campos que têm valores
            const dadosAtualizados: {
                dataAdmissao: Date;
                folgas: string[];
                unidadeNome: string;
                periodoFeriasInicio?: Date;
                periodoFeriasFim?: Date;
            } = {
                dataAdmissao,
                folgas: formInfo.folgas,
                unidadeNome: formInfo.unidadeNome,
            };

            // Adicionar campos opcionais apenas se tiverem valores
            if (formInfo.periodoFeriasInicio) {
                dadosAtualizados.periodoFeriasInicio = new Date(formInfo.periodoFeriasInicio);
            }
            if (formInfo.periodoFeriasFim) {
                dadosAtualizados.periodoFeriasFim = new Date(formInfo.periodoFeriasFim);
            }

            await atualizarColaboradorInformacoes(colaboradorSelecionado.id!, dadosAtualizados);

            setFormInfo(camposInfoIniciais);
            setColaboradorSelecionado(null);
            setErroInfo("");
            carregarColaboradores();
            setModalInfo(false);
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : "Erro ao processar a requisição";
            setErroInfo(mensagem);
        }
    }

    async function handleVerInfo(colaborador: Colaborador) {
        setColaboradorSelecionado(colaborador);
        
        try {
            // Buscar informações existentes
            const info = await buscarColaboradorInformacoes(colaborador.id!);
            if (info) {
                setFormInfo({
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
                setFormInfo(camposInfoIniciais);
            }
            
            setModalInfo(true);
            setModalAnimando("info");
            setTimeout(() => setModalAnimando(null), 100);
        } catch (error) {
            console.error("Erro ao carregar informações:", error);
            setErroInfo("Erro ao carregar informações do colaborador");
        }
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
                    <FaPlus className="h-4 w-4" />Cadastrar Colaborador
                </button>
            </div>
            <table className="w-full bg-white text-black rounded-xl shadow overflow-hidden">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-4 text-left font-semibold text-gray-700">Nome</th>
                        <th className="p-4 text-left font-semibold text-gray-700">CPF</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Email</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Telefone</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Unidade</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {colaboradoresFiltrados.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-6 text-center text-gray-500">
                                Nenhum colaborador encontrado.
                            </td>
                        </tr>
                    ) : (
                        colaboradoresFiltrados.map((c) => {
                            // Buscar informações profissionais do colaborador
                            const info = colaboradoresInfo.find(i => i.pessoaId === c.id);
                            const unidade = info?.unidadeNome || "Não definida";
                            
                            return (
                                <tr
                                    key={c.id}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                    <td className="p-4 align-middle">{c.nomeCompleto}</td>
                                    <td className="p-4 align-middle">{c.cpf}</td>
                                    <td className="p-4 align-middle">{c.email}</td>
                                    <td className="p-4 align-middle">{c.telefone}</td>
                                    <td className="p-4 align-middle">{unidade}</td>
                                    <td className="p-4 align-middle">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleVerInfo(c)}
                                                className="bg-green-500 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-green-700"
                                                title="Informações Profissionais"
                                            >
                                                <FaInfoCircle className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditar(c)}
                                                className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
                                                title="Editar"
                                            >
                                                <FaPencilAlt className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleExcluir(c.id!)}
                                                className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-red-800"
                                                title="Excluir"
                                            >
                                                <FaTrash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* Modal de confirmação de exclusão */}
            {modalExcluir.aberto && typeof window !== "undefined" && document.body &&
                createPortal(
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Excluir Colaborador</h2>
                            <p className="text-center text-black mb-8">Tem certeza que deseja excluir este colaborador?</p>
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

            {/* Modal de Cadastro */}
            {modalCadastro && typeof window !== "undefined" && document.body &&
                createPortal(
                    <div 
                        className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                fecharModalCadastroAnimado();
                            }
                        }}
                    >
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Cadastrar Colaborador</h2>
                            <form
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-4"
                            >
                                <div className="relative">
                                    <input
                                        name="nomeCompleto"
                                        id="nomeCompleto"
                                        placeholder=" "
                                        value={form.nomeCompleto}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="nomeCompleto"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Nome Completo
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="cpf"
                                        id="cpf"
                                        placeholder=" "
                                        value={form.cpf}
                                        onChange={e => {
                                            setForm({ ...form, cpf: aplicarMascaraCPF(e.target.value) });
                                            setErrosCampos(prev => ({ ...prev, cpf: "" }));
                                        }}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, cpf: "" }))}
                                        className={`border ${errosCampos.cpf ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
                                        required
                                    />
                                    <label
                                        htmlFor="cpf"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        CPF
                                    </label>
                                    {errosCampos.cpf && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.cpf}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        name="dataNascimento"
                                        id="dataNascimento"
                                        placeholder=" "
                                        value={form.dataNascimento}
                                        onChange={e => {
                                            setForm({ ...form, dataNascimento: aplicarMascaraData(e.target.value) });
                                            setErrosCampos(prev => ({ ...prev, dataNascimento: "" }));
                                        }}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, dataNascimento: "" }))}
                                        className={`border ${errosCampos.dataNascimento ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
                                        required
                                    />
                                    <label
                                        htmlFor="dataNascimento"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Data de Nascimento
                                    </label>
                                    {errosCampos.dataNascimento && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.dataNascimento}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        name="email"
                                        id="email"
                                        type="email"
                                        placeholder=" "
                                        value={form.email}
                                        onChange={handleChange}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, email: "" }))}
                                        className={`border ${errosCampos.email ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
                                        required
                                    />
                                    <label
                                        htmlFor="email"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Email
                                    </label>
                                    {errosCampos.email && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.email}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        name="telefone"
                                        id="telefone"
                                        placeholder=" "
                                        value={form.telefone}
                                        onChange={e => {
                                            setForm({ ...form, telefone: aplicarMascaraTelefone(e.target.value) });
                                            setErrosCampos(prev => ({ ...prev, telefone: "" }));
                                        }}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, telefone: "" }))}
                                        className={`border ${errosCampos.telefone ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
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
                                    {errosCampos.telefone && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.telefone}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <select
                                        name="unidadeNome"
                                        id="unidadeNome"
                                        value={form.unidadeNome}
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Editar Colaborador</h2>
                            <form
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-4"
                            >
                                <div className="relative">
                                    <input
                                        name="nomeCompleto"
                                        id="nomeCompleto"
                                        placeholder=" "
                                        value={form.nomeCompleto}
                                        onChange={handleChange}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                                        required
                                    />
                                    <label
                                        htmlFor="nomeCompleto"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Nome Completo
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        name="cpf"
                                        id="cpf"
                                        placeholder=" "
                                        value={form.cpf}
                                        onChange={e => {
                                            setForm({ ...form, cpf: aplicarMascaraCPF(e.target.value) });
                                            setErrosCampos(prev => ({ ...prev, cpf: "" }));
                                        }}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, cpf: "" }))}
                                        className={`border ${errosCampos.cpf ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
                                        required
                                    />
                                    <label
                                        htmlFor="cpf"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        CPF
                                    </label>
                                    {errosCampos.cpf && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.cpf}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        name="dataNascimento"
                                        id="dataNascimento"
                                        placeholder=" "
                                        value={form.dataNascimento}
                                        onChange={e => {
                                            setForm({ ...form, dataNascimento: aplicarMascaraData(e.target.value) });
                                            setErrosCampos(prev => ({ ...prev, dataNascimento: "" }));
                                        }}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, dataNascimento: "" }))}
                                        className={`border ${errosCampos.dataNascimento ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
                                        required
                                    />
                                    <label
                                        htmlFor="dataNascimento"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Data de Nascimento
                                    </label>
                                    {errosCampos.dataNascimento && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.dataNascimento}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        name="email"
                                        id="email"
                                        type="email"
                                        placeholder=" "
                                        value={form.email}
                                        onChange={handleChange}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, email: "" }))}
                                        className={`border ${errosCampos.email ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
                                        required
                                    />
                                    <label
                                        htmlFor="email"
                                        className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                                            peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                                            peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
                                    >
                                        Email
                                    </label>
                                    {errosCampos.email && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.email}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        name="telefone"
                                        id="telefone"
                                        placeholder=" "
                                        value={form.telefone}
                                        onChange={e => {
                                            setForm({ ...form, telefone: aplicarMascaraTelefone(e.target.value) });
                                            setErrosCampos(prev => ({ ...prev, telefone: "" }));
                                        }}
                                        onFocus={() => setErrosCampos(prev => ({ ...prev, telefone: "" }))}
                                        className={`border ${errosCampos.telefone ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full`}
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
                                    {errosCampos.telefone && (
                                        <span className="text-red-500 text-sm mt-1">{errosCampos.telefone}</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <select
                                        name="unidadeNome"
                                        id="unidadeNome"
                                        value={form.unidadeNome}
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

            {/* Modal de Informações Profissionais */}
            {modalInfo && typeof window !== "undefined" && document.body &&
                createPortal(
                    <div 
                        className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                fecharModalInfoAnimado();
                            }
                        }}
                    >
                        <div
                            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
                                transform transition-all duration-300
                                ${modalAnimando === "info" ? "opacity-0 -translate-y-80 scale-95" : "opacity-100 translate-y-0 scale-100"}
                                overflow-y-auto max-h-[90vh]`}
                        >
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                                onClick={fecharModalInfoAnimado}
                                aria-label="Fechar"
                                type="button"
                            >
                                ×
                            </button>
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">
                                Informações Profissionais - {colaboradorSelecionado?.nomeCompleto}
                            </h2>
                            <form
                                onSubmit={handleInfoSubmit}
                                className="flex flex-col gap-4"
                            >
                                <div className="relative">
                                    <input
                                        name="dataAdmissao"
                                        id="dataAdmissao"
                                        type="date"
                                        placeholder=" "
                                        value={formInfo.dataAdmissao}
                                        onChange={handleChangeInfo}
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
                                        value={formInfo.unidadeNome}
                                        onChange={handleChangeInfo}
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
                                                    checked={formInfo.folgas.includes(dia)}
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
                                            value={formInfo.periodoFeriasInicio}
                                            onChange={handleChangeInfo}
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
                                            value={formInfo.periodoFeriasFim}
                                            onChange={handleChangeInfo}
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

                                {erroInfo && <span className="text-red-500 text-center">{erroInfo}</span>}
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
                                        onClick={fecharModalInfoAnimado}
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
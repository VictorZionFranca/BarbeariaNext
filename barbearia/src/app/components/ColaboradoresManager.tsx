"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { listarColaboradores, criarColaborador, atualizarColaborador, deletarColaborador, Colaborador } from "../utils/firestoreColaboradores";
import { listarColaboradoresInformacoes, ColaboradorInformacoes, buscarColaboradorInformacoes, atualizarColaboradorInformacoes, getDiasSemana, criarColaboradorInformacoes } from "../utils/firestoreColaboradoresInformacoes";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";
import { FaPencilAlt, FaTrash, FaPlus, FaInfoCircle, FaRegCalendarAlt } from "react-icons/fa";
import { createPortal } from "react-dom";
import { listarFeriasColaboradores, criarFeriasColaborador, FeriasColaborador } from "../utils/firestoreFeriasColaboradores";

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

// Função utilitária para criar data no horário local do Brasil a partir de yyyy-mm-dd
function criarDataLocal(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    const [ano, mes, dia] = dateStr.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 0, 0, 0);
}

function isFirestoreTimestamp(obj: unknown): obj is { toDate: () => Date } {
    return !!obj && typeof obj === 'object' && typeof (obj as { toDate: () => Date }).toDate === 'function';
}

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
    const [feriasColaboradores, setFeriasColaboradores] = useState<FeriasColaborador[]>([]);
    const [modalFerias, setModalFerias] = useState<{ aberto: boolean; colaborador: Colaborador | null }>({ aberto: false, colaborador: null });
    const [feriasSelecionadas, setFeriasSelecionadas] = useState<{ dataInicio: Date; dataFim: Date }[]>([]);
    const [modalFeriasAnimando, setModalFeriasAnimando] = useState(false);

    // Função para limpar férias vencidas e atualizar histórico
    async function limparFeriasVencidas(colaboradoresInfo: ColaboradorInformacoes[]) {
        const hoje = new Date();
        for (const info of colaboradoresInfo) {
            if (info.periodoFeriasFim) {
                let fim: Date;
                if (isFirestoreTimestamp(info.periodoFeriasFim)) {
                    fim = info.periodoFeriasFim.toDate();
                } else {
                    fim = new Date(info.periodoFeriasFim);
                }
                if (!isNaN(fim.getTime()) && fim < hoje) {
                    // Atualizar no Firestore (isso já cuida do histórico)
                    // Enviar os valores atuais para garantir que o histórico seja atualizado corretamente
                    await atualizarColaboradorInformacoes(info.pessoaId, {
                        periodoFeriasInicio: info.periodoFeriasInicio,
                        periodoFeriasFim: info.periodoFeriasFim
                    });
                }
            }
        }
    }

    // Modificar carregarColaboradores para limpar férias vencidas antes de setar o estado
    const carregarColaboradores = useCallback(async () => {
        try {
            const [, listaInfo, listaUnidades] = await Promise.all([
                listarColaboradores(),
                listarColaboradoresInformacoes(),
                listarUnidades()
            ]);
            // Limpar férias vencidas antes de setar o estado
            await limparFeriasVencidas(listaInfo);
            // Buscar novamente após possíveis atualizações
            const [listaAtualizada, listaInfoAtualizada] = await Promise.all([
                listarColaboradores(),
                listarColaboradoresInformacoes()
            ]);
            setColaboradores(listaAtualizada);
            setColaboradoresInfo(listaInfoAtualizada);
            setUnidades(listaUnidades);
        } catch (error) {
            console.error("Erro ao carregar colaboradores:", error);
            setErro("Erro ao carregar dados dos colaboradores");
        }
    }, []);

    // Carregar férias dos colaboradores (coleção + histórico)
    const carregarFeriasColaboradores = useCallback(async () => {
        const [feriasColecao, infos] = await Promise.all([
            listarFeriasColaboradores(),
            listarColaboradoresInformacoes()
        ]);
        // Unir férias da coleção com férias do histórico
        const feriasHistorico: FeriasColaborador[] = [];
        for (const info of infos) {
            if (info.historico && Array.isArray(info.historico.ferias)) {
                for (const ferias of info.historico.ferias) {
                    feriasHistorico.push({
                        colaboradorId: info.pessoaId,
                        nomeColaborador: info.nome,
                        dataInicio: new Date(ferias.inicio),
                        dataFim: new Date(ferias.fim),
                        criadoEm: info.criadoEm,
                    });
                }
            }
        }
        setFeriasColaboradores([...feriasColecao, ...feriasHistorico]);
    }, []);

    useEffect(() => {
        carregarColaboradores();
        carregarFeriasColaboradores();
    }, [carregarColaboradores, carregarFeriasColaboradores]);

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
            let colaboradorId = editId;
            if (editId) {
                await atualizarColaborador(editId, form);
                // Sincronizar unidade também na coleção colaboradoresInformacoes
                if (form.unidadeNome) {
                    await atualizarColaboradorInformacoes(editId, { unidadeNome: form.unidadeNome });
                }
            } else {
                const { uid } = await criarColaborador(form);
                colaboradorId = uid;
                // Após criar colaborador, criar informações profissionais usando UID
                if (form.unidadeNome) {
                    const dataAdmissao = new Date(); // Data atual
                    await criarColaboradorInformacoes(uid, dataAdmissao, [], undefined, undefined, form.unidadeNome);
                }
            }
            // Registro de férias: se informado novo período, criar na coleção feriasColaboradores
            if (formInfo.periodoFeriasInicio && formInfo.periodoFeriasFim && colaboradorId) {
                await criarFeriasColaborador({
                    colaboradorId,
                    nomeColaborador: form.nomeCompleto,
                    dataInicio: new Date(formInfo.periodoFeriasInicio),
                    dataFim: new Date(formInfo.periodoFeriasFim),
                });
                await carregarFeriasColaboradores();
            }
            await carregarColaboradores();
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
            // Usar criarDataLocal para garantir meia-noite no horário local
            const dataAdmissao = criarDataLocal(formInfo.dataAdmissao);
            // Se o campo estiver vazio, será undefined
            const periodoFeriasInicio = formInfo.periodoFeriasInicio ? criarDataLocal(formInfo.periodoFeriasInicio) : undefined;
            const periodoFeriasFim = formInfo.periodoFeriasFim ? criarDataLocal(formInfo.periodoFeriasFim) : undefined;

            const dadosAtualizados: {
                dataAdmissao?: Date;
                folgas: string[];
                unidadeNome: string;
                periodoFeriasInicio?: Date;
                periodoFeriasFim?: Date;
            } = {
                folgas: formInfo.folgas,
                unidadeNome: formInfo.unidadeNome,
            };

            if (dataAdmissao) dadosAtualizados.dataAdmissao = dataAdmissao;
            // Se o campo está vazio, envia undefined explicitamente para limpar no Firebase
            dadosAtualizados.periodoFeriasInicio = periodoFeriasInicio;
            dadosAtualizados.periodoFeriasFim = periodoFeriasFim;

            await atualizarColaboradorInformacoes(colaboradorSelecionado.id!, dadosAtualizados);

            // --- AJUSTE: Limpar férias vencidas imediatamente se necessário ---
            if (periodoFeriasFim && periodoFeriasFim < new Date()) {
                await atualizarColaboradorInformacoes(colaboradorSelecionado.id!, {
                    periodoFeriasInicio: periodoFeriasInicio,
                    periodoFeriasFim: periodoFeriasFim
                });
            }
            // --- FIM DO AJUSTE ---

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
            let info = await buscarColaboradorInformacoes(colaborador.id!);
            let precisaAtualizar = false;
            const atualizarObj: Record<string, unknown> = {};
            // Verificar férias vencidas
            if (info && info.periodoFeriasFim) {
                let dFim;
                if (isFirestoreTimestamp(info.periodoFeriasFim)) {
                    dFim = info.periodoFeriasFim.toDate();
                } else {
                    dFim = new Date(info.periodoFeriasFim);
                }
                if (!isNaN(dFim.getTime()) && dFim < new Date()) {
                    precisaAtualizar = true;
                    atualizarObj.periodoFeriasInicio = undefined;
                    atualizarObj.periodoFeriasFim = undefined;
                }
            }
            // Verificar folgas antigas (data de admissão há mais de 1 ano)
            if (info && info.folgas && info.folgas.length > 0 && info.dataAdmissao) {
                let dAdmissao;
                if (isFirestoreTimestamp(info.dataAdmissao)) {
                    dAdmissao = info.dataAdmissao.toDate();
                } else {
                    dAdmissao = new Date(info.dataAdmissao);
                }
                const umAnoAtras = new Date();
                umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
                if (!isNaN(dAdmissao.getTime()) && dAdmissao < umAnoAtras) {
                    precisaAtualizar = true;
                    atualizarObj.folgas = [];
                }
            }
            // Se precisar atualizar, faz a atualização e busca novamente
            if (info && precisaAtualizar) {
                await atualizarColaboradorInformacoes(colaborador.id!, atualizarObj);
                info = await buscarColaboradorInformacoes(colaborador.id!);
            }
            // Formatar data de admissão para dd/mm/aaaa
            let dataAdmissaoStr = "";
            if (info && info.dataAdmissao) {
                let d;
                if (isFirestoreTimestamp(info.dataAdmissao)) {
                    d = info.dataAdmissao.toDate();
                } else {
                    d = new Date(info.dataAdmissao);
                }
                if (!isNaN(d.getTime())) {
                    const dia = String(d.getDate()).padStart(2, '0');
                    const mes = String(d.getMonth() + 1).padStart(2, '0');
                    const ano = d.getFullYear();
                    dataAdmissaoStr = `${dia}/${mes}/${ano}`;
                }
            }
            if (info) {
                setFormInfo({
                    dataAdmissao: dataAdmissaoStr,
                    folgas: info.folgas || [],
                    periodoFeriasInicio: info.periodoFeriasInicio
                        ? (() => { const d = isFirestoreTimestamp(info.periodoFeriasInicio) ? info.periodoFeriasInicio.toDate() : new Date(info.periodoFeriasInicio); return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0]; })()
                        : "",
                    periodoFeriasFim: info.periodoFeriasFim
                        ? (() => { const d = isFirestoreTimestamp(info.periodoFeriasFim) ? info.periodoFeriasFim.toDate() : new Date(info.periodoFeriasFim); return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0]; })()
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

    // Função para abrir o modal de férias de um colaborador
    function abrirModalFerias(colaborador: Colaborador) {
        // Buscar informações profissionais do colaborador
        const info = colaboradoresInfo.find(i => i.pessoaId === colaborador.id);
        // Buscar histórico de férias (coleção + histórico)
        const feriasColecao = feriasColaboradores.filter(f => f.colaboradorId === colaborador.id);
        const feriasHistorico = (info?.historico?.ferias || []).map(f => ({
            dataInicio: isFirestoreTimestamp(f.inicio) ? f.inicio.toDate() : new Date(f.inicio),
            dataFim: isFirestoreTimestamp(f.fim) ? f.fim.toDate() : new Date(f.fim)
        }));
        const feriasTodas = [
            ...feriasColecao.map(f => ({
                dataInicio: isFirestoreTimestamp(f.dataInicio) ? f.dataInicio.toDate() : new Date(f.dataInicio),
                dataFim: isFirestoreTimestamp(f.dataFim) ? f.dataFim.toDate() : new Date(f.dataFim)
            })),
            ...feriasHistorico
        ].filter(f => f.dataInicio && f.dataFim && !isNaN(f.dataInicio.getTime()) && !isNaN(f.dataFim.getTime()));
        setFeriasSelecionadas(feriasTodas);
        setModalFerias({ aberto: true, colaborador });
        setModalFeriasAnimando(true);
        setTimeout(() => setModalFeriasAnimando(false), 100);
    }

    function fecharModalFeriasAnimado() {
        setModalFeriasAnimando(true);
        setTimeout(() => {
            setModalFerias({ aberto: false, colaborador: null });
            setFeriasSelecionadas([]);
            setModalFeriasAnimando(false);
        }, 300);
    }

    // Função para verificar se colaborador está de férias
    function colaboradorEstaDeFerias(info: ColaboradorInformacoes): boolean {
        if (!info.periodoFeriasInicio || !info.periodoFeriasFim) return false;
        let inicio: Date, fim: Date;
        if (isFirestoreTimestamp(info.periodoFeriasInicio)) {
            inicio = info.periodoFeriasInicio.toDate();
        } else {
            inicio = new Date(info.periodoFeriasInicio);
        }
        if (isFirestoreTimestamp(info.periodoFeriasFim)) {
            fim = info.periodoFeriasFim.toDate();
        } else {
            fim = new Date(info.periodoFeriasFim);
        }
        const hoje = new Date();
        // Zerar horas para comparar só a data
        hoje.setHours(0,0,0,0);
        inicio.setHours(0,0,0,0);
        fim.setHours(0,0,0,0);
        return hoje >= inicio && hoje <= fim;
    }

    // Lista de colaboradores de férias
    const colaboradoresFerias = colaboradoresInfo.filter(colab => colaboradorEstaDeFerias(colab));

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
                    <FaPlus className="h-4 w-4" />Cadastrar Colaborador
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Férias</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {colaboradoresFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{c.nomeCompleto}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500">{c.cpf}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500">{c.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500">{c.telefone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500">{unidade}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex">
                                                    <button
                                                        type="button"
                                                        onClick={() => abrirModalFerias(c)}
                                                        title="Ver histórico de férias"
                                                        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 border border-blue-300 hover:bg-blue-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    >
                                                        <FaRegCalendarAlt className="text-blue-600 text-xl" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleVerInfo(c)}
                                                        className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors duration-200"
                                                        title="Informações Profissionais"
                                                    >
                                                        <FaInfoCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditar(c)}
                                                        className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                                                        title="Editar"
                                                    >
                                                        <FaPencilAlt className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcluir(c.id!)}
                                                        className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors duration-200"
                                                        title="Excluir"
                                                    >
                                                        <FaTrash className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tabela de colaboradores de férias */}
            {colaboradoresFerias.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <h1 className="text-2xl font-bold text-black">Colaboradores de Férias</h1>
                    </div>
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Início</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fim</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {colaboradoresFerias.map((info) => (
                                        <tr key={info.pessoaId} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{info.nome}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500">{info.unidadeNome}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {(() => {
                                                    const raw = info.periodoFeriasInicio;
                                                    let d: Date | undefined;
                                                    if (raw) {
                                                        d = isFirestoreTimestamp(raw) ? raw.toDate() : new Date(raw);
                                                    }
                                                    return d && !isNaN(d.getTime()) ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}` : "-";
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {(() => {
                                                    const raw = info.periodoFeriasFim;
                                                    let d: Date | undefined;
                                                    if (raw) {
                                                        d = isFirestoreTimestamp(raw) ? raw.toDate() : new Date(raw);
                                                    }
                                                    return d && !isNaN(d.getTime()) ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}` : "-";
                                                })()}
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
                                {/* Data de Admissão apenas leitura */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Data de Admissão
                                    </label>
                                    <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                                        {formInfo.dataAdmissao ? formInfo.dataAdmissao : <span className="text-gray-400 italic">vazio</span>}
                                    </div>
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
                                        {formInfo.folgas.length === 0 && (
                                            <span className="col-span-2 text-gray-400 italic">vazio</span>
                                        )}
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
                                        {!formInfo.periodoFeriasInicio && (
                                            <span className="text-gray-400 italic">vazio</span>
                                        )}
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
                                        {!formInfo.periodoFeriasFim && (
                                            <span className="text-gray-400 italic">vazio</span>
                                        )}
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

            {/* Modal de Férias do Colaborador */}
            {modalFerias.aberto && modalFerias.colaborador && typeof window !== "undefined" && document.body &&
                createPortal(
                    <div 
                        className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                fecharModalFeriasAnimado();
                            }
                        }}
                    >
                        <div
                            className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl border border-gray-200 relative
                                transform transition-all duration-300
                                ${modalFeriasAnimando ? 'opacity-0 -translate-y-80 scale-95' : 'opacity-100 translate-y-0 scale-100'}
                            `}
                        >
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                                onClick={fecharModalFeriasAnimado}
                                aria-label="Fechar"
                                type="button"
                            >
                                ×
                            </button>
                            <h2 className="text-3xl font-extrabold mb-8 text-center text-black tracking-tight">
                                Histórico de Férias - {modalFerias.colaborador.nomeCompleto}
                            </h2>
                            {feriasSelecionadas.length === 0 ? (
                                <div className="text-center text-black text-lg font-semibold">Nenhum registro de férias encontrado.</div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {feriasSelecionadas
                                        .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime())
                                        .map((f, idx) => (
                                            <li key={idx} className="py-4 flex justify-between text-black text-lg font-medium">
                                                <span>{f.dataInicio.toLocaleDateString("pt-BR")} até {f.dataFim.toLocaleDateString("pt-BR")}</span>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
} 
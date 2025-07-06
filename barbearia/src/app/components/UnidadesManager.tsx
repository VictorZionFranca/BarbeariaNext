"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { listarUnidades, criarUnidade, atualizarUnidade, deletarUnidade } from "../utils/firestoreUnidades";
import { FaPencilAlt, FaTrash, FaPlus } from "react-icons/fa";
import { createPortal } from "react-dom";

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
    ativo: boolean;
    horariosFuncionamento?: {
        domingo?: { aberto: boolean; abertura: string; fechamento: string };
        segunda?: { aberto: boolean; abertura: string; fechamento: string };
        terca?: { aberto: boolean; abertura: string; fechamento: string };
        quarta?: { aberto: boolean; abertura: string; fechamento: string };
        quinta?: { aberto: boolean; abertura: string; fechamento: string };
        sexta?: { aberto: boolean; abertura: string; fechamento: string };
        sabado?: { aberto: boolean; abertura: string; fechamento: string };
    };
}

const diasSemanaObj = {
    domingo: "Domingo",
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
    sabado: "Sábado",
} as const;

const diasSemana = Object.entries(diasSemanaObj) as [keyof typeof diasSemanaObj, string][];

interface HorarioDia {
    aberto: boolean;
    abertura: string;
    fechamento: string;
}

interface FormUnidade {
    nome: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    pais: string;
    telefone: string;
    cep: string;
    ativo: boolean;
    horariosFuncionamento: Record<keyof typeof diasSemanaObj, HorarioDia>;
}

const horariosPadrao: Record<keyof typeof diasSemanaObj, HorarioDia> = {
    domingo: { aberto: false, abertura: "08:00", fechamento: "20:00" },
    segunda: { aberto: true, abertura: "08:00", fechamento: "20:00" },
    terca: { aberto: true, abertura: "08:00", fechamento: "20:00" },
    quarta: { aberto: true, abertura: "08:00", fechamento: "20:00" },
    quinta: { aberto: true, abertura: "08:00", fechamento: "20:00" },
    sexta: { aberto: true, abertura: "08:00", fechamento: "20:00" },
    sabado: { aberto: true, abertura: "08:00", fechamento: "20:00" },
};

const camposIniciais: FormUnidade = {
    nome: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "",
    telefone: "",
    cep: "",
    ativo: true,
    horariosFuncionamento: { ...horariosPadrao },
};

export default function UnidadesManager() {
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState(camposIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | null>(null);

    const carregarUnidades = useCallback(async () => {
        const lista = await listarUnidades();
        setUnidades(lista);
    }, []);

    useEffect(() => {
        carregarUnidades();
    }, [carregarUnidades]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        const { name, value, type } = e.target;
        if (name.startsWith("horariosFuncionamento.")) {
            const [, dia, campo] = name.split(".");
            setForm(prev => ({
                ...prev,
                horariosFuncionamento: {
                    ...prev.horariosFuncionamento,
                    [dia as keyof typeof diasSemanaObj]: {
                        ...prev.horariosFuncionamento[dia as keyof typeof diasSemanaObj],
                        [campo]: campo === "aberto" ? (e.target as HTMLInputElement).checked : value,
                    },
                },
            }));
        } else {
            setForm(prev => ({
                ...prev,
                [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
            }));
        }
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErro("");

        if (!form.nome || !form.rua || !form.numero || !form.bairro || !form.cidade || !form.estado || !form.pais || !form.telefone) {
            setErro("Preencha todos os campos obrigatórios.");
            return;
        }

        try {
            if (editId) {
                await atualizarUnidade(editId, form);
            } else {
                await criarUnidade(form);
            }
            setForm(camposIniciais);
            setEditId(null);
            setErro("");
            carregarUnidades();
            setModalCadastro(false);
            setModalEditar(false);
        } catch (error) {
            console.error("Erro ao processar unidade:", error);
            setErro("Erro ao processar a unidade. Tente novamente.");
        }
    }

    function handleEditar(unidade: Unidade) {
        setForm({
            nome: unidade.nome,
            rua: unidade.rua,
            numero: unidade.numero,
            bairro: unidade.bairro,
            cidade: unidade.cidade,
            estado: unidade.estado,
            pais: unidade.pais,
            telefone: unidade.telefone,
            cep: unidade.cep ?? "",
            ativo: unidade.ativo,
            horariosFuncionamento: {
                ...horariosPadrao,
                ...unidade.horariosFuncionamento,
            },
        });
        setEditId(unidade.id);
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
            setErro("Erro ao tentar excluir a unidade.");
        }
    }

    async function confirmarExcluir() {
        if (modalExcluir.id) {
            try {
                await deletarUnidade(modalExcluir.id);
                setModalExcluir({ aberto: false, id: null });
                setModalAnimando(null);
                setUnidades(unidades.filter((u) => u.id !== modalExcluir.id));
                setErro("Unidade excluída com sucesso!");
                setTimeout(() => setErro(null), 3000);
            } catch (error) {
                console.error("Erro ao excluir unidade:", error);
                setErro("Não foi possível excluir a unidade. Tente novamente.");
            }
        }
    }

    const unidadesFiltradas = unidades.filter(u =>
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.cidade.toLowerCase().includes(busca.toLowerCase())
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

    function aplicarMascaraTelefone(valor: string) {
        valor = valor.replace(/\D/g, "");

        if (valor.length === 0) return "";
        if (valor.length < 3) return `(${valor}`;
        if (valor.length < 7) return `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
        if (valor.length < 11)
            return `(${valor.slice(0, 2)}) ${valor.slice(2, 6)}-${valor.slice(6)}`;
        return `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7, 11)}`;
    }

    function aplicarMascaraCEP(valor: string) {
        valor = valor.replace(/\D/g, "");
        if (valor.length <= 5) return valor;
        return `${valor.slice(0, 5)}-${valor.slice(5, 8)}`;
    }

    async function buscarEnderecoPorCEP(cep: string) {
        try {
            const cepLimpo = cep.replace(/\D/g, "");
            if (cepLimpo.length !== 8) return;

            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();

            if (!data.erro) {
                setForm(prev => ({
                    ...prev,
                    rua: data.logradouro || prev.rua,
                    bairro: data.bairro || prev.bairro,
                    cidade: data.localidade || prev.cidade,
                    estado: data.uf || prev.estado,
                }));
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        }
    }

    return (
        <div className="flex flex-col min-h-[78vh]">
            <div className="flex mb-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-[400px]">
                        <h1 className="text-2xl font-bold text-black my-8">Unidades</h1>
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
                    <FaPlus className="h-4 w-4" />
                    Cadastrar Unidade
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
                                    Endereço
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Telefone
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {unidadesFiltradas.filter(u => u.ativo).length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        Nenhuma unidade ativa encontrada.
                                    </td>
                                </tr>
                            ) : (
                                unidadesFiltradas.filter(u => u.ativo).map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {u.nome}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                {`${u.rua}, ${u.numero}, ${u.bairro}, ${u.cidade}, ${u.estado}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {u.telefone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditar(u)}
                                                    className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                                                    title="Editar"
                                                >
                                                    <FaPencilAlt className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleExcluir(u.id)}
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

            {/* Seção de Unidades Inativas */}
            {unidadesFiltradas.filter(u => !u.ativo).length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-gray-600 mb-4">Unidades Inativas</h2>
                    <div className="bg-gray-50 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nome
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Endereço
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Telefone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-50 divide-y divide-gray-200">
                                    {unidadesFiltradas.filter(u => !u.ativo).map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-100">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-600">
                                                    {u.nome}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-400">
                                                    {`${u.rua}, ${u.numero}, ${u.bairro}, ${u.cidade}, ${u.estado}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-400">
                                                    {u.telefone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditar(u)}
                                                        className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                                                        title="Editar"
                                                    >
                                                        <FaPencilAlt className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcluir(u.id)}
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Cadastrar Unidade</h2>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                                        onChange={e => {
                                            const valor = aplicarMascaraCEP(e.target.value);
                                            setForm(prev => ({ ...prev, cep: valor }));
                                            if (valor.replace(/\D/g, "").length === 8) {
                                                buscarEnderecoPorCEP(valor);
                                            }
                                        }}
                                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
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
                                        onChange={e => setForm({ ...form, telefone: aplicarMascaraTelefone(e.target.value) })}
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
                                        <span className="ml-3 text-sm font-medium text-gray-900">Unidade Ativa</span>
                                    </label>
                                </div>
                                {/* Horários de Funcionamento */}
                                <div className="border rounded-lg p-4 mb-2 bg-gray-50">
                                    <span className="block font-semibold text-gray-700 mb-2">Horários de Funcionamento</span>
                                    <div className="flex flex-col gap-2">
                                        {diasSemana.map(([key, label]) => (
                                            <div key={key} className="flex items-center gap-2 border-b pb-2 last:border-b-0">
                                                <label className="flex items-center gap-2 min-w-[90px] font-semibold text-black">
                                                    <input
                                                        type="checkbox"
                                                        name={`horariosFuncionamento.${key}.aberto`}
                                                        checked={form.horariosFuncionamento[key].aberto}
                                                        onChange={handleChange}
                                                        className="accent-green-600"
                                                    />
                                                    <span>{label}</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    name={`horariosFuncionamento.${key}.abertura`}
                                                    value={form.horariosFuncionamento[key].abertura}
                                                    onChange={handleChange}
                                                    disabled={!form.horariosFuncionamento[key].aberto}
                                                    className="border rounded p-1 text-black w-[90px]"
                                                />
                                                <span className="text-black">às</span>
                                                <input
                                                    type="time"
                                                    name={`horariosFuncionamento.${key}.fechamento`}
                                                    value={form.horariosFuncionamento[key].fechamento}
                                                    onChange={handleChange}
                                                    disabled={!form.horariosFuncionamento[key].aberto}
                                                    className="border rounded p-1 text-black w-[90px]"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {erro && (
                                    <span className="text-red-500 text-center">{erro}</span>
                                )}
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Editar Unidade</h2>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                                        onChange={e => setForm({ ...form, telefone: aplicarMascaraTelefone(e.target.value) })}
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
                                        <span className="ml-3 text-sm font-medium text-gray-900">Unidade Ativa</span>
                                    </label>
                                </div>
                                {/* Horários de Funcionamento */}
                                <div className="border rounded-lg p-4 mb-2 bg-gray-50">
                                    <span className="block font-semibold text-gray-700 mb-2">Horários de Funcionamento</span>
                                    <div className="flex flex-col gap-2">
                                        {diasSemana.map(([key, label]) => (
                                            <div key={key} className="flex items-center gap-2 border-b pb-2 last:border-b-0">
                                                <label className="flex items-center gap-2 min-w-[90px] font-semibold text-black">
                                                    <input
                                                        type="checkbox"
                                                        name={`horariosFuncionamento.${key}.aberto`}
                                                        checked={form.horariosFuncionamento[key].aberto}
                                                        onChange={handleChange}
                                                        className="accent-green-600"
                                                    />
                                                    <span>{label}</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    name={`horariosFuncionamento.${key}.abertura`}
                                                    value={form.horariosFuncionamento[key].abertura}
                                                    onChange={handleChange}
                                                    disabled={!form.horariosFuncionamento[key].aberto}
                                                    className="border rounded p-1 text-black w-[90px]"
                                                />
                                                <span className="text-black">às</span>
                                                <input
                                                    type="time"
                                                    name={`horariosFuncionamento.${key}.fechamento`}
                                                    value={form.horariosFuncionamento[key].fechamento}
                                                    onChange={handleChange}
                                                    disabled={!form.horariosFuncionamento[key].aberto}
                                                    className="border rounded p-1 text-black w-[90px]"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {erro && (
                                    <span className="text-red-500 text-center">{erro}</span>
                                )}
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
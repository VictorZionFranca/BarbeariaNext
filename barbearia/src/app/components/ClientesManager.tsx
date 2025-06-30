"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { listarClientes, criarCliente, atualizarCliente, deletarCliente, Cliente } from "../utils/firestoreClientes";
import { FaPencilAlt, FaTrash, FaPlus } from "react-icons/fa";
import { createPortal } from "react-dom";

const camposIniciais = {
    cpf: "",
    dataNascimento: "",
    email: "",
    nomeCompleto: "",
    telefone: "",
    tipoPessoa: 1,
};

export default function ClientesManager() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [busca, setBusca] = useState("");
    const [form, setForm] = useState(camposIniciais);
    const [editId, setEditId] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [errosCampos, setErrosCampos] = useState({
        email: "",
        telefone: "",
        cpf: "",
        dataNascimento: ""
    });
    const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | null>(null);
    const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
    const [itensPorPagina, setItensPorPagina] = useState<number | 'all'>(10);
    const [paginaAtual, setPaginaAtual] = useState(1);

    const carregarClientes = useCallback(async () => {
        const lista = await listarClientes();
        setClientes(lista);
    }, []);

    useEffect(() => {
        carregarClientes();
    }, [carregarClientes]);

    useEffect(() => {
        setPaginaAtual(1);
    }, [busca, itensPorPagina]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errosCampos[e.target.name as keyof typeof errosCampos]) {
            setErrosCampos(prev => ({ ...prev, [e.target.name]: "" }));
        }
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

        if (!form.cpf || !form.dataNascimento || !form.email || !form.nomeCompleto || !form.telefone) {
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
                await atualizarCliente(editId, form);
            } else {
                await criarCliente(form);
            }
            setForm(camposIniciais);
            setEditId(null);
            setErro("");
            carregarClientes();
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

    function handleEditar(cliente: Cliente) {
        setForm({
            cpf: cliente.cpf,
            dataNascimento: cliente.dataNascimento,
            email: cliente.email,
            nomeCompleto: cliente.nomeCompleto,
            telefone: cliente.telefone,
            tipoPessoa: cliente.tipoPessoa,
        });
        setEditId(cliente.id!);
        setClienteEditando(cliente);
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
            setErro("Erro ao tentar excluir o cliente.");
        }
    }

    async function confirmarExcluir() {
        if (modalExcluir.id) {
            try {
                await deletarCliente(modalExcluir.id);
                setModalExcluir({ aberto: false, id: null });
                setModalAnimando(null);
                await carregarClientes();
            } catch (error) {
                console.error("Erro ao excluir cliente:", error);
                setErro("Não foi possível excluir o cliente. Tente novamente.");
            }
        }
    }

    const clientesFiltrados = clientes.filter(c =>
        (c.nomeCompleto && c.nomeCompleto.toLowerCase().includes(busca.toLowerCase())) ||
        c.cpf.includes(busca) ||
        (c.email && c.email.toLowerCase().includes(busca.toLowerCase()))
    );

    const totalPaginas = itensPorPagina === 'all' ? 1 : Math.ceil(clientesFiltrados.length / itensPorPagina);
    const clientesPaginados = itensPorPagina === 'all'
        ? clientesFiltrados
        : clientesFiltrados.slice((paginaAtual - 1) * (itensPorPagina as number), paginaAtual * (itensPorPagina as number));

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

    function formatarData(data: unknown) {
        if (!data) return "";
        // Firestore Timestamp
        if (typeof data === 'object' && data !== null && 'seconds' in data && typeof (data as { seconds: number }).seconds === 'number') {
            const d = new Date((data as { seconds: number }).seconds * 1000);
            return d.toLocaleDateString('pt-BR');
        }
        // String ou Date
        const d = new Date(data as string | number | Date);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
        return "";
    }

    return (
        <div className="flex flex-col min-h-[78vh]">
            <div className="flex mb-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-[400px]">
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
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
                    <div className="ml-4 flex items-center gap-2">
                        <label htmlFor="itensPorPagina" className="text-gray-700">Mostrar:</label>
                        <select
                            id="itensPorPagina"
                            value={itensPorPagina}
                            onChange={e => setItensPorPagina(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="border rounded p-2 text-black"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value="all">Todos</option>
                        </select>
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
                    <FaPlus className="h-4 w-4" />Cadastrar Cliente
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {clientesPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        Nenhum cliente encontrado.
                                    </td>
                                </tr>
                            ) : (
                                clientesPaginados.map((c) => (
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Paginação */}
            {itensPorPagina !== 'all' && totalPaginas > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                    <button
                        className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                        disabled={paginaAtual === 1}
                    >
                        Anterior
                    </button>
                    <span className="text-gray-700">Página {paginaAtual} de {totalPaginas}</span>
                    <button
                        className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaAtual === totalPaginas}
                    >
                        Próxima
                    </button>
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Excluir Cliente</h2>
                            <p className="text-center text-black mb-8">Tem certeza que deseja excluir este cliente?</p>
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Cadastrar Cliente</h2>
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
                            <h2 className="text-2xl font-bold mb-6 text-center text-black">Editar Cliente</h2>
                            {clienteEditando && clienteEditando.criadoEm && (
                                <div className="text-center text-gray-600 mb-4">
                                    Cliente desde {formatarData(clienteEditando.criadoEm)}
                                </div>
                            )}
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
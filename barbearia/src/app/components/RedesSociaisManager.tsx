"use client";
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { 
  listarRedesSociais, 
  criarRedeSocialComIdIncremental, 
  atualizarRedeSocial, 
  deletarRedeSocial,
  inativarRedeSocial,
  reativarRedeSocial,
  REDES_SOCIAIS_PREDEFINIDAS,
  type RedeSocial,
  type RedeSocialPredefinida
} from "../utils/firestoreRedeSocial";
import { FaPencilAlt, FaTrash, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import { 
  FaWhatsapp, 
  FaTelegram, 
  FaInstagram, 
  FaFacebook, 
  FaTiktok, 
  FaLinkedin, 
  FaTwitter, 
  FaYoutube, 
  FaGlobe, 
  FaEnvelope 
} from "react-icons/fa";
import { createPortal } from "react-dom";

const camposIniciais = { 
  nome: "", 
  link: "", 
  numero: "",
  ativo: true 
};

// Mapeamento de ícones
const ICONES_REDES = {
  whatsapp: FaWhatsapp,
  telegram: FaTelegram,
  instagram: FaInstagram,
  facebook: FaFacebook,
  tiktok: FaTiktok,
  linkedin: FaLinkedin,
  twitter: FaTwitter,
  youtube: FaYoutube,
  globe: FaGlobe,
  email: FaEnvelope,
};

export default function RedesSociaisManager() {
  type RedeSocialCompleta = RedeSocial & {
    id: string;
  };

  const [redesSociais, setRedesSociais] = useState<RedeSocialCompleta[]>([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<{ nome: string; link: string; numero: string; ativo: boolean }>(camposIniciais);
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalAnimando, setModalAnimando] = useState<"cadastro" | "editar" | "excluir" | null>(null);
  const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);
  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);

  const carregarRedesSociais = useCallback(async () => {
    const lista = await listarRedesSociais() as RedeSocialCompleta[];
    const listaCompletada = lista.map((item) => ({
      id: item.id,
      nome: item.nome ?? "",
      link: item.link ?? "",
      numero: item.numero ?? "",
      ativo: item.ativo ?? true,
    }));
    setRedesSociais(listaCompletada);
  }, []);

  useEffect(() => {
    carregarRedesSociais();
  }, [busca, carregarRedesSociais]);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErro(""); // limpa o erro ao digitar
  }

  // Função para obter o tipo da rede social selecionada
  function getTipoRedeSocial(nome: string) {
    const rede = REDES_SOCIAIS_PREDEFINIDAS.find((r: RedeSocialPredefinida) => r.nome === nome);
    return rede?.tipo || "link";
  }

  // Função para obter o ícone da rede social
  function getIconeRedeSocial(nome: string) {
    const rede = REDES_SOCIAIS_PREDEFINIDAS.find((r: RedeSocialPredefinida) => r.nome === nome);
    if (!rede) return FaGlobe;

    const IconeComponent = ICONES_REDES[rede.icone as keyof typeof ICONES_REDES];
    return IconeComponent || FaGlobe;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nome) {
      setErro("Selecione uma rede social.");
      return;
    }

    const tipo = getTipoRedeSocial(form.nome);
    if (tipo === "link" && !form.link) {
      setErro("Link é obrigatório para redes sociais do tipo link.");
      return;
    }
    if (tipo === "contato" && !form.numero) {
      setErro("Número é obrigatório para redes sociais do tipo contato.");
      return;
    }

    // Validação: não permitir redes sociais duplicadas
    const jaExiste = redesSociais.some(r =>
      r.nome === form.nome &&
      (!editId || r.id !== editId)
    );
    if (jaExiste) {
      setErro("Já existe uma rede social com esse nome.");
      return;
    }

    const dadosRedeSocial: RedeSocial = {
      nome: form.nome,
      ativo: form.ativo,
    };

    if (tipo === "link") {
      dadosRedeSocial.link = form.link;
    } else {
      dadosRedeSocial.numero = form.numero;
    }

    if (editId) {
      await atualizarRedeSocial(editId, dadosRedeSocial);
      mostrarNotificacao("Rede social editada com sucesso!", "sucesso");
      fecharModalEditarAnimado();
    } else {
      await criarRedeSocialComIdIncremental(dadosRedeSocial);
      mostrarNotificacao("Rede social cadastrada com sucesso!", "sucesso");
      fecharModalCadastroAnimado();
    }
    setForm(camposIniciais);
    setEditId(null);
    setErro("");
    carregarRedesSociais();
  }

  function handleEditar(redeSocial: RedeSocialCompleta) {
    setForm({
      nome: redeSocial.nome,
      link: redeSocial.link ?? "",
      numero: redeSocial.numero ?? "",
      ativo: redeSocial.ativo
    });
    setEditId(redeSocial.id);
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
      await deletarRedeSocial(modalExcluir.id);
      mostrarNotificacao("Rede social excluída!", "erro");
      setModalExcluir({ aberto: false, id: null });
      carregarRedesSociais();
    }
  }

  async function handleInativar(id: string) {
    await inativarRedeSocial(id);
    mostrarNotificacao("Rede social inativada!", "sucesso");
    carregarRedesSociais();
  }

  async function handleReativar(id: string) {
    await reativarRedeSocial(id);
    mostrarNotificacao("Rede social reativada!", "sucesso");
    carregarRedesSociais();
  }

  function mostrarNotificacao(mensagem: string, tipo: "sucesso" | "erro" = "sucesso") {
    setNotificacao({ mensagem, tipo });
    setNotificacaoVisivel(true);
    setTimeout(() => setNotificacaoVisivel(false), 2700);
    setTimeout(() => setNotificacao(null), 3000);
  }

  const redesSociaisFiltradas = redesSociais.filter(r =>
    r.nome.toLowerCase().includes(busca.toLowerCase())
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
            <h1 className="text-2xl font-bold text-black my-8">Redes Sociais</h1>
            <input
              type="text"
              placeholder="Buscar rede social..."
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
          onClick={() => {
            setModalCadastro(true);
            setModalAnimando("cadastro");
            setTimeout(() => setModalAnimando(null), 100);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
        >
          <FaPlus className="h-4 w-4" />
          Nova Rede Social
        </button>
      </div>

      {/* Lista de Redes Sociais */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rede Social
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato/Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {redesSociaisFiltradas.filter(r => r.ativo).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma rede social ativa encontrada.
                  </td>
                </tr>
              ) : (
                redesSociaisFiltradas.filter(r => r.ativo).map((redeSocial) => {
                  const IconeComponent = getIconeRedeSocial(redeSocial.nome);
                  const tipo = getTipoRedeSocial(redeSocial.nome);

                  return (
                    <tr key={redeSocial.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <IconeComponent className="h-6 w-6 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {redeSocial.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              {tipo === "link" ? "Link" : "Contato"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tipo === "link" ? (
                            <a 
                              href={redeSocial.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {redeSocial.link}
                            </a>
                          ) : (
                            <span>{redeSocial.numero}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          redeSocial.ativo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {redeSocial.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditar(redeSocial)}
                            className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                            title="Editar"
                          >
                            <FaPencilAlt className="h-5 w-5" />
                          </button>
                          {redeSocial.ativo ? (
                            <button
                              onClick={() => handleInativar(redeSocial.id)}
                              className="p-2 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-lg transition-colors duration-200"
                              title="Inativar"
                            >
                              <FaEyeSlash className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReativar(redeSocial.id)}
                              className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors duration-200"
                              title="Reativar"
                            >
                              <FaEye className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleExcluir(redeSocial.id)}
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

      {/* Seção de Redes Sociais Inativas */}
      {redesSociaisFiltradas.filter(r => !r.ativo).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">Redes Sociais Inativas</h2>
          <div className="bg-gray-50 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rede Social
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato/Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 divide-y divide-gray-200">
                  {redesSociaisFiltradas.filter(r => !r.ativo).map((redeSocial) => {
                    const IconeComponent = getIconeRedeSocial(redeSocial.nome);
                    const tipo = getTipoRedeSocial(redeSocial.nome);

                    return (
                      <tr key={redeSocial.id} className="hover:bg-gray-100">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <IconeComponent className="h-6 w-6 text-gray-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-600">
                                {redeSocial.nome}
                              </div>
                              <div className="text-sm text-gray-400">
                                {tipo === "link" ? "Link" : "Contato"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">
                            {tipo === "link" ? (
                              <a 
                                href={redeSocial.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-600 underline"
                              >
                                {redeSocial.link}
                              </a>
                            ) : (
                              <span>{redeSocial.numero}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            redeSocial.ativo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {redeSocial.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditar(redeSocial)}
                              className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors duration-200"
                              title="Editar"
                            >
                              <FaPencilAlt className="h-5 w-5" />
                            </button>
                            {redeSocial.ativo ? (
                              <button
                                onClick={() => handleInativar(redeSocial.id)}
                                className="p-2 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-lg transition-colors duration-200"
                                title="Inativar"
                              >
                                <FaEyeSlash className="h-5 w-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReativar(redeSocial.id)}
                                className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors duration-200"
                                title="Reativar"
                              >
                                <FaEye className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleExcluir(redeSocial.id)}
                              className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors duration-200"
                              title="Excluir"
                            >
                              <FaTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
              <h2 className="text-2xl font-bold mb-6 text-center text-black">Nova Rede Social</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <select
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                    required
                  >
                    <option value="">Selecione uma rede social</option>
                    {REDES_SOCIAIS_PREDEFINIDAS.map((rede: RedeSocialPredefinida) => (
                      <option key={rede.nome} value={rede.nome}>
                        {rede.nome}
                      </option>
                    ))}
                  </select>
                  <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">
                    Rede Social *
                  </label>
                </div>

                {form.nome && getTipoRedeSocial(form.nome) === "link" && (
                  <div className="relative">
                    <input
                      type="url"
                      name="link"
                      value={form.link}
                      onChange={handleChange}
                      placeholder=" "
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black">
                      Link *
                    </label>
                  </div>
                )}

                {form.nome && getTipoRedeSocial(form.nome) === "contato" && (
                  <div className="relative">
                    <input
                      type="text"
                      name="numero"
                      value={form.numero}
                      onChange={handleChange}
                      placeholder=" "
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black">
                      Número *
                    </label>
                  </div>
                )}

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
                    <span className="ml-3 text-sm font-medium text-gray-900">Rede Social Ativa</span>
                  </label>
                </div>

                {erro && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {erro}
                  </div>
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
              <h2 className="text-2xl font-bold mb-6 text-center text-black">Editar Rede Social</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <select
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                    required
                  >
                    <option value="">Selecione uma rede social</option>
                    {REDES_SOCIAIS_PREDEFINIDAS.map((rede: RedeSocialPredefinida) => (
                      <option key={rede.nome} value={rede.nome}>
                        {rede.nome}
                      </option>
                    ))}
                  </select>
                  <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">
                    Rede Social *
                  </label>
                </div>

                {form.nome && getTipoRedeSocial(form.nome) === "link" && (
                  <div className="relative">
                    <input
                      type="url"
                      name="link"
                      value={form.link}
                      onChange={handleChange}
                      placeholder=" "
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black">
                      Link *
                    </label>
                  </div>
                )}

                {form.nome && getTipoRedeSocial(form.nome) === "contato" && (
                  <div className="relative">
                    <input
                      type="text"
                      name="numero"
                      value={form.numero}
                      onChange={handleChange}
                      placeholder=" "
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
                      required
                    />
                    <label className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                      peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                      peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                      peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black">
                      Número *
                    </label>
                  </div>
                )}

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
                    <span className="ml-3 text-sm font-medium text-gray-900">Rede Social Ativa</span>
                  </label>
                </div>

                {erro && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {erro}
                  </div>
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

      {/* Modal de Confirmação de Exclusão */}
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
              <h2 className="text-2xl font-bold mb-6 text-center text-black">Confirmar Exclusão</h2>
              <p className="text-center text-black mb-8">
                Tem certeza que deseja excluir esta rede social? Esta ação não pode ser desfeita.
              </p>
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

      {/* Notificação */}
      {notificacao && (
        <div
          className={`fixed bottom-6 right-6 z-[99999] transition-all duration-500 ${
            notificacaoVisivel ? "animate-slide-in-right" : "animate-slide-out-right"
          }`}
        >
          <div
            className={`px-6 py-4 rounded-lg shadow-lg text-white text-base font-semibold flex items-center gap-2 ${
              notificacao.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
            }`}
            style={{ minWidth: 220 }}
          >
            {notificacao.tipo === "erro" && (
              <FaTrash className="inline-block mr-2 text-white" />
            )}
            {notificacao.tipo === "sucesso" && (
              <FaPlus className="inline-block mr-2 text-white" />
            )}
            {notificacao.mensagem}
          </div>
        </div>
      )}
    </div>
  );
} 
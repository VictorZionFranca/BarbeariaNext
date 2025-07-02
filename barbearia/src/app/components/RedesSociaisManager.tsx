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
  type RedeSocial
} from "../utils/firestoreRedeSocial";
import { Timestamp } from "firebase/firestore";
import { FaPencilAlt, FaTrash, FaCheck, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
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
    const rede = REDES_SOCIAIS_PREDEFINIDAS.find(r => r.nome === nome);
    return rede?.tipo || "link";
  }

  // Função para obter o ícone da rede social
  function getIconeRedeSocial(nome: string) {
    const rede = REDES_SOCIAIS_PREDEFINIDAS.find(r => r.nome === nome);
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
          className="bg-[#D2A348] hover:bg-[#B8943A] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FaPlus />
          Nova Rede Social
        </button>
      </div>

      {/* Lista de Redes Sociais */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
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
              {redesSociaisFiltradas.map((redeSocial) => {
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditar(redeSocial)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Editar"
                        >
                          <FaPencilAlt />
                        </button>
                        {redeSocial.ativo ? (
                          <button
                            onClick={() => handleInativar(redeSocial.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Inativar"
                          >
                            <FaEyeSlash />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReativar(redeSocial.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Reativar"
                          >
                            <FaEye />
                          </button>
                        )}
                        <button
                          onClick={() => handleExcluir(redeSocial.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <FaTrash />
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

      {/* Modal de Cadastro */}
      {modalCadastro && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${
          modalAnimando === "cadastro" ? "opacity-0" : "opacity-100"
        }`}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Nova Rede Social</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rede Social *
                </label>
                <select
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D2A348]"
                  required
                >
                  <option value="">Selecione uma rede social</option>
                  {REDES_SOCIAIS_PREDEFINIDAS.map((rede) => (
                    <option key={rede.nome} value={rede.nome}>
                      {rede.nome}
                    </option>
                  ))}
                </select>
              </div>

              {form.nome && getTipoRedeSocial(form.nome) === "link" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link *
                  </label>
                  <input
                    type="url"
                    name="link"
                    value={form.link}
                    onChange={handleChange}
                    placeholder="https://exemplo.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D2A348]"
                    required
                  />
                </div>
              )}

              {form.nome && getTipoRedeSocial(form.nome) === "contato" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número *
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={form.numero}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D2A348]"
                    required
                  />
                </div>
              )}

              {erro && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {erro}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={fecharModalCadastroAnimado}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D2A348] text-white rounded-md hover:bg-[#B8943A]"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {modalEditar && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${
          modalAnimando === "editar" ? "opacity-0" : "opacity-100"
        }`}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Editar Rede Social</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rede Social *
                </label>
                <select
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D2A348]"
                  required
                >
                  <option value="">Selecione uma rede social</option>
                  {REDES_SOCIAIS_PREDEFINIDAS.map((rede) => (
                    <option key={rede.nome} value={rede.nome}>
                      {rede.nome}
                    </option>
                  ))}
                </select>
              </div>

              {form.nome && getTipoRedeSocial(form.nome) === "link" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link *
                  </label>
                  <input
                    type="url"
                    name="link"
                    value={form.link}
                    onChange={handleChange}
                    placeholder="https://exemplo.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D2A348]"
                    required
                  />
                </div>
              )}

              {form.nome && getTipoRedeSocial(form.nome) === "contato" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número *
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={form.numero}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D2A348]"
                    required
                  />
                </div>
              )}

              {erro && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {erro}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={fecharModalEditarAnimado}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D2A348] text-white rounded-md hover:bg-[#B8943A]"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalExcluir.aberto && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${
          modalAnimando === "excluir" ? "opacity-0" : "opacity-100"
        }`}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Confirmar Exclusão</h2>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta rede social? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={fecharModalExcluirAnimado}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExcluir}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação */}
      {notificacao && (
        <div
          className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
            notificacaoVisivel
              ? "opacity-100 transform translate-x-0"
              : "opacity-0 transform translate-x-full"
          }`}
        >
          <div
            className={`px-6 py-4 rounded-lg shadow-lg ${
              notificacao.tipo === "sucesso"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {notificacao.mensagem}
          </div>
        </div>
      )}
    </div>
  );
} 
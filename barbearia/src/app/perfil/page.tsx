"use client"

import ProtectedRoute from "../components/ProtectedRoute";
import { useState, useEffect } from "react";
import { FaUserCircle, FaSignOutAlt, FaLock, FaEdit, FaTimes, FaCheck } from "react-icons/fa";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { updateEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";

export default function Perfil() {
  const { user, logout } = useAuth();
  const [usuario, setUsuario] = useState<{ nome: string; email: string; telefone?: string; foto?: string; emailAlternativo?: string }>({ nome: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editEmailAlternativo, setEditEmailAlternativo] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | undefined>(undefined);
  const [modalSair, setModalSair] = useState(false);

  useEffect(() => {
    async function fetchAdminData() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const ref = doc(db, "admin", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUsuario({
            nome: data.nome || "",
            email: data.email || user.email || "",
            telefone: data.telefone || "",
            foto: data.foto || "",
            emailAlternativo: data.emailAlternativo || "",
          });
          setFotoPreview(data.foto || "");
        } else {
          setUsuario({ nome: user.displayName || "", email: user.email || "" });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, [user]);

  // Modal editar perfil
  function openModalPerfil() {
    setEditNome(usuario.nome);
    setEditEmail(usuario.email);
    setFotoPreview(usuario.foto || "");
    setEditTelefone(usuario.telefone || "");
    setEditEmailAlternativo(usuario.emailAlternativo || "");
    setSenhaAtual("");
    setFeedback(null);
    setModalPerfil(true);
  }
  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!user?.uid) return;
    if (!editNome.trim() || !editEmail.trim()) {
      setFeedback({ tipo: "erro", msg: "Nome e e-mail são obrigatórios." });
      return;
    }
    try {
      // Atualizar nome/email/foto/telefone/emailAlternativo no Firestore
      const ref = doc(db, "admin", user.uid);
      await updateDoc(ref, { nome: editNome, email: editEmail, foto: fotoPreview, telefone: editTelefone, emailAlternativo: editEmailAlternativo });
      // Atualizar e-mail no Auth se mudou
      if (user.email !== editEmail) {
        if (!senhaAtual) {
          setFeedback({ tipo: "erro", msg: "Digite a senha atual para alterar o e-mail." });
          return;
        }
        const cred = EmailAuthProvider.credential(user.email!, senhaAtual);
        await reauthenticateWithCredential(user, cred);
        await updateEmail(user, editEmail);
      }
      setUsuario((prev) => ({ ...prev, nome: editNome, email: editEmail, foto: fotoPreview, telefone: editTelefone, emailAlternativo: editEmailAlternativo }));
      setModalPerfil(false);
      setFeedback({ tipo: "sucesso", msg: "Dados atualizados com sucesso!" });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ tipo: "erro", msg: err.message || "Erro ao atualizar dados." });
      } else {
        setFeedback({ tipo: "erro", msg: "Erro ao atualizar dados." });
      }
    }
  }

  // Modal alterar senha
  function openModalSenha() {
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmaSenha("");
    setFeedback(null);
    setModalSenha(true);
  }
  async function salvarNovaSenha(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!user || !user.email) return;
    if (!senhaAtual || !novaSenha || !confirmaSenha) {
      setFeedback({ tipo: "erro", msg: "Preencha todos os campos." });
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setFeedback({ tipo: "erro", msg: "As senhas não coincidem." });
      return;
    }
    try {
      const cred = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, novaSenha);
      setModalSenha(false);
      setFeedback({ tipo: "sucesso", msg: "Senha alterada com sucesso!" });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ tipo: "erro", msg: err.message || "Erro ao alterar senha." });
      } else {
        setFeedback({ tipo: "erro", msg: "Erro ao alterar senha." });
      }
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500 mt-20">Carregando perfil...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl p-12 mt-16 shadow flex flex-col gap-12">
        {/* Foto de perfil e dados principais */}
        <div className="flex items-center gap-16 mb-10">
          <div className="relative">
            {usuario.foto ? (
              <Image
                src={usuario.foto}
                alt="Foto de perfil"
                width={120}
                height={120}
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-300"
                unoptimized
              />
            ) : (
              <FaUserCircle className="w-32 h-32 text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-2">
              <h2 className="text-3xl font-bold text-black truncate flex items-center gap-2">{usuario.nome}
                <button className="ml-2 text-blue-600 hover:text-blue-800" title="Editar perfil" onClick={openModalPerfil}>
                  <FaEdit />
                </button>
              </h2>
            </div>
            <p className="text-gray-600 text-lg truncate">{usuario.email}</p>
            {usuario.telefone && <p className="text-gray-600">{usuario.telefone}</p>}
          </div>
        </div>
        {feedback && (
          <div className={`mt-2 text-sm ${feedback.tipo === "sucesso" ? "text-green-600" : "text-red-600"}`}>{feedback.msg}</div>
        )}
        {/* Botões de ação */}
        <div className="flex items-center gap-2 ml-4 mb-8">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 font-semibold" onClick={openModalSenha}>
            <FaLock /> Alterar senha
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors" onClick={() => setModalSair(true)}>
            <FaSignOutAlt className="transform -scale-x-100" /> Sair
          </button>
        </div>

        {/* Modal Editar Perfil */}
        {modalPerfil && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg relative transform transition-all duration-300 animate-modal-in flex flex-col gap-6">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => setModalPerfil(false)} title="Fechar"><FaTimes /></button>
              <h2 className="text-xl font-bold mb-4 text-black">Editar Perfil</h2>
              <form onSubmit={salvarEdicao} className="flex flex-col gap-3">
                <input
                  className="border border-gray-300 rounded-lg p-2 text-black"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  placeholder="Nome"
                  required
                />
                <input
                  className="border border-gray-300 rounded-lg p-2 text-black"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="E-mail"
                  required
                  type="email"
                />
                <input
                  className="border border-gray-300 rounded-lg p-2 text-black"
                  value={editTelefone}
                  onChange={e => setEditTelefone(e.target.value)}
                  placeholder="Telefone (opcional)"
                  type="text"
                />
                <input
                  className="border border-gray-300 rounded-lg p-2 text-black"
                  value={editEmailAlternativo}
                  onChange={e => setEditEmailAlternativo(e.target.value)}
                  placeholder="E-mail alternativo (opcional)"
                  type="email"
                />
                <input
                  className="border border-gray-300 rounded-lg p-2 text-black"
                  value={fotoPreview || ""}
                  onChange={e => setFotoPreview(e.target.value)}
                  placeholder="URL da foto de perfil (opcional)"
                  type="url"
                />
                {user && user.email !== editEmail && (
                  <input
                    className="border border-gray-300 rounded-lg p-2 text-black"
                    value={senhaAtual}
                    onChange={e => setSenhaAtual(e.target.value)}
                    placeholder="Senha atual para alterar e-mail"
                    type="password"
                    required
                  />
                )}
                {feedback && (
                  <div className={`text-sm ${feedback.tipo === "sucesso" ? "text-green-600" : "text-red-600"}`}>{feedback.msg}</div>
                )}
                <div className="flex gap-2 mt-2 justify-center">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-1"><FaCheck /> Salvar</button>
                  <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center gap-1" onClick={() => setModalPerfil(false)}><FaTimes /> Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Alterar Senha */}
        {modalSenha && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg relative transform transition-all duration-300 animate-modal-in flex flex-col gap-6">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => setModalSenha(false)} title="Fechar"><FaTimes /></button>
              <h2 className="text-xl font-bold mb-4 text-black">Alterar Senha</h2>
              <form onSubmit={salvarNovaSenha} className="flex flex-col gap-3">
                <input type="password" placeholder="Senha atual" className="border border-gray-300 rounded-lg p-2 text-black" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required />
                <input type="password" placeholder="Nova senha" className="border border-gray-300 rounded-lg p-2 text-black" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required />
                <input type="password" placeholder="Confirmar nova senha" className="border border-gray-300 rounded-lg p-2 text-black" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} required />
                {feedback && (
                  <div className={`text-sm ${feedback.tipo === "sucesso" ? "text-green-600" : "text-red-600"}`}>{feedback.msg}</div>
                )}
                <div className="flex gap-2 mt-2 justify-center">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-1"><FaCheck /> Salvar</button>
                  <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center gap-1" onClick={() => setModalSenha(false)}><FaTimes /> Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal de confirmação de sair */}
        {modalSair && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative flex flex-col gap-6 animate-modal-in">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => setModalSair(false)} title="Fechar"><FaTimes /></button>
              <h2 className="text-xl font-bold text-black mb-2">Deseja realmente sair?</h2>
              <p className="text-gray-700 mb-4">Você será desconectado da sua conta.</p>
              <div className="flex gap-2 mt-2 justify-center">
                <button type="button" className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 flex items-center gap-1" onClick={() => { setModalSair(false); logout(); }}><FaSignOutAlt className="transform -scale-x-100" /> Sair</button>
                <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center gap-1" onClick={() => setModalSair(false)}><FaTimes /> Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
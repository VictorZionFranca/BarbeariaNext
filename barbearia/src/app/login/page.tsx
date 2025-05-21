"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebaseConfig";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";
import "../globals.css";
import Image from "next/image";

export default function Login() {
  const { user, loading } = useAuth(); // Adiciona loading para tratar o estado inicial
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false); // Controla o estado de carregamento do login
  const [errorVisible, setErrorVisible] = useState(false); // Controla a visibilidade da mensagem de erro

  useEffect(() => {
    if (!loading && user) {
      // Redireciona para o dashboard se o usuário já estiver autenticado
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Se houver um erro, faz a mensagem aparecer e depois desaparecer após 3 segundos
    if (error) {
      setErrorVisible(true);
      const timer = setTimeout(() => {
        setErrorVisible(false);
      }, 3000); // 3000 milissegundos = 3 segundos

      // Limpeza do timer quando o componente for desmontado ou o erro mudar
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // Limpa qualquer erro anterior
    setLoginLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/"); // Redireciona para o dashboard após o login bem-sucedido
    } catch (err) {
      const firebaseError = err as { code: string };
      console.error("Erro no login:", firebaseError);

      // Tratamento de erros do Firebase
      switch (firebaseError.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Email ou senha errados!");
          break;
        case "auth/invalid-email":
          setError("Email inválido.");
          break;
        default:
          setError("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white bg-custom-repeat bg-repeat bg-custom-small">
      {/* Imagem à esquerda */}
      <div className="flex items-center justify-center ">
        <Image
          src="/images/Unisenai.png"
          alt="Logo da Barbearia"
          width={500}
          height={500}
          className="rounded-full"
        />
      </div>

      {/* Espaço entre a imagem e o formulário */}
      <div className="w-8"></div>

      {/* Formulário à direita */}
      <div className="max-w-md max-h-[490px] w-full bg-[rgba(19,19,16,255)] p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mt-5 mb-6 text-white">
          Login
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-md font-semibold mt-5">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-500
        text-white bg-[rgb(30,55,75)]"
              placeholder="Digite seu email"
              required
              disabled={loginLoading}
              autoComplete="email" // Adicionando autoComplete para email
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-md font-semibold mt-5"
            >
              Senha
            </label>
            <div className="relative mb-5">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-500
          text-white bg-[rgb(30,55,75)]"
                placeholder="Digite sua senha"
                required
                disabled={loginLoading}
                autoComplete="current-password" // Adicionando autoComplete para senha
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-white text-xl autofill:text-black"
                disabled={loginLoading}
              >
                {showPassword ? <BsEyeSlashFill /> : <BsEyeFill />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className={`w-full bg-[#D2A348] text-white p-2 rounded font-semibold hover:bg-[#b38e3a] ${
              loginLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loginLoading}
          >
            {loginLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        {/* Exibindo o erro abaixo do formulário com transição de fade */}
        <div
          className={`bg-red-200 text-red-600 p-2 rounded mt-20 text-center transition-opacity duration-500 
            ease-in-out ${errorVisible ? "opacity-100" : "opacity-0"}`}
        >
          {error}
        </div>
      </div>
    </div>
  );
}

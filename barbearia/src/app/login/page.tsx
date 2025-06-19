"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";
import "../globals.css";
import Image from "next/image";

export default function Login() {
  const { user, loading, userName, login, authError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    // Só redireciona se estiver autenticado E for admin (userName existe)
    if (!loading && user && userName) {
      router.replace("/");
    }
  }, [user, userName, loading, router]);

  useEffect(() => {
    // Se houver um erro, faz a mensagem aparecer e depois desaparecer após 3 segundos
    if (authError) {
      setErrorVisible(true);
      const timer = setTimeout(() => {
        setErrorVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [authError]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      await login(email, password);
      // O redirecionamento é feito automaticamente pelo contexto
    } catch (error) {
      // O erro já é tratado pelo contexto
      console.error("Erro no login:", error);
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
              autoComplete="email"
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
                autoComplete="current-password"
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
            className={`w-full bg-[#D2A348] text-white p-2 rounded font-semibold hover:bg-[#b38e3a] ${loginLoading ? "opacity-50 cursor-not-allowed" : ""
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
          {authError}
        </div>
      </div>
    </div>
  );
}

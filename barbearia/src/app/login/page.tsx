"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Importar o useRouter
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter(); // Instanciar o roteador

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Simular validação de login
    if (email === "vzion435@gmail.com" && password === "123456") {
      alert("Login realizado com sucesso!");
      router.push("/"); // Redirecionar para a página principal
    } else {
      setError("Email ou senha inválidos.");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 text-black">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 className="text-2xl font-bold text-center text-blue-900 mb-6">
          Gestão Barbearia - Login
        </h1>
        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Digite seu email"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-700 text-xl"
              >
                {showPassword ? <BsEyeSlashFill/> : <BsEyeFill/>}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-900 text-white p-2 rounded font-semibold hover:bg-blue-800"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
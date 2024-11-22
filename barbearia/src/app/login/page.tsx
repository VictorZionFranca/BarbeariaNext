'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebaseConfig';
import { BsEyeFill, BsEyeSlashFill } from 'react-icons/bs';
import '../globals.css';

export default function Login() {
  const { user, loading } = useAuth(); // Adiciona loading para tratar o estado inicial
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false); // Controla o estado de carregamento do login

  useEffect(() => {
    if (!loading && user) {
      // Redireciona para o dashboard se o usuário já estiver autenticado
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/'); // Redireciona para o dashboard após o login bem-sucedido
    } catch (err) {
      const firebaseError = err as { code: string };
      console.error('Erro no login:', firebaseError);

      // Tratamento de erros do Firebase
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setError('Usuário não encontrado.');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta.');
          break;
        case 'auth/invalid-email':
          setError('Email inválido.');
          break;
        default:
          setError('Erro ao fazer login. Tente novamente.');
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
    <div className="flex items-center justify-center h-screen bg-gray-100 text-white bg-custom-gradient">
      {/* Imagem à esquerda */}
      <div className="w-1/2 flex items-center justify-center">
        <img
          src='/images/LogoBarbearia.png'
          alt="Descrição da imagem"
          className="max-h-full max-w-full object-cover rounded-lg"
        />
      </div>

      {/* Espaço entre a imagem e o formulário */}
      <div className="w-8"></div>

      {/* Formulário à direita */}
      <div className="w-1/3 bg-[rgb(30,55,75)] bg-opacity-80 p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">
          Login
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
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-500
               text-white bg-[rgb(30,55,75)]"
              placeholder="Digite seu email"
              required
              disabled={loginLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-500
                text-white bg-[rgb(30,55,75)]"
                placeholder="Digite sua senha"
                required
                disabled={loginLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-white text-xl"
                disabled={loginLoading}
              >
                {showPassword ? <BsEyeSlashFill /> : <BsEyeFill />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-900 text-white p-2 rounded font-semibold hover:bg-blue-800 ${
              loginLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={loginLoading}
          >
            {loginLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

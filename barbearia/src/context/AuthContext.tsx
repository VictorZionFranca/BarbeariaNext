"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebaseConfig";
import { fetchUserNameByUid } from "../app/utils/firestoreUtils";

type AuthContextType = {
  user: User | null;
  userName: string | null;
  loading: boolean;
  authError: string | null;
  refreshAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userName: null,
  loading: true,
  authError: null,
  refreshAuth: () => {},
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  // Configurar persistência local
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar se é admin
      const name = await fetchUserNameByUid(user.uid);
      if (!name) {
        throw new Error("Acesso negado! Este sistema é exclusivo para administradores.");
      }

      // Salvar token no localStorage
      const token = await user.getIdToken();
      localStorage.setItem('authToken', token);
      localStorage.setItem('userUid', user.uid);
      localStorage.setItem('userName', name);

      setUser(user);
      setUserName(name);
      
      router.replace("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Erro no login:", error);
        setAuthError(error.message || "Erro ao fazer login");
        throw error;
      } else {
        setAuthError("Erro ao fazer login");
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      // Limpar dados locais
      localStorage.removeItem('authToken');
      localStorage.removeItem('userUid');
      localStorage.removeItem('userName');
      
      setUser(null);
      setUserName(null);
      setAuthError(null);
      
      router.push("/login");
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  }, [router]);

  const refreshAuth = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    setUser(currentUser);
    
    if (currentUser) {
      try {
        const name = await fetchUserNameByUid(currentUser.uid);
        if (name) {
          setUserName(name);
          // Atualizar token
          const token = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          localStorage.setItem('userUid', currentUser.uid);
          localStorage.setItem('userName', name);
        } else {
          setAuthError(null);
          setUserName(null);
          await logout();
        }
      } catch (error) {
        console.error("Erro ao buscar nome de usuário:", error);
        setAuthError("Erro ao autenticar usuário");
        await logout();
      }
    } else {
      setUserName(null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      setLoading(true);
      setAuthError(null);

      if (authUser) {
        try {
          const name = await fetchUserNameByUid(authUser.uid);
          if (name) {
            setUserName(name);
            // Atualizar token
            const token = await authUser.getIdToken();
            localStorage.setItem('authToken', token);
            localStorage.setItem('userUid', authUser.uid);
            localStorage.setItem('userName', name);
          } else {
            setAuthError(null);
            setUserName(null);
            await logout();
          }
        } catch (error) {
          console.error("Erro ao buscar nome de usuário:", error);
          setAuthError("Erro ao autenticar usuário");
          await logout();
        }
      } else {
        setUserName(null);
        // Limpar dados locais se não há usuário
        localStorage.removeItem('authToken');
        localStorage.removeItem('userUid');
        localStorage.removeItem('userName');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, logout]);

  return (
    <AuthContext.Provider value={{ user, userName, loading, authError, refreshAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

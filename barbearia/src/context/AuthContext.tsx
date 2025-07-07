"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

type UserInfo = { nome: string; foto?: string };
type AuthContextType = {
  user: User | null;
  userInfo: UserInfo | null;
  loading: boolean;
  authError: string | null;
  refreshAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userInfo: null,
  loading: true,
  authError: null,
  refreshAuth: () => {},
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
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

      // Buscar nome e foto do Firestore
      const ref = doc(db, "admin", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error("Acesso negado! Este sistema é exclusivo para administradores.");
      }
      const data = snap.data();
      const info: UserInfo = { nome: data.nome || "", foto: data.foto || undefined };

      // Salvar token no localStorage
      const token = await user.getIdToken();
      localStorage.setItem('authToken', token);
      localStorage.setItem('userUid', user.uid);
      localStorage.setItem('userInfo', JSON.stringify(info));

      setUser(user);
      setUserInfo(info);
      
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
      localStorage.removeItem('userInfo');
      
      setUser(null);
      setUserInfo(null);
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
        const ref = doc(db, "admin", currentUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const info: UserInfo = { nome: data.nome || "", foto: data.foto || undefined };
          setUserInfo(info);
          // Atualizar token
          const token = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          localStorage.setItem('userUid', currentUser.uid);
          localStorage.setItem('userInfo', JSON.stringify(info));
        } else {
          setAuthError(null);
          setUserInfo(null);
          await logout();
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        setAuthError("Erro ao autenticar usuário");
        await logout();
      }
    } else {
      setUserInfo(null);
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
          const ref = doc(db, "admin", authUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            const info: UserInfo = { nome: data.nome || "", foto: data.foto || undefined };
            setUserInfo(info);
            // Atualizar token
            const token = await authUser.getIdToken();
            localStorage.setItem('authToken', token);
            localStorage.setItem('userUid', authUser.uid);
            localStorage.setItem('userInfo', JSON.stringify(info));
          } else {
            setAuthError(null);
            setUserInfo(null);
            await logout();
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          setAuthError("Erro ao autenticar usuário");
          await logout();
        }
      } else {
        setUserInfo(null);
        // Limpar dados locais se não há usuário
        localStorage.removeItem('authToken');
        localStorage.removeItem('userUid');
        localStorage.removeItem('userInfo');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, logout]);

  return (
    <AuthContext.Provider value={{ user, userInfo, loading, authError, refreshAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

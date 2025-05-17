"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebaseConfig";
import { fetchUserNameByUid } from "../app/utils/firestoreUtils";

type AuthContextType = {
  user: User | null;
  userName: string | null;
  loading: boolean;
  authError: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userName: null,
  loading: true,
  authError: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

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
          } else {
            setAuthError("Falta de permissão para entrar no site!");
            setUserName(null);

            // Espera 1 segundo, desloga e redireciona
            setTimeout(async () => {
              await signOut(auth);
              router.push("/login");
            }, 1000);
          }
        } catch (error) {
          console.error("Erro ao buscar nome de usuário:", error);
          setAuthError("Erro ao autenticar usuário");
        }
      } else {
        setUserName(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, userName, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

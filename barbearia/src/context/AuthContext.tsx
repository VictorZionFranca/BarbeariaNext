import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth"; // Importa o tipo User do Firebase
import { auth } from "../lib/firebaseConfig";
import { fetchUserNameByEmail } from "../app/utils/firestoreUtils";

type AuthContextType = {
  user: User | null; // Substitua any pelo tipo User do Firebase
  userName: string | null; // Nome do usuário
  loading: boolean; // Status de carregamento
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userName: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); // Define user como User ou null
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);

      if (authUser && authUser.email) {
        const name = await fetchUserNameByEmail(authUser.email);
        setUserName(name); // Define o nome do usuário
      } else {
        setUserName(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userName, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UserProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login"); // Redireciona para o login se não estiver autenticado
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return null; // Evita renderizar algo se o redirecionamento ainda não ocorreu
  }

  return (
    <div>
      <h1>Bem-vindo, {user.email}!</h1>
    </div>
  );
}

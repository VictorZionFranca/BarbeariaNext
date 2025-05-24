import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";

export default function Header() {
  const { userName } = useAuth(); // Obtém o nome do usuário autenticado

  return (
    <ProtectedRoute>
    <header className="flex justify-between items-center p-4 bg-[rgba(19,19,16,255)] shadow z-10">
      <div className="flex-1 font-semibold text-2xl text-white">
        <Link href="/">Gestão Barbearia</Link>
      </div>
      <Link href="/perfil">
        <div className="flex-1 flex justify-end items-center gap-4">
          <span className="text-white font-semibold">{userName || "Saindo..."}</span>
        </div>
      </Link>
    </header>
    </ProtectedRoute>
  );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, authError } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Quando a verificação termina...
    if (!loading) {
      if (!user || authError) {
        router.replace("/login");
      } else {
        setShouldRender(true);
      }
    }
  }, [loading, user, authError, router]);

  // Enquanto carrega ou redireciona, mostra tela de carregamento
  if (loading || !shouldRender) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-gray-500 text-xl">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}

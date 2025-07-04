"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Header from "./components/Header";
import Sidebar from "./components/SideBar";
import Footer from "./components/Footer";
import "../app/globals.css";

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { loading, authError } = useAuth();
  const pathname = usePathname();
  const noLayoutRoutes = ["/login"];
  const isNoLayout = noLayoutRoutes.includes(pathname);

  // 1. Enquanto estiver carregando, renderiza uma tela branca ou spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-gray-600 text-xl">Carregando...</p>
      </div>
    );
  }

  // 2. Se houver erro de permissão, exibe apenas a mensagem
  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-red-600 text-center text-xl">{authError}</p>
      </div>
    );
  }

  // 3. Caso esteja na rota sem layout (ex: /login)
  if (isNoLayout) {
    return <main className="flex-1">{children}</main>;
  }

  // 4. Renderiza o layout completo
  return (
    <>
      <div className="z-20 fixed top-0 left-0 w-full bg-white">
        <Header />
      </div>
      <div className="relative flex flex-1 z-10 pt-16">
        <div className="z-30 fixed top-16 left-0 bottom-0 bg-gray-800 text-white">
          <Sidebar />
        </div>
        <main className="flex-1 ml-16 bg-gray-100 pt-4 z-10">
          <div className="h-auto px-6">{children}</div>
          <div className="mt-auto">
            <Footer />
          </div>
        </main>
      </div>
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="relative flex flex-col h-screen bg-gray-100">
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Sidebar from "./components/SideBar";
import Footer from "./components/Footer";
import "../app/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define as rotas que não usam Header, Sidebar e Footer
  const noLayoutRoutes = ["/login"];

  // Verifica se a rota atual está na lista de rotas sem layout
  const isNoLayout = noLayoutRoutes.includes(pathname);

  return (
    <html lang="pt-br">
      <body className={`relative flex flex-col h-screen ${isNoLayout ? "bg-gray-100" : ""}`}>
        {!isNoLayout && (
          <>
            {/* Header fixo */}
            <div className="z-20 fixed top-0 left-0 w-full bg-white">
              <Header />
            </div>

            {/* Conteúdo principal com Sidebar e Main */}
            <div className="relative flex flex-1 z-10 pt-16">
              {/* Sidebar fixo */}
              <div className="z-30 fixed top-16 left-0 bottom-0 bg-gray-800 text-white">
                <Sidebar />
              </div>

              {/* Main Content (ajustado para a largura do Sidebar fixo) */}
              <main className="flex-1 ml-16 bg-gray-100 pt-4 z-10">
                <div className="h-auto px-6">
                  {children}
                </div>
                <div className="mt-auto">
                  <Footer />
                </div>
              </main>
            </div>
          </>
        )}

        {/* Renderiza apenas o conteúdo principal para rotas sem layout */}
        {isNoLayout && <main className="flex-1">{children}</main>}
      </body>
    </html>
  );
}
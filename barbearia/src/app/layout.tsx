import Header from "./components/Header";
import Sidebar from "./components/SideBar";
import Footer from "./components/Footer";
import '../app/globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="relative flex flex-col h-screen">
        <div className="z-20">
          {/* Header */}
          <Header />
        </div>

        {/* Conteúdo principal com Sidebar e Main */}
        <div className="relative flex flex-1 z-10">
          {/* Sidebar */}
          <div className="relative z-10 sidebar">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 bg-gray-200 p-4">{children}</main>
        </div>

        {/* Footer */}
        <div className="z-5">
          <Footer />
        </div>
      </body>
    </html>
  );
}

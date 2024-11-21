import Link from "next/link";

export default function Header() {
  // Dados fictícios (para teste)
  const userName = "Gestor";

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow">
      <div className="flex-1 font-semibold text-2xl text-blue-900">
        <Link href="/">
          Gestão Barbearia
        </Link>
      </div>
      <Link href="/perfil">
        <div className="flex-1 flex justify-end items-center gap-4">
          <span className="text-black font-semibold">{userName}</span>
        </div>
      </Link>
    </header >
  );
}

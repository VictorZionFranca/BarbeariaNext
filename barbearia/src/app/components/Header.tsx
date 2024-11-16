import Link from "next/link";

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 bg-white shadow">
      <div className="flex-1 font-semibold text-2xl text-blue-900">
        <Link href="/">
          Gestão Barbearia
        </Link>
      </div>
      <div className="flex-1 text-right text-black font-semibold">
        Gestor
      </div>
    </header>
  );
}

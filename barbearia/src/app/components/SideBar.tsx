'use client'; // Adicione no topo

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // Importa o hook usePathname
import { BsFillGridFill, BsCalendarCheck, BsFillPersonFill, BsFilePerson, 
    BsScissors, BsBoxSeam, BsCashCoin, BsCaretLeftFill, BsCaretRightFill } from "react-icons/bs";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname(); // Captura o caminho atual da URL

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <aside
      className={`bg-white text-blue-900 h-full transition-all duration-500 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Botão para abrir/fechar o sidebar */}
      <button
        onClick={toggleSidebar}
        className="py-3 px-6 focus:outline-none font-semibold hover:bg-gray-200 rounded-lg"
      >
        {isOpen ? <BsCaretLeftFill/> : <BsCaretRightFill/>}
      </button>

      {/* Navegação */}
      <nav className="mt-4 flex justify-center">
        <ul>
          <Link href="/">
            <li
              className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg ${
                pathname === "/" ? "bg-gray-300 text-blue-500" : "hover:bg-gray-200"
              }`}
            >
              <BsFillGridFill />
              {isOpen && <span>Dashboard</span>}
            </li>
          </Link>
          <Link href="/agendamentos">
            <li
              className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg ${
                pathname === "/agendamentos" ? "bg-gray-300 text-blue-500" : "hover:bg-gray-200"
              }`}
            >
              <BsCalendarCheck />
              {isOpen && <span>Agendamentos</span>}
            </li>
          </Link>
          <Link href="/clientes">
            <li
              className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg ${
                pathname === "/clientes" ? "bg-gray-300 text-blue-500" : "hover:bg-gray-200"
              }`}
            >
              <BsFillPersonFill />
              {isOpen && <span>Clientes</span>}
            </li>
          </Link>
          <Link href="/colaboradores">
            <li
              className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg ${
                pathname === "/colaboradores" ? "bg-gray-300 text-blue-500" : "hover:bg-gray-200"
              }`}
            >
              <BsFilePerson />
              {isOpen && <span>Colaboradores</span>}
            </li>
          </Link>
          <Link href="/servicos">
            <li
              className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg ${
                pathname === "/servicos" ? "bg-gray-300 text-blue-500" : "hover:bg-gray-200"
              }`}
            >
              <BsScissors />
              {isOpen && <span>Serviços</span>}
            </li>
          </Link>
          <Link href="/produtos">
            <li
              className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg ${
                pathname === "/produtos" ? "bg-gray-300 text-blue-500" : "hover:bg-gray-200"
              }`}
            >
              <BsBoxSeam />
              {isOpen && <span>Produtos</span>}
            </li>
          </Link>
          <Link href="/financeiro">
            <li
              className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg ${
                pathname === "/financeiro" ? "bg-gray-300 text-blue-500" : "hover:bg-gray-200"
              }`}
            >
              <BsCashCoin />
              {isOpen && <span>Financeiro</span>}
            </li>
          </Link>
        </ul>
      </nav>
    </aside>
  );
}
'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BsFillGridFill, BsCalendarCheck, BsFillPersonFill, BsFilePerson,
  BsScissors, BsBoxSeam, BsCashCoin, BsCaretLeftFill, BsCaretRightFill
} from "react-icons/bs";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <aside
      className={`bg-white text-blue-900 h-full transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Botão para abrir/fechar o sidebar */}
      <button
        onClick={toggleSidebar}
        className="py-3 px-6 focus:outline-none font-semibold hover:bg-gray-200 rounded-lg"
      >
        {isOpen ? <BsCaretLeftFill /> : <BsCaretRightFill />}
      </button>

      {/* Navegação */}
      <nav className="mt-4 flex justify-center">
        <ul>
          {[
            { href: "/", icon: <BsFillGridFill />, label: "Dashboard" },
            { href: "/agendamentos", icon: <BsCalendarCheck />, label: "Agendamentos" },
            { href: "/clientes", icon: <BsFillPersonFill />, label: "Clientes" },
            { href: "/colaboradores", icon: <BsFilePerson />, label: "Colaboradores" },
            { href: "/servicos", icon: <BsScissors />, label: "Serviços" },
            { href: "/produtos", icon: <BsBoxSeam />, label: "Produtos" },
            { href: "/financeiro", icon: <BsCashCoin />, label: "Financeiro" },
          ].map((item, index) => (
            <Link href={item.href} key={item.href}>
              <li
                className={`flex items-center gap-2 py-2 mb-1 px-6 font-semibold rounded-lg transition-all duration-300 ${
                  pathname === item.href
                    ? "bg-gray-300 text-blue-500"
                    : "hover:bg-gray-200"
                }`}
              >
                {/* Ícone fixo */}
                {item.icon}

                {/* Texto com transição suave somente ao abrir */}
                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${
                    isOpen
                      ? "opacity-100 max-w-full ml-2"
                      : "opacity-0 max-w-0"
                  }`}
                  style={{
                    transitionProperty: isOpen ? "opacity, max-width" : "none", // Ativa transição somente ao abrir
                    transitionDelay: isOpen ? `${index * 0.12}s` : "0s", // Efeito gradual ao abrir
                  }}
                >
                  {item.label}
                </span>
              </li>
            </Link>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
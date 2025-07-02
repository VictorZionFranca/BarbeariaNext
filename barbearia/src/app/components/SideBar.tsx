"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation"; 
import { signOut } from "firebase/auth"; 
import { auth } from "../../lib/firebaseConfig"; 
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  // BsFillGridFill,
  BsHouseDoorFill,
  BsCalendarCheck,
  BsFillPersonFill,
  BsFilePerson,
  BsScissors,
  BsBoxSeam,
  // BsCashCoin,
  BsBoxArrowInLeft,
  BsBuilding,
  BsNewspaper,
  BsShare
} from "react-icons/bs";

import { FaCreditCard } from "react-icons/fa6";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); 

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Fecha o sidebar quando a rota muda
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Função para lidar com o logout
  const handleLogout = async () => {
    try {
      await signOut(auth); // Realiza o logout
      router.push("/login"); // Redireciona para a página de login
    } catch (error) {
      console.error("Erro ao deslogar: ", error);
    }
  };

  const menuItems = useMemo(
    () => [
      { href: "/", icon: <BsHouseDoorFill />, label: "Home" },
      { href: "/agendamentos", icon: <BsCalendarCheck />, label: "Agendamentos" },
      { href: "/clientes", icon: <BsFillPersonFill />, label: "Clientes" },
      { href: "/colaboradores", icon: <BsFilePerson />, label: "Colaboradores" },
      { href: "/servicos", icon: <BsScissors />, label: "Serviços" },
      { href: "/unidades", icon: <BsBuilding />, label: "Unidades" },
      { href: "/produtos", icon: <BsBoxSeam />, label: "Produtos" },
      { href: "/noticias", icon: <BsNewspaper />, label: "Notícias" },
      { href: "/formaPagamento", icon: <FaCreditCard />, label: "Forma de Pagamento" },
      { href: "/redesSociais", icon: <BsShare />, label: "Redes Sociais" },
    ],
    []
  );
  // altera o estado do highlightIndex com base na rota atual
  const [highlightIndex, setHighlightIndex] = useState(
    menuItems.findIndex((item) => item.href === pathname)
  );

  useEffect(() => {
    const idx = menuItems.findIndex((item) => item.href === pathname);
    setHighlightIndex(idx);
  }, [pathname, menuItems]);

  return (
    <ProtectedRoute>
      <aside
        className={`bg-[rgba(19,19,16,255)] text-white h-full transition-all duration-300 shadow-md ${
          isOpen ? "w-64" : "w-16"
        } flex flex-col`}
      >
        {/* Botão para abrir/fechar o sidebar */}
        <button
          onClick={toggleSidebar}
          className="py-3 px-5 focus:outline-none hover:bg-gray-700 rounded-lg mt-2 mb-1 text-2xl flex items-center justify-center"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          <span className="relative w-6 h-6 flex items-center">
            <span
              className={`absolute left-0 ${isOpen ? 'top-3 rotate-45' : 'top-1.5'} w-6 h-0.5 bg-white rounded transition-all duration-[450ms]`}
            ></span>
            <span
              className={`absolute left-0 top-3 w-6 h-0.5 bg-white rounded transition-all uration-[450ms] ${isOpen ? 'opacity-0' : ''}`}
            ></span>
            <span
              className={`absolute left-0 ${isOpen ? 'top-3 -rotate-45' : 'top-[18px]'} w-6 h-0.5 bg-white rounded transition-all duration-[450ms]`}
            ></span>
          </span>
        </button>

        {/* Navegação */}
        <nav className="flex flex-col flex-grow overflow-hidden">
          <ul className="overflow-y-auto h-[calc(100vh-8rem)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {menuItems.map((item, index) => (
              <Link href={item.href} key={item.href}>
                <li
                  className={`flex items-center py-2 mb-1 px-6 font-medium text-lg rounded-lg transition-all duration-300
                  ${highlightIndex === index ? "bg-[#D2A348] text-white" : "hover:bg-gray-700"}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span
                    className={`whitespace-nowrap overflow-hidden transition-all duration-500 ml-2 ${
                      isOpen
                        ? "opacity-100 max-w-full"
                        : "opacity-0 max-w-0"
                    }`}
                    style={{
                      transitionProperty: "opacity, max-width",
                      transitionDelay: "0s",
                    }}
                  >
                    {item.label}
                  </span>
                </li>
              </Link>
            ))}
          </ul>

          {/* Botão "Sair" fixo ao final */}
          <ul className="mt-auto">
            <li
              onClick={handleLogout} // Chama a função de logout ao clicar
              className={`flex items-center py-2 mb-1 px-6 font-medium text-lg rounded-lg transition-all duration-300 hover:bg-gray-700 cursor-pointer`}
            >
              <span className="text-lg"><BsBoxArrowInLeft /></span>
              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-500 ml-2 ${
                  isOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                }`}
                style={{
                  transitionProperty: "opacity, max-width",
                  transitionDelay: "0s",
                }}
              >
                Sair
              </span>
            </li>
          </ul>
        </nav>
      </aside>
    </ProtectedRoute>
  );
}

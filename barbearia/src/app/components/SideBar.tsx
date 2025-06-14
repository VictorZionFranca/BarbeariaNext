"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation"; 
import { signOut } from "firebase/auth"; 
import { auth } from "../../lib/firebaseConfig"; 
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BsFillGridFill,
  BsCalendarCheck,
  BsFillPersonFill,
  BsFilePerson,
  BsScissors,
  BsBoxSeam,
  // BsCashCoin,
  BsBoxArrowInLeft,
  BsList,
  BsBuilding,
  BsNewspaper,
  BsX
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
      { href: "/", icon: <BsFillGridFill />, label: "Dashboard" },
      { href: "/agendamentos", icon: <BsCalendarCheck />, label: "Agendamentos" },
      { href: "/clientes", icon: <BsFillPersonFill />, label: "Clientes" },
      { href: "/colaboradores", icon: <BsFilePerson />, label: "Colaboradores" },
      { href: "/servicos", icon: <BsScissors />, label: "Serviços" },
      { href: "/unidades", icon: <BsBuilding />, label: "Unidades" },
      { href: "/produtos", icon: <BsBoxSeam />, label: "Produtos" },
      { href: "/noticias", icon: <BsNewspaper />, label: "Notícias" },
      { href: "/formaPagamento", icon: <FaCreditCard />, label: "Forma de Pagamento" },
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
          className="py-3 px-5 focus:outline-none hover:bg-gray-700 rounded-lg mt-2 mb-1 text-2xl"
        >
          {isOpen ? <BsX /> : <BsList /> }
        </button>

        {/* Navegação */}
        <nav className="flex flex-col flex-grow overflow-hidden">
          <ul className="overflow-y-auto h-[calc(100vh-8rem)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {menuItems.map((item, index) => (
              <Link href={item.href} key={item.href}>
                <li
                  className={`flex items-center py-2 mb-1 px-6 font-medium text-lg rounded-lg transition-all duration-300
                  ${highlightIndex === index ? "bg-[#D2A348] text-white" : "hover:bg-gray-700"}
                  ${!isOpen ? "justify-center" : ""}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span
                    className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${
                      isOpen
                        ? "opacity-100 max-w-full ml-2"
                        : "opacity-0 max-w-0"
                    }`}
                    style={{
                      transitionProperty: isOpen
                        ? "opacity, max-width"
                        : "none",
                      transitionDelay: isOpen ? `${index * 0.12}s` : "0s",
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
              className={`flex items-center py-2 mb-1 px-6 font-medium text-lg rounded-lg transition-all duration-300 hover:bg-gray-700 cursor-pointer
              ${!isOpen ? "justify-center" : ""}`}
            >
              <span className="text-lg"><BsBoxArrowInLeft /></span>
              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${
                  isOpen ? "opacity-100 max-w-full ml-2" : "opacity-0 max-w-0"
                }`}
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

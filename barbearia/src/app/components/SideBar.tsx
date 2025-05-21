'use client';

import ProtectedRoute from "../components/ProtectedRoute";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";  // Importa o roteador para redirecionamento
import { signOut } from "firebase/auth";  // Importa a função de logout do Firebase
import { auth } from "../../lib/firebaseConfig";  // Importa a configuração do Firebase
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BsFillGridFill, BsCalendarCheck, BsFillPersonFill, BsFilePerson,
  BsScissors, BsBoxSeam, BsCashCoin, BsBoxArrowInLeft, BsList
} from "react-icons/bs";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();  // Instancia o roteador para redirecionar após o logout

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
      await signOut(auth);  // Realiza o logout
      router.push("/login");  // Redireciona para a página de login
    } catch (error) {
      console.error("Erro ao deslogar: ", error);
    }
  };

  return (
    <ProtectedRoute>
    <aside
      className={`bg-[rgba(19,19,16,255)] text-white h-full transition-all duration-300 shadow-md ${isOpen ? "w-64" : "w-16"
        } flex flex-col`}
    >
      {/* Botão para abrir/fechar o sidebar */}
      <button
        onClick={toggleSidebar}
        className="py-3 px-5 focus:outline-none hover:bg-gray-700 rounded-lg mt-2 mb-1 text-2xl"
      >
        {isOpen ? <BsList /> : <BsList />}
      </button>

      {/* Navegação */}
      <nav className="flex flex-col flex-grow">
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
                className={`flex items-center py-2 mb-1 px-6 font-medium text-lg rounded-lg transition-all duration-300 ${pathname === item.href
                  ? "bg-gray-700 text-white"
                  : "hover:bg-gray-700"
                  }`}
              >
                {item.icon}
                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${isOpen
                    ? "opacity-100 max-w-full ml-2"
                    : "opacity-0 max-w-0"
                    }`}
                  style={{
                    transitionProperty: isOpen ? "opacity, max-width" : "none",
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
            onClick={handleLogout}  // Chama a função de logout ao clicar
            className={`flex items-center py-2 mb-1 px-6 font-medium text-lg rounded-lg transition-all duration-300 hover:bg-gray-700  cursor-pointer`}
          >
            <BsBoxArrowInLeft />
            <span
              className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${isOpen
                ? "opacity-100 max-w-full ml-2"
                : "opacity-0 max-w-0"
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

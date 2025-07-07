import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import { FaUserCircle } from "react-icons/fa";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function Header() {
  const { userInfo } = useAuth(); // Obtém nome e foto do usuário autenticado
  const pathname = usePathname();

  return (
    <ProtectedRoute>
    <header className="flex justify-between items-center p-4 bg-[rgba(19,19,16,255)] shadow z-10">
      <div className="flex-1 font-semibold text-2xl text-white">
        <Link href="/">Gestão Barbearia</Link>
      </div>
      <Link href="/perfil">
        <div className="flex-1 flex justify-end items-center">
          {pathname === "/perfil" ? (
            <div className="flex items-center gap-2 bg-[#D2A348] rounded-full shadow min-h-[40px] px-3" style={{paddingTop:0, paddingBottom:0}}>
              {userInfo?.foto ? (
                <Image
                  src={userInfo.foto}
                  alt="Foto de perfil"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-gray-300 bg-white"
                  unoptimized
                />
              ) : (
                <FaUserCircle className="w-8 h-8 text-white bg-gray-400 rounded-full" />
              )}
              <span className="text-black font-semibold whitespace-nowrap">{userInfo?.nome || "Saindo..."}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-h-[40px] px-3" style={{paddingTop:0, paddingBottom:0}}>
              {userInfo?.foto ? (
                <Image
                  src={userInfo.foto}
                  alt="Foto de perfil"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-gray-300 bg-white"
                  unoptimized
                />
              ) : (
                <FaUserCircle className="w-8 h-8 text-white bg-gray-400 rounded-full" />
              )}
              <span className="text-white font-semibold whitespace-nowrap">{userInfo?.nome || "Saindo..."}</span>
            </div>
          )}
        </div>
      </Link>
    </header>
    </ProtectedRoute>
  );
}

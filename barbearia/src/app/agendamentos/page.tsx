"use client";
import ProtectedRoute from "../components/ProtectedRoute";
import Calendario from "../components/Calendario";
import { useState } from "react";

export default function AgendamentosPage() {
  // Estado para controlar abertura do modal (será usado depois)
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  return (
    <ProtectedRoute>
      <div className="text-black p-4">
        <h1 className="text-2xl font-bold mb-4">Agendamentos</h1>
        <div className="flex justify-end mb-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200 shadow"
            onClick={() => setModalNovoAberto(true)}
          >
            Novo Agendamento
          </button>
        </div>
        <Calendario modalNovoAberto={modalNovoAberto} setModalNovoAberto={setModalNovoAberto} />
      </div>
    </ProtectedRoute>
  );
}

import ProtectedRoute from "../components/ProtectedRoute";

export default function Perfil() {
  return (
    <ProtectedRoute>
      <div className="text-black">
        <h1 className="text-2xl font-bold mb-4">Perfil</h1>
        <p>Bem-vindo à página de perfil!</p>
        {/* Adicione os detalhes do perfil aqui */}
      </div>
    </ProtectedRoute>
  );
}

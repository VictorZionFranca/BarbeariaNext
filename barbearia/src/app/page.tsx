import ProtectedRoute from "./components/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="text-black ">
        <h1 className="text-2xl font-bold" >Bem-vindo ao Dashboard!</h1>
      </div>
    </ProtectedRoute>
  );
}

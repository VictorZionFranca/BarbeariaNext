import ProtectedRoute from "./components/ProtectedRoute";
import DashboardClientes from "./components/DashboardClientes";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="text-black ">
        <DashboardClientes />
      </div>
    </ProtectedRoute>
  );
}

import ProtectedRoute from "../components/ProtectedRoute";
import RedesSociaisManager from "../components/RedesSociaisManager";

export default function RedesSociaisPage() {
  return (
    <ProtectedRoute>
      <RedesSociaisManager />
    </ProtectedRoute>
  );
} 
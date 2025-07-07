// firestoreUtils.ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export async function fetchUserNameByUid(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
    const userDoc = await getDoc(doc(db, "admin", uid));
    if (userDoc.exists()) {
      return userDoc.data()?.nome || null;
    } else {
      console.warn(`Documento não encontrado para o uid: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar nome do usuário:", error);
    return null;
  }
}

export async function salvarLayoutDashboard(uid: string, layout: string[]): Promise<void> {
  if (!uid) return;
  try {
    const ref = doc(db, "admin", uid);
    await setDoc(ref, { layoutDashboard: layout }, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar layout do dashboard:", error);
  }
}

export async function buscarLayoutDashboard(uid: string): Promise<string[] | null> {
  if (!uid) return null;
  try {
    const ref = doc(db, "admin", uid);
    const snap = await getDoc(ref);
    if (snap.exists() && Array.isArray(snap.data()?.layoutDashboard)) {
      return snap.data()?.layoutDashboard;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar layout do dashboard:", error);
    return null;
  }
}

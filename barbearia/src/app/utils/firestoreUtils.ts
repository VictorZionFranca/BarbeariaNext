// firestoreUtils.ts
import { doc, getDoc } from "firebase/firestore";
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

// firestoreUtils.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export async function fetchUserNameByUid(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
    const userDoc = await getDoc(doc(db, "admin", uid)); // Agora busca pelo uid
    if (userDoc.exists()) {
      return userDoc.data()?.nome || null; // Retorna o campo 'nome'
    } else {
      console.error(`Documento não encontrado para o uid: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar nome do usuário:", error);
    return null;
  }
}

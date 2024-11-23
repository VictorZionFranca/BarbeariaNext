// Função no arquivo firestoreUtils.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export async function fetchUserNameByEmail(email: string): Promise<string | null> {
  if (!email) return null;

  try {
    const userDoc = await getDoc(doc(db, "admin", email)); // Busca o documento pelo email
    if (userDoc.exists()) {
      return userDoc.data()?.nome || null; // Retorna o campo 'name'
    } else {
      console.error(`Documento não encontrado para o email: ${email}`);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar nome do usuário:", error);
    return null;
  }
}

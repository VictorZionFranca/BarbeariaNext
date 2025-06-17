import {
  collection,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  query,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export type FormaPagamento = {
  id: string;
  nome: string;
  ativo: boolean;
  dataCriacao: Timestamp | null;
  dataAtualizacao: Timestamp | null;
};

const formasPagamentoCollection = collection(db, "formaPagamento");

// Criar nova forma de pagamento
export async function criarFormaPagamento(
  formaPagamento: Omit<FormaPagamento, "id" | "dataCriacao" | "dataAtualizacao">
) {
  const snapshot = await getDocs(formasPagamentoCollection);

  let maior = 0;
  snapshot.forEach((docSnap) => {
    const match = docSnap.id.match(/^formaPagamento(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maior) maior = num;
    }
  });

  const novoId = `formaPagamento${maior + 1}`;

  await setDoc(doc(formasPagamentoCollection, novoId), {
    ...formaPagamento,
    dataCriacao: serverTimestamp(),
    dataAtualizacao: serverTimestamp(),
  });

  return novoId;
}

// Listar todas as formas de pagamento
export async function listarFormasPagamento(): Promise<FormaPagamento[]> {
  try {
    const q = query(formasPagamentoCollection);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FormaPagamento[];
  } catch (error) {
    console.error("Erro ao listar formas de pagamento:", error);
    throw error;
  }
}

// Buscar forma de pagamento por ID
export async function buscarFormaPagamentoPorId(id: string) {
  const docRef = doc(formasPagamentoCollection, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return { id: docSnap.id, ...docSnap.data() } as FormaPagamento;
}

// Atualizar forma de pagamento
export async function atualizarFormaPagamento(
  id: string,
  dados: Partial<FormaPagamento>
): Promise<void> {
  try {
    const formaPagamentoRef = doc(formasPagamentoCollection, id);
    const formaPagamentoDoc = await getDoc(formaPagamentoRef);

    if (!formaPagamentoDoc.exists()) {
      throw new Error("Forma de pagamento não encontrada");
    }

    await updateDoc(formaPagamentoRef, {
      ...dados,
      dataAtualizacao: Timestamp.now(),
    });
  } catch (error) {
    console.error("Erro ao atualizar forma de pagamento:", error);
    throw error;
  }
}

// Deletar forma de pagamento
export async function deletarFormaPagamento(id: string) {
  const formaPagamentoRef = doc(formasPagamentoCollection, id);
  await deleteDoc(formaPagamentoRef);
} 
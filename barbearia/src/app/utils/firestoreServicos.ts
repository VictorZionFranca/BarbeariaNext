import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy,  Timestamp, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

import { CollectionReference, DocumentData } from "firebase/firestore";

const servicosCollection: CollectionReference<DocumentData> = collection(db, "servicos");

export async function listarServicos() {
  const q = query(servicosCollection, orderBy("nomeDoServico"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export type Servico = {
  nomeDoServico: string;
  valor: number;
  duracaoEmMinutos: number;
  criadoEm?: Timestamp;
};

export async function atualizarServico(id: string, servico: Servico) {
  return await updateDoc(doc(db, "servicos", id), servico);
}

export async function deletarServico(id: string) {
  return await deleteDoc(doc(db, "servicos", id));
}

export async function criarServicoComIdIncremental(servico: Servico) {
  // Busca todos os documentos para encontrar o maior número
  const snapshot = await getDocs(servicosCollection);
  let maior = 0;
  snapshot.forEach(doc => {
    const match = doc.id.match(/^servico(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maior) maior = num;
    }
  });
  const novoId = `servico${maior + 1}`;
  await setDoc(doc(servicosCollection, novoId), servico);
  return novoId;
}
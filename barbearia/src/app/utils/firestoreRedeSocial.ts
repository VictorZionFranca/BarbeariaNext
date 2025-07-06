import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { CollectionReference, DocumentData } from "firebase/firestore";

const redeSocialCollection: CollectionReference<DocumentData> = collection(db, "redeSocial");

export type RedeSocial = {
  nome: string;
  link?: string;
  numero?: string;
  criadoEm?: Timestamp;
  dataInativacao?: Timestamp;
  ativo: boolean;
};

export interface RedeSocialPredefinida {
  nome: string;
  tipo: "link" | "contato";
  icone: string;
}

// Lista pré-definida de redes sociais com seus tipos
export const REDES_SOCIAIS_PREDEFINIDAS: RedeSocialPredefinida[] = [
  { nome: "WhatsApp", tipo: "contato", icone: "whatsapp" },
  { nome: "Telegram", tipo: "contato", icone: "telegram" },
  { nome: "Instagram", tipo: "link", icone: "instagram" },
  { nome: "Facebook", tipo: "link", icone: "facebook" },
  { nome: "TikTok", tipo: "link", icone: "tiktok" },
  { nome: "LinkedIn", tipo: "link", icone: "linkedin" },
  { nome: "X (Twitter)", tipo: "link", icone: "twitter" },
  { nome: "YouTube", tipo: "link", icone: "youtube" },
  { nome: "Site", tipo: "link", icone: "globe" },
  { nome: "Email", tipo: "contato", icone: "email" },
];

export async function listarRedesSociais() {
  const q = query(redeSocialCollection, orderBy("nome"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    ativo: doc.data().ativo ?? true
  }));
}

export async function atualizarRedeSocial(id: string, redeSocial: RedeSocial) {
  return await updateDoc(doc(db, "redeSocial", id), {
    ...redeSocial,
    dataAtualizacao: Timestamp.now()
  });
}

export async function deletarRedeSocial(id: string) {
  return await deleteDoc(doc(db, "redeSocial", id));
}

export async function criarRedeSocialComIdIncremental(redeSocial: RedeSocial) {
  // Busca todos os documentos para encontrar o maior número
  const snapshot = await getDocs(redeSocialCollection);
  let maior = 0;
  snapshot.forEach(doc => {
    const match = doc.id.match(/^redeSocial(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maior) maior = num;
    }
  });
  const novoId = `redeSocial${maior + 1}`;
  await setDoc(doc(redeSocialCollection, novoId), {
    ...redeSocial,
    criadoEm: Timestamp.now(),
    ativo: true
  });
  return novoId;
}

export async function inativarRedeSocial(id: string) {
  return await updateDoc(doc(db, "redeSocial", id), {
    ativo: false,
    dataInativacao: Timestamp.now()
  });
}

export async function reativarRedeSocial(id: string) {
  return await updateDoc(doc(db, "redeSocial", id), {
    ativo: true,
    dataInativacao: null
  });
} 
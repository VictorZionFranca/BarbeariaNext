import {
  collection,
  getDocs,
  setDoc,
  doc,
  Timestamp,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export type RedeSocialNome =
  | "WhatsApp"
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "Site"
  | "X"
  | "Telegram";

export interface RedeSocial {
  id: string;
  nome: RedeSocialNome;
  link?: string;
  numero?: string;
  criadoEm: Timestamp;
  dataInativacao?: Timestamp | null;
}

const redeSocialCollection = collection(db, "redeSocial");

export async function listarRedesSociais(): Promise<RedeSocial[]> {
  const q = query(redeSocialCollection);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RedeSocial[];
}

export async function criarRedeSocial(data: Omit<RedeSocial, "id" | "criadoEm" | "dataInativacao">) {
  const docRef = doc(redeSocialCollection);
  await setDoc(docRef, {
    ...data,
    criadoEm: Timestamp.now(),
    dataInativacao: null,
  });
}

export async function atualizarRedeSocial(id: string, data: Partial<RedeSocial>) {
  const docRef = doc(redeSocialCollection, id);
  await updateDoc(docRef, data);
}

export async function inativarRedeSocial(id: string) {
  const docRef = doc(redeSocialCollection, id);
  await updateDoc(docRef, { dataInativacao: Timestamp.now() });
}

export async function excluirRedeSocial(id: string) {
  const docRef = doc(redeSocialCollection, id);
  await deleteDoc(docRef);
}
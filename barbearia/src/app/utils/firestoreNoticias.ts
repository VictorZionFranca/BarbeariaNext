import { collection, getDocs, setDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export type Noticia = {
    id: string;
    titulo: string;
    conteudo: string;
    autor: string | null;
    imagemURL: string;
    ativo: boolean;
    dataPublicacao: Timestamp | null;
};

const noticiasCollection = collection(db, "noticias");

export async function criarNoticiaComIdIncremental(noticia: Omit<Noticia, "id" | "dataPublicacao">) {
    

    const snapshot = await getDocs(noticiasCollection);

    let maior = 0;
    snapshot.forEach((docSnap) => {
        const match = docSnap.id.match(/^noticia(\d+)$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maior) maior = num;
        }
    });

    const novoId = `noticia${maior + 1}`;

    await setDoc(doc(noticiasCollection, novoId), {
        ...noticia,
        dataPublicacao: serverTimestamp(),
    });

    return novoId;
}

export async function listarNoticias(): Promise<Noticia[]> {
  const snapshot = await getDocs(noticiasCollection);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      titulo: data.titulo,
      conteudo: data.conteudo,
      autor: data.autor ?? null,
      imagemURL: data.imagemURL ?? "",
      ativo: data.ativo ?? false,
      dataPublicacao: data.dataPublicacao ?? null,
    } as Noticia;
  });
}
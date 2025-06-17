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

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  quantidade: number;
  imagemURL: string;
  ativo: boolean;
  dataCriacao: Timestamp | null;
  dataAtualizacao: Timestamp | null;
};

const produtosCollection = collection(db, "produtos");

// Criar novo produto
export async function criarProdutoComIdIncremental(
  produto: Omit<Produto, "id" | "dataCriacao" | "dataAtualizacao">
) {
  const snapshot = await getDocs(produtosCollection);

  let maior = 0;
  snapshot.forEach((docSnap) => {
    const match = docSnap.id.match(/^produto(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maior) maior = num;
    }
  });

  const novoId = `produto${maior + 1}`;

  await setDoc(doc(produtosCollection, novoId), {
    ...produto,
    dataCriacao: serverTimestamp(),
    dataAtualizacao: serverTimestamp(),
  });

  return novoId;
}

// Listar todos os produtos ativos
export async function listarProdutos(): Promise<Produto[]> {
  try {
    const q = query(produtosCollection);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Produto[];
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    throw error;
  }
}

// Buscar produto por ID
export async function buscarProdutoPorId(id: string) {
  const docRef = doc(produtosCollection, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return { id: docSnap.id, ...docSnap.data() } as Produto;
}

// Atualizar produto
export async function atualizarProduto(
  id: string,
  dados: Partial<Produto>
): Promise<void> {
  try {
    const produtoRef = doc(produtosCollection, id);
    const produtoDoc = await getDoc(produtoRef);

    if (!produtoDoc.exists()) {
      throw new Error("Produto não encontrado");
    }

    await updateDoc(produtoRef, {
      ...dados,
      dataAtualizacao: Timestamp.now(),
    });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    throw error;
  }
}

// Deletar produto (soft delete)
export async function deletarProduto(id: string) {
  const produtoRef = doc(produtosCollection, id);
  await deleteDoc(produtoRef);
}

// Atualizar quantidade do produto
export async function atualizarQuantidadeProduto(
  id: string,
  novaQuantidade: number
): Promise<void> {
  try {
    const produtoRef = doc(produtosCollection, id);
    const produtoDoc = await getDoc(produtoRef);

    if (!produtoDoc.exists()) {
      throw new Error("Produto não encontrado");
    }

    await updateDoc(produtoRef, {
      quantidade: novaQuantidade,
      dataAtualizacao: Timestamp.now(),
    });
  } catch (error) {
    console.error("Erro ao atualizar quantidade do produto:", error);
    throw error;
  }
}

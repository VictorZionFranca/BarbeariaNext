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
  orderBy,
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

export type VendaProduto = {
  id: string;
  produtoId: string;
  nomeProduto: string;
  quantidadeVendida: number;
  precoUnitario: number;
  totalVenda: number;
  dataVenda: Timestamp;
};

const produtosCollection = collection(db, "produtos");
const vendasProdutosCollection = collection(db, "vendasProdutos");

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

// Criar nova venda de produto
export async function criarVendaProduto(
  venda: Omit<VendaProduto, "id" | "dataVenda">
): Promise<string> {
  try {
    // Verificar se o produto existe e tem estoque suficiente
    const produto = await buscarProdutoPorId(venda.produtoId);
    if (!produto) {
      throw new Error("Produto não encontrado");
    }
    
    if (!produto.ativo) {
      throw new Error("Produto inativo não pode ser vendido");
    }
    
    if (produto.quantidade < venda.quantidadeVendida) {
      throw new Error("Quantidade insuficiente em estoque");
    }
    
    // Criar documento da venda
    const vendaRef = doc(vendasProdutosCollection);
    const vendaData = {
      ...venda,
      dataVenda: serverTimestamp(),
    };
    
    await setDoc(vendaRef, vendaData);
    
    // Atualizar quantidade do produto
    const novaQuantidade = produto.quantidade - venda.quantidadeVendida;
    await atualizarQuantidadeProduto(venda.produtoId, novaQuantidade);
    
    return vendaRef.id;
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    throw error;
  }
}

// Listar todas as vendas
export async function listarVendasProdutos(): Promise<VendaProduto[]> {
  try {
    const q = query(vendasProdutosCollection, orderBy("dataVenda", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as VendaProduto[];
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    throw error;
  }
}

// Buscar vendas por produto
export async function buscarVendasPorProduto(produtoId: string): Promise<VendaProduto[]> {
  try {
    const q = query(
      vendasProdutosCollection,
      orderBy("dataVenda", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as VendaProduto))
      .filter((venda) => venda.produtoId === produtoId);
  } catch (error) {
    console.error("Erro ao buscar vendas por produto:", error);
    throw error;
  }
}

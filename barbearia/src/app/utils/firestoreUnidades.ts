import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export interface Unidade {
    id: string;
    nome: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    pais: string;
    telefone: string;
    cep?: string;
    ativo: boolean;
    dataCriacao: Timestamp | null;
    dataAtualizacao: Timestamp | null;
}

export async function criarUnidade(unidade: Omit<Unidade, "id" | "dataCriacao" | "dataAtualizacao">) {
    try {
        const unidadesRef = collection(db, "unidades");
        const unidadesSnapshot = await getDocs(unidadesRef);
        const unidades = unidadesSnapshot.docs.map(doc => doc.data());

        // Encontra o maior número usado nos IDs
        const maiorNumero = unidades.reduce((maior, unidade) => {
            const match = unidade.id?.match(/filial(\d+)/);
            if (match) {
                const numero = parseInt(match[1]);
                return numero > maior ? numero : maior;
            }
            return maior;
        }, 0);

        // Gera o novo ID
        const novoId = `filial${maiorNumero + 1}`;

        const unidadeCompleta = {
            ...unidade,
            id: novoId,
            dataCriacao: Timestamp.now(),
            dataAtualizacao: Timestamp.now(),
        };

        // Cria o documento com o ID sequencial
        const docRef = doc(db, "unidades", novoId);
        await setDoc(docRef, unidadeCompleta);
        return unidadeCompleta;
    } catch (error) {
        console.error("Erro ao criar unidade:", error);
        throw error;
    }
}

export async function listarUnidades(): Promise<Unidade[]> {
    try {
        const unidadesRef = collection(db, "unidades");
        const snapshot = await getDocs(unidadesRef);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Unidade[];
    } catch (error) {
        console.error("Erro ao listar unidades:", error);
        throw error;
    }
}

export async function buscarUnidadePorId(id: string): Promise<Unidade | null> {
    try {
        const unidadesRef = collection(db, "unidades");
        const q = query(unidadesRef, where("id", "==", id));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { ...doc.data(), id: doc.id } as Unidade;
    } catch (error) {
        console.error("Erro ao buscar unidade por ID:", error);
        throw error;
    }
}

export async function atualizarUnidade(id: string, unidade: Partial<Unidade>) {
    try {
        const unidadesRef = collection(db, "unidades");
        const q = query(unidadesRef, where("id", "==", id));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            throw new Error("Unidade não encontrada");
        }

        const docRef = doc(db, "unidades", snapshot.docs[0].id);
        await updateDoc(docRef, {
            ...unidade,
            dataAtualizacao: Timestamp.now(),
        });
    } catch (error) {
        console.error("Erro ao atualizar unidade:", error);
        throw error;
    }
}

export async function deletarUnidade(id: string) {
    try {
        const unidadesRef = collection(db, "unidades");
        const q = query(unidadesRef, where("id", "==", id));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            throw new Error("Unidade não encontrada");
        }

        const docRef = doc(db, "unidades", snapshot.docs[0].id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Erro ao deletar unidade:", error);
        throw error;
    }
}


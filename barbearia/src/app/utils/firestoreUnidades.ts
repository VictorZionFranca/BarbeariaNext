import { db } from '../../lib/firebaseConfig';
import { collection, updateDoc, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { Unidade } from '../../types/index';

const unidadesCollection = collection(db, 'unidades');

export const listarUnidades = async () => {
    const snapshot = await getDocs(unidadesCollection);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Unidade[];
};

export async function criarUnidade(unidade: Unidade) {
    // Busca todos os documentos para encontrar o maior número de filial
    const snapshot = await getDocs(unidadesCollection);
    let maior = 0;
    snapshot.forEach(doc => {
        const match = doc.id.match(/^filial(\d+)$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maior) maior = num;
        }
    });
    const novoId = `filial${maior + 1}`;
    // Remove o campo id antes de salvar
    const unidadeSemId = Object.fromEntries(
        Object.entries(unidade).filter(([key]) => key !== 'id')
    );
    await setDoc(doc(unidadesCollection, novoId), {
        ...unidadeSemId,
        criadoEm: serverTimestamp(),
    });
    return novoId;
}

export const atualizarUnidade = async (id: string, unidade: Unidade) => {
    const unidadeDoc = doc(db, 'unidades', id);
    await updateDoc(unidadeDoc, { ...unidade });
};

export const deletarUnidade = async (id: string) => {
    const unidadeDoc = doc(db, 'unidades', id);
    await deleteDoc(unidadeDoc);
};


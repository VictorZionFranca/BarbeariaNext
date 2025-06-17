import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, getDoc, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export interface Colaborador {
    id?: string;
    cpf: string;
    criadoEm: Timestamp;
    dataInativacao: Timestamp | null;
    dataNascimento: string;
    email: string;
    nomeCompleto: string;
    telefone: string;
    tipoPessoa: number;
}

// Função para verificar duplicatas
async function verificarDuplicatas(colaborador: Omit<Colaborador, "id" | "criadoEm" | "dataInativacao">) {
    const colaboradoresRef = collection(db, "pessoas");
    
    // Verificar email
    const qEmail = query(colaboradoresRef, where("dataInativacao", "==", null), where("email", "==", colaborador.email));
    const emailSnapshot = await getDocs(qEmail);
    if (!emailSnapshot.empty) {
        throw new Error("Email já cadastrado");
    }

    // Verificar telefone
    const qTelefone = query(colaboradoresRef, where("dataInativacao", "==", null), where("telefone", "==", colaborador.telefone));
    const telefoneSnapshot = await getDocs(qTelefone);
    if (!telefoneSnapshot.empty) {
        throw new Error("Telefone já cadastrado");
    }

    // Verificar CPF
    const qCPF = query(colaboradoresRef, where("dataInativacao", "==", null), where("cpf", "==", colaborador.cpf));
    const cpfSnapshot = await getDocs(qCPF);
    if (!cpfSnapshot.empty) {
        throw new Error("CPF já cadastrado");
    }
}

// Função auxiliar para obter o próximo ID sequencial
async function getNextSequentialId() {
    const colaboradoresRef = collection(db, "pessoas");
    const q = query(colaboradoresRef, orderBy("criadoEm", "desc"), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return 1; // Se não houver documentos, começa com 1
    }
    
    const lastDoc = snapshot.docs[0];
    const lastId = lastDoc.id;
    const lastNumber = parseInt(lastId.split('_')[1]);
    return lastNumber + 1;
}

// Listar todos os colaboradores
export async function listarColaboradores() {
    const colaboradoresRef = collection(db, "pessoas");
    const q = query(colaboradoresRef, where("dataInativacao", "==", null), where("tipoPessoa", "==", 2));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Colaborador[];
}

// Criar novo colaborador
export async function criarColaborador(colaborador: Omit<Colaborador, "id" | "criadoEm" | "dataInativacao">) {
    // Verificar duplicatas antes de criar
    await verificarDuplicatas(colaborador);

    const colaboradoresRef = collection(db, "pessoas");
    const novoColaborador = {
        ...colaborador,
        tipoPessoa: 2, // Definindo tipoPessoa como 2 para colaboradores
        criadoEm: Timestamp.now(),
        dataInativacao: null
    };
    
    // Obter o próximo ID sequencial
    const nextId = await getNextSequentialId();
    const docId = `pessoa${nextId}`;

    // Usar setDoc para definir o ID personalizado
    const docRef = doc(colaboradoresRef, docId);
    await setDoc(docRef, novoColaborador);
    return docRef;
}

// Atualizar colaborador
export async function atualizarColaborador(id: string, colaborador: Partial<Colaborador>) {
    // Se estiver atualizando email, telefone ou CPF, verificar duplicatas
    if (colaborador.email || colaborador.telefone || colaborador.cpf) {
        const colaboradorAtual = await buscarColaboradorPorId(id);
        if (!colaboradorAtual) {
            throw new Error("Colaborador não encontrado");
        }

        // Verificar email
        if (colaborador.email && colaborador.email !== colaboradorAtual.email) {
            const qEmail = query(
                collection(db, "pessoas"),
                where("dataInativacao", "==", null),
                where("email", "==", colaborador.email)
            );
            const emailSnapshot = await getDocs(qEmail);
            if (!emailSnapshot.empty) {
                throw new Error("Email já cadastrado");
            }
        }

        // Verificar telefone
        if (colaborador.telefone && colaborador.telefone !== colaboradorAtual.telefone) {
            const qTelefone = query(
                collection(db, "pessoas"),
                where("dataInativacao", "==", null),
                where("telefone", "==", colaborador.telefone)
            );
            const telefoneSnapshot = await getDocs(qTelefone);
            if (!telefoneSnapshot.empty) {
                throw new Error("Telefone já cadastrado");
            }
        }

        // Verificar CPF
        if (colaborador.cpf && colaborador.cpf !== colaboradorAtual.cpf) {
            const qCPF = query(
                collection(db, "pessoas"),
                where("dataInativacao", "==", null),
                where("cpf", "==", colaborador.cpf)
            );
            const cpfSnapshot = await getDocs(qCPF);
            if (!cpfSnapshot.empty) {
                throw new Error("CPF já cadastrado");
            }
        }
    }

    const colaboradorRef = doc(db, "pessoas", id);
    return await updateDoc(colaboradorRef, colaborador);
}

// Buscar colaborador por ID
export async function buscarColaboradorPorId(id: string) {
    const colaboradorRef = doc(db, "pessoas", id);
    const docSnap = await getDoc(colaboradorRef);
    if (!docSnap.exists()) {
        return null;
    }
    return { id: docSnap.id, ...docSnap.data() } as Colaborador;
}

// Deletar colaborador (soft delete)
export async function deletarColaborador(id: string) {
    const colaboradorRef = doc(db, "pessoas", id);
    return await updateDoc(colaboradorRef, {
        dataInativacao: Timestamp.now()
    });
}

// Buscar colaborador por CPF
export async function buscarColaboradorPorCPF(cpf: string) {
    const colaboradoresRef = collection(db, "pessoas");
    const q = query(colaboradoresRef, where("cpf", "==", cpf), where("tipoPessoa", "==", 2));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Colaborador[];
} 
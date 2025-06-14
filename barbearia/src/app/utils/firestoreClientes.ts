import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, getDoc, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export interface Cliente {
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
async function verificarDuplicatas(cliente: Omit<Cliente, "id" | "criadoEm" | "dataInativacao">) {
    const clientesRef = collection(db, "pessoas");
    
    // Verificar email
    const qEmail = query(clientesRef, where("dataInativacao", "==", null), where("email", "==", cliente.email));
    const emailSnapshot = await getDocs(qEmail);
    if (!emailSnapshot.empty) {
        throw new Error("Email já cadastrado");
    }

    // Verificar telefone
    const qTelefone = query(clientesRef, where("dataInativacao", "==", null), where("telefone", "==", cliente.telefone));
    const telefoneSnapshot = await getDocs(qTelefone);
    if (!telefoneSnapshot.empty) {
        throw new Error("Telefone já cadastrado");
    }

    // Verificar CPF
    const qCPF = query(clientesRef, where("dataInativacao", "==", null), where("cpf", "==", cliente.cpf));
    const cpfSnapshot = await getDocs(qCPF);
    if (!cpfSnapshot.empty) {
        throw new Error("CPF já cadastrado");
    }
}

// Listar todos os clientes
export async function listarClientes() {
    const clientesRef = collection(db, "pessoas");
    const q = query(clientesRef, where("dataInativacao", "==", null));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Cliente[];
}

// Função auxiliar para obter o próximo ID sequencial
async function getNextSequentialId() {
    const clientesRef = collection(db, "pessoas");
    const q = query(clientesRef, orderBy("criadoEm", "desc"), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return 1; // Se não houver documentos, começa com 1
    }
    
    const lastDoc = snapshot.docs[0];
    const lastId = lastDoc.id;
    const lastNumber = parseInt(lastId.split('_')[1]);
    return lastNumber + 1;
}

// Criar novo cliente
export async function criarCliente(cliente: Omit<Cliente, "id" | "criadoEm" | "dataInativacao">) {
    // Verificar duplicatas antes de criar
    await verificarDuplicatas(cliente);

    const clientesRef = collection(db, "pessoas");
    const novoCliente = {
        ...cliente,
        criadoEm: Timestamp.now(),
        dataInativacao: null
    };
    
    // Obter o próximo ID sequencial
    const nextId = await getNextSequentialId();
    const docId = `pessoa_${nextId}`;

    // Usar setDoc para definir o ID personalizado
    const docRef = doc(clientesRef, docId);
    await setDoc(docRef, novoCliente);
    return docRef;
}

// Atualizar cliente
export async function atualizarCliente(id: string, cliente: Partial<Cliente>) {
    // Se estiver atualizando email, telefone ou CPF, verificar duplicatas
    if (cliente.email || cliente.telefone || cliente.cpf) {
        const clienteAtual = await buscarClientePorId(id);
        if (!clienteAtual) {
            throw new Error("Cliente não encontrado");
        }

        // Verificar email
        if (cliente.email && cliente.email !== clienteAtual.email) {
            const qEmail = query(
                collection(db, "pessoas"),
                where("dataInativacao", "==", null),
                where("email", "==", cliente.email)
            );
            const emailSnapshot = await getDocs(qEmail);
            if (!emailSnapshot.empty) {
                throw new Error("Email já cadastrado");
            }
        }

        // Verificar telefone
        if (cliente.telefone && cliente.telefone !== clienteAtual.telefone) {
            const qTelefone = query(
                collection(db, "pessoas"),
                where("dataInativacao", "==", null),
                where("telefone", "==", cliente.telefone)
            );
            const telefoneSnapshot = await getDocs(qTelefone);
            if (!telefoneSnapshot.empty) {
                throw new Error("Telefone já cadastrado");
            }
        }

        // Verificar CPF
        if (cliente.cpf && cliente.cpf !== clienteAtual.cpf) {
            const qCPF = query(
                collection(db, "pessoas"),
                where("dataInativacao", "==", null),
                where("cpf", "==", cliente.cpf)
            );
            const cpfSnapshot = await getDocs(qCPF);
            if (!cpfSnapshot.empty) {
                throw new Error("CPF já cadastrado");
            }
        }
    }

    const clienteRef = doc(db, "pessoas", id);
    return await updateDoc(clienteRef, cliente);
}

// Buscar cliente por ID
export async function buscarClientePorId(id: string) {
    const clienteRef = doc(db, "pessoas", id);
    const docSnap = await getDoc(clienteRef);
    if (!docSnap.exists()) {
        return null;
    }
    return { id: docSnap.id, ...docSnap.data() } as Cliente;
}

// Deletar cliente (soft delete)
export async function deletarCliente(id: string) {
    const clienteRef = doc(db, "pessoas", id);
    return await updateDoc(clienteRef, {
        dataInativacao: Timestamp.now()
    });
}

// Buscar cliente por CPF
export async function buscarClientePorCPF(cpf: string) {
    const clientesRef = collection(db, "pessoas");
    const q = query(clientesRef, where("cpf", "==", cpf));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Cliente[];
} 
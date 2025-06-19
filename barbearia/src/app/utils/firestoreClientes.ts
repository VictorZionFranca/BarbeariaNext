import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, getDoc, deleteDoc } from "firebase/firestore";
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
    senhaTemporaria?: string;
}

// Função para criar conta no Authentication via API
async function criarContaAuthViaAPI(email: string, senha: string, nomeCompleto: string) {
    try {
        const response = await fetch('/api/auth/create-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password: senha,
                displayName: nomeCompleto,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                console.log(`Email ${email} já possui conta Auth`);
                return;
            }
            throw new Error(data.error || 'Erro ao criar conta');
        }

        console.log(`Conta Auth criada para: ${email}`);
        
    } catch (error: unknown) {
        console.error(`Erro ao criar conta Auth para ${email}:`, error);
        // Não rejeitar a operação principal se falhar a criação da conta Auth
        // A conta pode ser criada posteriormente
    }
}

// Função para atualizar email no Authentication via API
async function atualizarEmailAuthViaAPI(uid: string, newEmail: string) {
    try {
        const response = await fetch('/api/auth/update-email', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uid,
                newEmail,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                throw new Error("Email já está em uso por outro usuário");
            }
            throw new Error(data.error || 'Erro ao atualizar email');
        }

        console.log(`Email Auth atualizado para: ${newEmail}`);
        
    } catch (error: unknown) {
        console.error(`Erro ao atualizar email Auth para ${newEmail}:`, error);
        throw error;
    }
}

// Função para verificar duplicatas
async function verificarDuplicatas(cliente: Omit<Cliente, "id" | "criadoEm" | "dataInativacao">) {
    const clientesRef = collection(db, "pessoas");
    
    // Verificar email no Firestore
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
    const q = query(clientesRef, where("dataInativacao", "==", null), where("tipoPessoa", "==", 1));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Cliente[];
}

// Criar novo cliente
export async function criarCliente(cliente: Omit<Cliente, "id" | "criadoEm" | "dataInativacao">) {
    // Verificar duplicatas antes de criar
    await verificarDuplicatas(cliente);

    // Gerar senha temporária mais segura
    const senhaTemporaria = gerarSenhaTemporaria();

    try {
        // Primeiro, salvar no Firestore
        const clientesRef = collection(db, "pessoas");
        const novoCliente = {
            ...cliente,
            tipoPessoa: 1,
            criadoEm: Timestamp.now(),
            dataInativacao: null,
            senhaTemporaria: senhaTemporaria
        };
        
        // Usar o email como ID do documento
        const docId = cliente.email;

        // Usar setDoc para definir o ID personalizado
        const docRef = doc(clientesRef, docId);
        await setDoc(docRef, novoCliente);
        
        // Criar conta no Authentication via API (não interfere com o estado do admin)
        await criarContaAuthViaAPI(cliente.email, senhaTemporaria, cliente.nomeCompleto);
        
        // TODO: Enviar email com credenciais de acesso
        console.log(`Cliente criado com sucesso! Email: ${cliente.email}, Senha temporária: ${senhaTemporaria}`);
        
        return docRef;
    } catch (error: unknown) {
        throw error;
    }
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

        // Se o email foi alterado, precisamos recriar o documento com o novo ID
        if (cliente.email && cliente.email !== clienteAtual.email) {
            try {
                // Buscar o UID do usuário no Authentication usando o email atual
                const response = await fetch(`/api/auth/get-user-by-email?email=${clienteAtual.email}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.uid) {
                        await atualizarEmailAuthViaAPI(data.uid, cliente.email);
                    }
                }

                // Recriar documento com novo ID (email)
                const clientesRef = collection(db, "pessoas");
                
                // Preparar dados atualizados
                const dadosAtualizados = {
                    ...clienteAtual,
                    ...cliente,
                };
                
                // Remover o campo id dos dados para não duplicar
                const { id, ...dadosSemId } = dadosAtualizados;
                
                // Criar novo documento com o novo email como ID
                const novoDocRef = doc(clientesRef, cliente.email);
                await setDoc(novoDocRef, dadosSemId);
                
                // Excluir completamente o documento antigo
                const docAntigoRef = doc(clientesRef, id);
                await deleteDoc(docAntigoRef);
                
                console.log(`Documento recriado com novo ID: ${cliente.email}`);
                return novoDocRef;
                
            } catch (error) {
                console.error('Erro ao recriar documento com novo email:', error);
                throw new Error('Erro ao atualizar email do cliente');
            }
        }
    }

    // Se não alterou o email, atualização normal
    const clienteRef = doc(db, "pessoas", id);
    return await updateDoc(clienteRef, cliente);
}

// Função para gerar senha temporária segura
function gerarSenhaTemporaria(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let senha = '';
    for (let i = 0; i < 8; i++) {
        senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return senha;
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
import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, getDoc } from "firebase/firestore";
import { fetchSignInMethodsForEmail, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from "../../lib/firebaseConfig";

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

// Função para verificar se email existe no Authentication
async function verificarEmailNoAuth(email: string): Promise<boolean> {
    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        return methods.length > 0;
    } catch {
        // Se houver erro, assumimos que o email não existe
        return false;
    }
}

// Função para criar conta no Authentication sem interferir com a sessão atual
async function criarContaAuthSemInterferencia(email: string, senha: string, nomeCompleto: string) {
    try {
        // Criar a conta no Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        
        // Atualizar o perfil da nova conta
        await updateProfile(userCredential.user, {
            displayName: nomeCompleto
        });
        
        console.log(`Conta Auth criada para: ${email}`);
        
        // Fazer logout imediatamente para não interferir com a sessão atual
        await auth.signOut();
        
    } catch (error: unknown) {
        console.error(`Erro ao criar conta Auth para ${email}:`, error);
        
        // Se o erro for de email já existente, não é um problema crítico
        if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
            console.log(`Email ${email} já possui conta Auth`);
            return;
        }
        
        throw error;
    }
}

// Função para verificar duplicatas
async function verificarDuplicatas(cliente: Omit<Cliente, "id" | "criadoEm" | "dataInativacao">) {
    const clientesRef = collection(db, "pessoas");
    
    // Verificar email no Authentication
    const emailExisteNoAuth = await verificarEmailNoAuth(cliente.email);
    if (emailExisteNoAuth) {
        throw new Error("Email já cadastrado");
    }
    
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
        
        // Criar conta no Authentication em background sem interferir
        // Usar uma Promise que resolve imediatamente mas executa em background
        Promise.resolve().then(async () => {
            try {
                // Aguardar um pouco mais para garantir que não há interferência
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verificar se ainda há um usuário logado (admin)
                if (auth.currentUser) {
                    console.log('Admin ainda logado, criando conta Auth em background...');
                    await criarContaAuthSemInterferencia(cliente.email, senhaTemporaria, cliente.nomeCompleto);
                } else {
                    console.log('Admin não está mais logado, pulando criação de conta Auth');
                }
            } catch (error) {
                console.warn(`Não foi possível criar conta Auth para ${cliente.email}:`, error);
            }
        }).catch(error => {
            console.error("Erro ao agendar criação de conta Auth:", error);
        });
        
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
            // Verificar no Authentication
            const emailExisteNoAuth = await verificarEmailNoAuth(cliente.email);
            if (emailExisteNoAuth) {
                throw new Error("Email já cadastrado");
            }

            // Verificar no Firestore
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
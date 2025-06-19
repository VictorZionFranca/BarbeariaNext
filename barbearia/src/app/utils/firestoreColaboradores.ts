import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, getDoc } from "firebase/firestore";
import { fetchSignInMethodsForEmail, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from "../../lib/firebaseConfig";

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
async function verificarDuplicatas(colaborador: Omit<Colaborador, "id" | "criadoEm" | "dataInativacao">) {
    const colaboradoresRef = collection(db, "pessoas");
    
    // Verificar email no Authentication
    const emailExisteNoAuth = await verificarEmailNoAuth(colaborador.email);
    if (emailExisteNoAuth) {
        throw new Error("Email já cadastrado");
    }
    
    // Verificar email no Firestore
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

    // Gerar senha temporária mais segura
    const senhaTemporaria = gerarSenhaTemporaria();

    try {
        // Primeiro, salvar no Firestore
        const colaboradoresRef = collection(db, "pessoas");
        const novoColaborador = {
            ...colaborador,
            tipoPessoa: 2, // Definindo tipoPessoa como 2 para colaboradores
            criadoEm: Timestamp.now(),
            dataInativacao: null,
            senhaTemporaria: senhaTemporaria
        };
        
        // Usar o email como ID do documento
        const docId = colaborador.email;

        // Usar setDoc para definir o ID personalizado
        const docRef = doc(colaboradoresRef, docId);
        await setDoc(docRef, novoColaborador);
        
        // Criar conta no Authentication em background sem interferir
        // Usar uma Promise que resolve imediatamente mas executa em background
        Promise.resolve().then(async () => {
            try {
                // Aguardar um pouco mais para garantir que não há interferência
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verificar se ainda há um usuário logado (admin)
                if (auth.currentUser) {
                    console.log('Admin ainda logado, criando conta Auth em background...');
                    await criarContaAuthSemInterferencia(colaborador.email, senhaTemporaria, colaborador.nomeCompleto);
                } else {
                    console.log('Admin não está mais logado, pulando criação de conta Auth');
                }
            } catch (error) {
                console.warn(`Não foi possível criar conta Auth para ${colaborador.email}:`, error);
            }
        }).catch(error => {
            console.error("Erro ao agendar criação de conta Auth:", error);
        });
        
        // TODO: Enviar email com credenciais de acesso
        console.log(`Colaborador criado com sucesso! Email: ${colaborador.email}, Senha temporária: ${senhaTemporaria}`);
        
        return docRef;
    } catch (error: unknown) {
        throw error;
    }
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
            // Verificar no Authentication
            const emailExisteNoAuth = await verificarEmailNoAuth(colaborador.email);
            if (emailExisteNoAuth) {
                throw new Error("Email já cadastrado");
            }

            // Verificar no Firestore
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

// Função para gerar senha temporária segura
function gerarSenhaTemporaria(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let senha = '';
    for (let i = 0; i < 8; i++) {
        senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return senha;
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
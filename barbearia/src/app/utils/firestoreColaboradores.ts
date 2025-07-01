import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, getDoc, DocumentReference } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { sincronizarDadosColaborador } from "./firestoreColaboradoresInformacoes";

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
    unidadeNome?: string;
}

// Função para criar conta no Authentication via API
async function criarContaAuthViaAPI(email: string, senha: string, nomeCompleto: string): Promise<string> {
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
                throw new Error('Email já possui conta Auth');
            }
            throw new Error(data.error || 'Erro ao criar conta');
        }

        if (!data.uid) {
            throw new Error('UID não retornado pela API');
        }

        console.log(`Conta Auth criada para: ${email}, UID: ${data.uid}`);
        return data.uid;
    } catch (error: unknown) {
        console.error(`Erro ao criar conta Auth para ${email}:`, error);
        throw error;
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
async function verificarDuplicatas(colaborador: Omit<Colaborador, "id" | "criadoEm" | "dataInativacao">) {
    const colaboradoresRef = collection(db, "pessoas");
    
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
export async function criarColaborador(colaborador: Omit<Colaborador, "id" | "criadoEm" | "dataInativacao">): Promise<{ uid: string, docRef: DocumentReference }> {
    // Verificar duplicatas antes de criar
    await verificarDuplicatas(colaborador);

    // Gerar senha temporária mais segura
    const senhaTemporaria = gerarSenhaTemporaria();

    try {
        // Criar conta no Authentication via API e obter UID
        const uid = await criarContaAuthViaAPI(colaborador.email, senhaTemporaria, colaborador.nomeCompleto);

        // Salvar no Firestore usando UID como ID
        const colaboradoresRef = collection(db, "pessoas");
        const novoColaborador = {
            ...colaborador,
            tipoPessoa: 2, // Definindo tipoPessoa como 2 para colaboradores
            criadoEm: Timestamp.now(),
            dataInativacao: null,
            senhaTemporaria: senhaTemporaria
        };

        const docRef = doc(colaboradoresRef, uid);
        await setDoc(docRef, novoColaborador);

        // TODO: Enviar email com credenciais de acesso
        console.log(`Colaborador criado com sucesso! UID: ${uid}, Email: ${colaborador.email}, Senha temporária: ${senhaTemporaria}`);

        return { uid, docRef };
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

        // Se o email foi alterado, precisamos atualizar o campo no Auth e no Firestore
        if (colaborador.email && colaborador.email !== colaboradorAtual.email) {
            try {
                // Buscar o UID do usuário no Authentication usando o email atual
                const response = await fetch(`/api/auth/get-user-by-email?email=${colaboradorAtual.email}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.uid) {
                        await atualizarEmailAuthViaAPI(data.uid, colaborador.email);
                        // Atualizar apenas o campo email no documento Firestore (id = UID)
                        const colaboradoresRef = collection(db, "pessoas");
                        const colaboradorRef = doc(colaboradoresRef, data.uid);
                        await updateDoc(colaboradorRef, { ...colaborador, email: colaborador.email });
                        // Sincronizar dados nas informações profissionais
                        try {
                            await sincronizarDadosColaborador(data.uid);
                        } catch (error) {
                            console.error("Erro ao sincronizar informações profissionais:", error);
                        }
                        return colaboradorRef;
                    }
                }
                throw new Error('UID não encontrado para o colaborador');
            } catch (error) {
                console.error('Erro ao atualizar email do colaborador:', error);
                throw new Error('Erro ao atualizar email do colaborador');
            }
        }
    }

    // Se não alterou o email, atualização normal
    const colaboradorRef = doc(db, "pessoas", id);
    await updateDoc(colaboradorRef, colaborador);
    
    // Sincronizar dados nas informações profissionais
    try {
        await sincronizarDadosColaborador(id);
    } catch (error) {
        console.error("Erro ao sincronizar informações profissionais:", error);
        // Não falhar a operação principal se a sincronização falhar
    }
    
    return colaboradorRef;
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

// Atualizar apenas a unidade de um colaborador
export async function atualizarUnidadeColaborador(pessoaId: string, unidadeNome: string): Promise<void> {
    try {
        const colaboradorRef = doc(db, "pessoas", pessoaId);
        await updateDoc(colaboradorRef, {
            unidadeNome: unidadeNome
        });
        console.log(`Unidade atualizada para: ${unidadeNome} no colaborador: ${pessoaId}`);
    } catch (error) {
        console.error("Erro ao atualizar unidade do colaborador:", error);
        throw error;
    }
} 
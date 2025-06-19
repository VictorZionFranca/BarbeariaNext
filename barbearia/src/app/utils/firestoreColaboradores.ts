import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, getDoc, deleteDoc } from "firebase/firestore";
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
        
        // Criar conta no Authentication via API (não interfere com o estado do admin)
        await criarContaAuthViaAPI(colaborador.email, senhaTemporaria, colaborador.nomeCompleto);
        
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

        // Se o email foi alterado, precisamos recriar o documento com o novo ID
        if (colaborador.email && colaborador.email !== colaboradorAtual.email) {
            try {
                // Buscar o UID do usuário no Authentication usando o email atual
                const response = await fetch(`/api/auth/get-user-by-email?email=${colaboradorAtual.email}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.uid) {
                        await atualizarEmailAuthViaAPI(data.uid, colaborador.email);
                    }
                }

                // Recriar documento com novo ID (email)
                const colaboradoresRef = collection(db, "pessoas");
                
                // Preparar dados atualizados
                const dadosAtualizados = {
                    ...colaboradorAtual,
                    ...colaborador,
                    id: colaborador.email // Novo ID será o novo email
                };
                
                // Remover o campo id dos dados para não duplicar
                delete dadosAtualizados.id;
                
                // Criar novo documento com o novo email como ID
                const novoDocRef = doc(colaboradoresRef, colaborador.email);
                await setDoc(novoDocRef, dadosAtualizados);
                
                // Excluir completamente o documento antigo
                const docAntigoRef = doc(colaboradoresRef, id);
                await deleteDoc(docAntigoRef);
                
                console.log(`Documento recriado com novo ID: ${colaborador.email}`);
                return novoDocRef;
                
            } catch (error) {
                console.error('Erro ao recriar documento com novo email:', error);
                throw new Error('Erro ao atualizar email do colaborador');
            }
        }
    }

    // Se não alterou o email, atualização normal
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
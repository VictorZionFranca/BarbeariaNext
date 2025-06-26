import { collection, getDocs, doc, updateDoc, Timestamp, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { buscarColaboradorPorId } from "./firestoreColaboradores";

export interface ColaboradorInformacoes {
    id?: string;
    pessoaId: string; // ID da pessoa na coleção pessoas
    nome: string; // Nome completo do colaborador
    email: string; // Email do colaborador
    unidadeNome: string; // Nome da unidade
    dataAdmissao: Date; // Data de admissão
    folgas: string[]; // Lista de dias da semana de folga
    periodoFeriasInicio?: Date; // Início do período de férias
    periodoFeriasFim?: Date; // Fim do período de férias
    criadoEm: Timestamp;
    atualizadoEm: Timestamp;
    historico?: {
        folgas: { dias: string[]; data: Date }[];
        ferias: { inicio: Date; fim: Date }[];
    };
}

// Função para buscar informações completas de um colaborador
async function buscarInformacoesCompletas(pessoaId: string): Promise<{ nome: string; email: string; unidadeNome: string }> {
    // Buscar dados da pessoa
    const colaborador = await buscarColaboradorPorId(pessoaId);
    if (!colaborador) {
        throw new Error("Colaborador não encontrado");
    }

    // Buscar informações profissionais para obter a unidade atual
    const infoProfissional = await buscarColaboradorInformacoes(pessoaId);
    const unidadeNome = infoProfissional?.unidadeNome || "Não definida";

    return {
        nome: colaborador.nomeCompleto,
        email: colaborador.email,
        unidadeNome: unidadeNome
    };
}

// Listar todas as informações profissionais dos colaboradores
export async function listarColaboradoresInformacoes(): Promise<ColaboradorInformacoes[]> {
    const colaboradoresInfoRef = collection(db, "colaboradoresInformacoes");
    const snapshot = await getDocs(colaboradoresInfoRef);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as ColaboradorInformacoes[];
}

// Buscar informações de um colaborador específico
export async function buscarColaboradorInformacoes(pessoaId: string): Promise<ColaboradorInformacoes | null> {
    try {
        // Como o documento é criado com o email como ID, buscar diretamente
        const docRef = doc(db, "colaboradoresInformacoes", pessoaId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return null;
        }
        
        return { id: docSnap.id, ...docSnap.data() } as ColaboradorInformacoes;
    } catch (error) {
        console.error("Erro ao buscar informações do colaborador:", error);
        return null;
    }
}

// Criar informações profissionais para um colaborador
export async function criarColaboradorInformacoes(
    pessoaId: string, 
    dataAdmissao: Date, 
    folgas: string[] = [],
    periodoFeriasInicio?: Date,
    periodoFeriasFim?: Date,
    unidadeNome?: string
): Promise<void> {
    try {
        // Buscar informações completas do colaborador
        const informacoes = await buscarInformacoesCompletas(pessoaId);
        
        const colaboradorInfo = {
            pessoaId,
            nome: informacoes.nome,
            email: informacoes.email,
            unidadeNome: unidadeNome || informacoes.unidadeNome,
            dataAdmissao,
            folgas,
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now()
        } as const;

        // Criar objeto final com campos opcionais
        const dadosFinais: Record<string, unknown> = { ...colaboradorInfo };
        
        // Adicionar campos opcionais apenas se não forem undefined
        if (periodoFeriasInicio) {
            dadosFinais.periodoFeriasInicio = periodoFeriasInicio;
        }
        if (periodoFeriasFim) {
            dadosFinais.periodoFeriasFim = periodoFeriasFim;
        }

        // Usar o pessoaId como ID do documento para facilitar a busca
        const docRef = doc(db, "colaboradoresInformacoes", pessoaId);
        await setDoc(docRef, dadosFinais);
        
        console.log(`Informações profissionais criadas para: ${informacoes.nome}`);
        
    } catch (error) {
        console.error("Erro ao criar informações profissionais:", error);
        throw error;
    }
}

// Função utilitária para converter valores em datas válidas
function safeToDate(val: unknown): Date | undefined {
    if (!val) return undefined;
    if (typeof val === 'object' && typeof (val as { toDate: () => Date }).toDate === 'function') return (val as { toDate: () => Date }).toDate();
    const d = new Date(val as string | number | Date);
    return isNaN(d.getTime()) ? undefined : d;
}

// Função utilitária para verificar se é Timestamp do Firestore
function isFirestoreTimestamp(obj: unknown): obj is { toDate: () => Date } {
    return !!obj && typeof obj === 'object' && typeof (obj as { toDate: () => Date }).toDate === 'function';
}

// Atualizar informações profissionais de um colaborador
export async function atualizarColaboradorInformacoes(
    pessoaId: string, 
    dados: Partial<Omit<ColaboradorInformacoes, "id" | "pessoaId" | "criadoEm">>
): Promise<void> {
    try {
        // Buscar informações atuais
        const docRef = doc(db, "colaboradoresInformacoes", pessoaId);
        const docSnap = await getDoc(docRef);
        let historico: {
            folgas: { dias: string[]; data: Date }[];
            ferias: { inicio: Date; fim: Date }[];
        } = { folgas: [], ferias: [] };
        if (docSnap.exists()) {
            const data = docSnap.data() as ColaboradorInformacoes;
            historico = (data.historico as {
                folgas: { dias: string[]; data: Date }[];
                ferias: { inicio: Date; fim: Date }[];
            }) || { folgas: [], ferias: [] };
            // Se as férias acabaram, mover para histórico
            const periodoFeriasInicio = safeToDate(data.periodoFeriasInicio);
            const periodoFeriasFim = safeToDate(data.periodoFeriasFim);
            if (periodoFeriasFim && periodoFeriasFim < new Date()) {
                if (periodoFeriasInicio && periodoFeriasFim) {
                    // Só adiciona ao histórico se ainda não estiver lá
                    const jaNoHistorico = historico.ferias.some(f => {
                        const inicioHist = isFirestoreTimestamp(f.inicio) ? f.inicio.toDate() : new Date(f.inicio);
                        const fimHist = isFirestoreTimestamp(f.fim) ? f.fim.toDate() : new Date(f.fim);
                        return (
                            inicioHist.getTime() === periodoFeriasInicio.getTime() &&
                            fimHist.getTime() === periodoFeriasFim.getTime()
                        );
                    });
                    if (!jaNoHistorico) {
                        historico.ferias.push({ inicio: periodoFeriasInicio, fim: periodoFeriasFim });
                    }
                }
                // Sempre remove os campos de férias após o término
                delete dados.periodoFeriasInicio;
                delete dados.periodoFeriasFim;
            }
            // Se existirem folgas e a data de admissão for antiga, mover para histórico (exemplo: se dataAdmissao for há mais de 1 ano)
            const dataAdmissao = safeToDate(data.dataAdmissao);
            if (data.folgas && data.folgas.length > 0 && dataAdmissao) {
                const umAnoAtras = new Date();
                umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
                if (dataAdmissao < umAnoAtras) {
                    historico.folgas.push({ dias: data.folgas, data: dataAdmissao });
                    dados.folgas = [];
                }
            }
        }
        // Se estiver atualizando dados que dependem de outras coleções, buscar novamente
        if (dados.nome || dados.email || dados.unidadeNome) {
            const informacoes = await buscarInformacoesCompletas(pessoaId);
            dados.nome = informacoes.nome;
            dados.email = informacoes.email;
            dados.unidadeNome = dados.unidadeNome || informacoes.unidadeNome;
        }
        // Definir tipo explícito para os campos possíveis
        type DadosAtualizados = {
            atualizadoEm: Timestamp;
            historico: {
                folgas: { dias: string[]; data: Date }[];
                ferias: { inicio: Date; fim: Date }[];
            };
            dataAdmissao?: Date;
            folgas?: string[];
            periodoFeriasInicio?: Date;
            periodoFeriasFim?: Date;
            unidadeNome?: string;
            nome?: string;
            email?: string;
        };
        const dadosAtualizados: DadosAtualizados = {
            atualizadoEm: Timestamp.now(),
            historico
        };
        const dataAdmissao = safeToDate(dados.dataAdmissao);
        if (dataAdmissao) dadosAtualizados.dataAdmissao = dataAdmissao;
        if (dados.folgas !== undefined) {
            dadosAtualizados.folgas = dados.folgas;
        }
        const periodoFeriasInicio = safeToDate(dados.periodoFeriasInicio);
        if (periodoFeriasInicio) dadosAtualizados.periodoFeriasInicio = periodoFeriasInicio;
        const periodoFeriasFim = safeToDate(dados.periodoFeriasFim);
        if (periodoFeriasFim) dadosAtualizados.periodoFeriasFim = periodoFeriasFim;
        if (dados.unidadeNome !== undefined) {
            dadosAtualizados.unidadeNome = dados.unidadeNome;
        }
        if (dados.nome !== undefined) {
            dadosAtualizados.nome = dados.nome;
        }
        if (dados.email !== undefined) {
            dadosAtualizados.email = dados.email;
        }
        await updateDoc(docRef, dadosAtualizados);
        // Se a unidade foi alterada, também atualizar na tabela pessoas
        if (dados.unidadeNome !== undefined) {
            try {
                const { atualizarUnidadeColaborador } = await import("./firestoreColaboradores");
                await atualizarUnidadeColaborador(pessoaId, dados.unidadeNome);
            } catch (error) {
                console.error("Erro ao atualizar unidade na tabela pessoas:", error);
            }
        }
        console.log(`Informações profissionais atualizadas para: ${pessoaId}`);
    } catch (error) {
        console.error("Erro ao atualizar informações profissionais:", error);
        throw error;
    }
}

// Deletar informações profissionais de um colaborador
export async function deletarColaboradorInformacoes(pessoaId: string): Promise<void> {
    try {
        const docRef = doc(db, "colaboradoresInformacoes", pessoaId);
        await deleteDoc(docRef);
        console.log(`Informações profissionais deletadas para: ${pessoaId}`);
    } catch (error) {
        console.error("Erro ao deletar informações profissionais:", error);
        throw error;
    }
}

// Função para sincronizar dados quando um colaborador é atualizado
export async function sincronizarDadosColaborador(pessoaId: string): Promise<void> {
    try {
        const colaboradorInfo = await buscarColaboradorInformacoes(pessoaId);
        if (colaboradorInfo) {
            // Atualizar apenas os dados que vêm de outras coleções
            const informacoes = await buscarInformacoesCompletas(pessoaId);
            await atualizarColaboradorInformacoes(pessoaId, {
                nome: informacoes.nome,
                email: informacoes.email,
                unidadeNome: informacoes.unidadeNome
            });
        }
    } catch (error) {
        console.error("Erro ao sincronizar dados do colaborador:", error);
        // Não rejeitar a operação principal se a sincronização falhar
    }
}

// Função para obter dias da semana disponíveis
export function getDiasSemana(): string[] {
    return [
        "Segunda-feira",
        "Terça-feira", 
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
        "Domingo"
    ];
} 
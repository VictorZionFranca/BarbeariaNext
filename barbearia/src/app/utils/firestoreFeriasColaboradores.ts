import { collection, getDocs, doc, setDoc, Timestamp, query, where } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { listarColaboradoresInformacoes } from "./firestoreColaboradoresInformacoes";

export interface FeriasColaborador {
  id?: string;
  colaboradorId: string;
  nomeColaborador: string;
  dataInicio: Date;
  dataFim: Date;
  criadoEm: Timestamp;
}

// Criar novo registro de férias
export async function criarFeriasColaborador({ colaboradorId, nomeColaborador, dataInicio, dataFim }: Omit<FeriasColaborador, "id" | "criadoEm">) {
  const feriasRef = collection(db, "feriasColaboradores");
  const docRef = doc(feriasRef);
  await setDoc(docRef, {
    colaboradorId,
    nomeColaborador,
    dataInicio,
    dataFim,
    criadoEm: Timestamp.now(),
  });
  return docRef.id;
}

// Listar todas as férias
export async function listarFeriasColaboradores(): Promise<FeriasColaborador[]> {
  const feriasRef = collection(db, "feriasColaboradores");
  const snapshot = await getDocs(feriasRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeriasColaborador[];
}

// Listar férias de um colaborador específico
export async function listarFeriasPorColaborador(colaboradorId: string): Promise<FeriasColaborador[]> {
  const feriasRef = collection(db, "feriasColaboradores");
  const q = query(feriasRef, where("colaboradorId", "==", colaboradorId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeriasColaborador[];
}

// Migrar férias do histórico de ColaboradorInformacoes para feriasColaboradores
export async function migrarFeriasHistoricoParaColecao() {
  const infos = await listarColaboradoresInformacoes();
  let count = 0;
  for (const info of infos) {
    if (info.historico && Array.isArray(info.historico.ferias)) {
      for (const ferias of info.historico.ferias) {
        // Verifica se já existe registro igual na coleção (opcional, para evitar duplicidade)
        await criarFeriasColaborador({
          colaboradorId: info.pessoaId,
          nomeColaborador: info.nome,
          dataInicio: new Date(ferias.inicio),
          dataFim: new Date(ferias.fim),
        });
        count++;
      }
    }
  }
  return count;
} 
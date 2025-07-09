// firestoreAgendamentos.ts
// Utilitário para manipulação da coleção 'agendamentos' no Firebase Firestore
// Esta coleção armazena todos os agendamentos realizados na barbearia.
//
// Estrutura do documento:
// {
//   id: string (gerado automaticamente pelo Firestore)
//   data: string (YYYY-MM-DD)
//   hora: string (HH:mm)
//   clienteId: string
//   clienteNome: string
//   colaboradorId: string
//   colaboradorNome: string
//   servicoId: string
//   servicoNome: string
//   status: string ("ativo", "cancelado", "finalizado")
//   observacoes?: string
//   criadoEm: Timestamp
// }

import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, Timestamp, query, where, getDoc, deleteField } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

export interface Agendamento {
  id?: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:mm
  clienteId: string;
  clienteNome: string;
  colaboradorId: string;
  colaboradorNome: string;
  servicoId: string;
  servicoNome: string;
  status: string; // "ativo", "cancelado", "finalizado"
  observacoes?: string;
  criadoEm: Timestamp;
}

// Listar todos os agendamentos (pode ser filtrado por data, colaborador, etc)
export async function listarAgendamentos(filtros?: {
  data?: string;
  colaboradorId?: string;
  clienteId?: string;
  status?: string;
}) {
  const agendamentosRef = collection(db, "agendamentos");
  let q = agendamentosRef;
  if (filtros) {
    const conds = [];
    if (filtros.data) conds.push(where("data", "==", filtros.data));
    if (filtros.colaboradorId) conds.push(where("colaboradorId", "==", filtros.colaboradorId));
    if (filtros.clienteId) conds.push(where("clienteId", "==", filtros.clienteId));
    if (filtros.status) conds.push(where("status", "==", filtros.status));
    if (conds.length > 0) {
      // @ts-expect-error Condições dinâmicas podem causar erro de tipos ao passar para query
      q = query(agendamentosRef, ...conds);
    }
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Agendamento[];
}

// Criar novo agendamento
export async function criarAgendamento(agendamento: Omit<Agendamento, "id" | "criadoEm">) {
  // Validar dados obrigatórios
  if (!agendamento.data || !agendamento.hora || !agendamento.colaboradorId || !agendamento.servicoId) {
    throw new Error("Dados obrigatórios não fornecidos para criar agendamento");
  }

  // Validar formato da data
  if (!agendamento.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error("Formato de data inválido. Use YYYY-MM-DD");
  }

  // Validar formato da hora
  if (!agendamento.hora.match(/^\d{2}:\d{2}$/)) {
    throw new Error("Formato de hora inválido. Use HH:mm");
  }

  // Verificar conflito de horário para o mesmo colaborador considerando duração dos serviços
  const agendamentosRef = collection(db, "agendamentos");
  const q = query(
    agendamentosRef,
    where("data", "==", agendamento.data),
    where("colaboradorId", "==", agendamento.colaboradorId),
    where("status", "==", "ativo")
  );
  const snapshot = await getDocs(q);
  
  // Calcular duração do novo agendamento
  // Por enquanto, vamos usar 30 min como padrão, mas idealmente deveria vir do serviço
  const duracaoNovo = 30; // Em minutos - TODO: buscar duração real do serviço
  
  const [horaNovo, minNovo] = agendamento.hora.split(":").map(Number);
  if (isNaN(horaNovo) || isNaN(minNovo) || horaNovo < 0 || horaNovo > 23 || minNovo < 0 || minNovo > 59) {
    throw new Error("Valores de hora/minuto inválidos");
  }
  
  const inicioNovo = horaNovo * 60 + minNovo;
  const fimNovo = inicioNovo + duracaoNovo;
  
  // Verificar conflitos com agendamentos existentes
  for (const doc of snapshot.docs) {
    const agExistente = doc.data() as Agendamento;
    
    // Validar hora do agendamento existente
    if (!agExistente.hora || !agExistente.hora.match(/^\d{2}:\d{2}$/)) {
      console.warn("Formato de hora inválido no agendamento existente:", agExistente.hora, "ID:", doc.id);
      continue;
    }
    
    const [horaExist, minExist] = agExistente.hora.split(":").map(Number);
    if (isNaN(horaExist) || isNaN(minExist)) {
      console.warn("Valores de hora/minuto inválidos no agendamento existente:", { horaExist, minExist }, "ID:", doc.id);
      continue;
    }
    
    const inicioExist = horaExist * 60 + minExist;
    const duracaoExist = 30; // Em minutos - TODO: buscar duração real do serviço
    const fimExist = inicioExist + duracaoExist;
    
    // Verificar sobreposição
    // Conflito ocorre quando:
    // - O início do novo agendamento está dentro do agendamento existente, OU
    // - O fim do novo agendamento está dentro do agendamento existente, OU
    // - O novo agendamento engloba completamente o agendamento existente
    if (inicioNovo < fimExist && fimNovo > inicioExist) {
      const detalhesConflito = {
        novo: {
          inicio: `${horaNovo.toString().padStart(2, '0')}:${minNovo.toString().padStart(2, '0')}`,
          fim: `${Math.floor(fimNovo / 60).toString().padStart(2, '0')}:${(fimNovo % 60).toString().padStart(2, '0')}`,
          servico: agendamento.servicoNome
        },
        existente: {
          inicio: agExistente.hora,
          fim: `${Math.floor(fimExist / 60).toString().padStart(2, '0')}:${(fimExist % 60).toString().padStart(2, '0')}`,
          servico: agExistente.servicoNome
        }
      };
      
      console.error("Conflito de horário detectado:", detalhesConflito);
      throw new Error(`Já existe um agendamento para este colaborador neste horário. Conflito: ${detalhesConflito.existente.servico} (${detalhesConflito.existente.inicio}-${detalhesConflito.existente.fim})`);
    }
  }
  
  const docRef = doc(collection(db, "agendamentos"));
  const novoAgendamento = {
    ...agendamento,
    status: "ativo",
    criadoEm: Timestamp.now(),
  };
  await setDoc(docRef, novoAgendamento);
  return docRef;
}

// Atualizar agendamento
export async function atualizarAgendamento(id: string, dados: Partial<Agendamento>) {
  const agendamentoRef = doc(db, "agendamentos", id);
  await updateDoc(agendamentoRef, dados);
  return agendamentoRef;
}

// Cancelar agendamento (soft delete)
export async function cancelarAgendamento(id: string) {
  const agendamentoRef = doc(db, "agendamentos", id);
  await updateDoc(agendamentoRef, { status: "cancelado", horaPendencia: deleteField() });
}

// Marcar agendamento como concluído
export async function marcarComoConcluido(id: string) {
  const agendamentoRef = doc(db, "agendamentos", id);
  await updateDoc(agendamentoRef, { status: "finalizado" });
}

// Buscar agendamento por ID
export async function buscarAgendamentoPorId(id: string) {
  const agendamentoRef = doc(db, "agendamentos", id);
  const docSnap = await getDoc(agendamentoRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Agendamento;
}

// Excluir agendamento (remoção definitiva)
export async function deletarAgendamento(id: string) {
  const agendamentoRef = doc(db, "agendamentos", id);
  await deleteDoc(agendamentoRef);
}

/**
 * Documentação:
 * - Esta coleção armazena todos os agendamentos realizados na barbearia.
 * - Cada agendamento referencia cliente, colaborador e serviço por ID e nome.
 * - O campo status permite manter histórico de agendamentos cancelados/finalizados.
 * - Antes de criar um novo agendamento, é feita uma verificação para evitar conflitos de horário para o mesmo colaborador.
 * - Utilize as funções acima para listar, criar, atualizar, cancelar e excluir agendamentos.
 */ 
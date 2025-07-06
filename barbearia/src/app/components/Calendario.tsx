"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useState, useCallback, useEffect, useRef } from "react";
import { EventInput } from "@fullcalendar/core";
import { listarAgendamentos, criarAgendamento, atualizarAgendamento, cancelarAgendamento, marcarComoConcluido, Agendamento } from "../utils/firestoreAgendamentos";
import { listarClientes, Cliente } from "../utils/firestoreClientes";
import { listarColaboradores, Colaborador } from "../utils/firestoreColaboradores";
import { listarServicos, Servico } from "../utils/firestoreServicos";
import { createPortal } from "react-dom";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";
import ClienteSearch from "./ClienteSearch";
import { listarColaboradoresInformacoes, ColaboradorInformacoes } from "../utils/firestoreColaboradoresInformacoes";

// Tipos mínimos para handlers do FullCalendar
interface DateClickInfo {
  date: Date;
  dateStr: string;
}
interface EventClickInfo {
  event: { extendedProps: unknown };
}

// Adicionar tipos para props de controle do modal externo
interface CalendarioProps {
  modalNovoAberto?: boolean;
  setModalNovoAberto?: (open: boolean) => void;
}

// Função utilitária para formatar data para YYYY-MM-DD
function formatarDataInput(data: string | undefined): string {
  if (!data) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  // Tenta converter de outros formatos
  const d = new Date(data);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return "";
}



// Função utilitária para garantir formato YYYY-MM-DD local
function getHojeISO() {
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const tzOffset = hoje.getTimezoneOffset() * 60000;
  return new Date(hoje.getTime() - tzOffset).toISOString().slice(0, 10);
}

// Função para obter o nome do dia da semana no padrão dos horários da unidade
function getDiaSemanaFirestore(date: string) {
  const dias = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"];
  // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
  let dataLimpa = date;
  if (date.includes('T')) {
    dataLimpa = date.split('T')[0];
  }
  const [ano, mes, dia] = dataLimpa.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa 0-11 para meses
  return dias[d.getDay()];
}

export default function Calendario({ modalNovoAberto, setModalNovoAberto }: CalendarioProps) {
  const [eventos, setEventos] = useState<EventInput[]>([]);
  const [altura, setAltura] = useState<string>("700px");
  const [modalAberto, setModalAberto] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [form, setForm] = useState<Partial<Agendamento>>({});
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [servicos, setServicos] = useState<(Servico & { id: string })[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const calendarRef = useRef<InstanceType<typeof FullCalendar> | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("");
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [modalFechado, setModalFechado] = useState<{ aberto: boolean; dia: string }>({ aberto: false, dia: "" });
  const [colaboradoresInfo, setColaboradoresInfo] = useState<ColaboradorInformacoes[]>([]);

  // Se receber controle externo, usa ele; senão, usa estado interno
  const modalNovoOpen = typeof modalNovoAberto === 'boolean' ? modalNovoAberto : modalAberto;
  const setModalNovoOpen = setModalNovoAberto || setModalAberto;

  // Buscar listas para selects
  useEffect(() => {
    listarClientes().then(setClientes);
    listarColaboradores().then(setColaboradores);
    listarServicos().then((servs) => setServicos(servs as (Servico & { id: string })[]));
    listarColaboradoresInformacoes().then(setColaboradoresInfo);
    setLoadingUnidades(true);
    listarUnidades().then((lista) => {
      setUnidades(lista.filter(u => u.ativo));
      setLoadingUnidades(false);
    });
  }, []);

  // Buscar agendamentos do Firestore
  const buscarAgendamentos = useCallback(async () => {
    const lista = await listarAgendamentos();
    setEventos(
      lista.map((ag) => {
        // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
        let dataFormatada = ag.data;
        if (ag.data.includes('T')) {
          dataFormatada = ag.data.split('T')[0];
        }
        
        return {
          id: ag.id,
          title: `${ag.servicoNome} - ${ag.clienteNome}`,
          start: `${dataFormatada}T${ag.hora}`,
          extendedProps: ag,
          backgroundColor: ag.status === 'cancelado' ? '#ef4444' : 
                          ag.status === 'finalizado' ? '#10b981' : '#3b82f6',
          borderColor: ag.status === 'cancelado' ? '#dc2626' : 
                      ag.status === 'finalizado' ? '#059669' : '#2563eb',
        };
      })
    );
  }, []);

  useEffect(() => {
    buscarAgendamentos();
  }, [buscarAgendamentos]);

  const aoMudarView = useCallback((arg: { view: { type: string } }) => {
    if (arg.view.type === "dayGridMonth") {
      setAltura("900px");
    } else {
      setAltura("700px");
    }
  }, []);

  // Filtrar barbeiros ativos da unidade selecionada (excluindo os de férias)
  const barbeirosUnidade = colaboradores.filter(c => 
    c.unidadeNome === unidades.find(u => u.id === unidadeSelecionada)?.nome && 
    c.dataInativacao === null &&
    !colaboradorEstaDeFerias(c.id!)
  );

  // Filtrar serviços ativos
  const servicosAtivos = servicos.filter(s => s.ativo);

  // Função para gerar horários disponíveis (considerando agenda do barbeiro e horários da unidade)
  const gerarHorariosDisponiveis = useCallback((agendamentoId?: string) => {
    if (!form.data || !form.colaboradorId || !unidadeSelecionada) return [];
    const unidade = unidades.find(u => u.id === unidadeSelecionada);
    if (!unidade) return [];
    const diaSemana = getDiaSemanaFirestore(form.data);
    const horariosFuncionamento = unidade.horariosFuncionamento?.[diaSemana];
    if (!horariosFuncionamento || !horariosFuncionamento.aberto) return [];
    
    const horarios: string[] = [];
    const [hIni, mIni] = horariosFuncionamento.abertura.split(":").map(Number);
    const [hFim, mFim] = horariosFuncionamento.fechamento.split(":").map(Number);
    
    // Intervalo de almoço (se configurado)
    const intervaloInicio = horariosFuncionamento.intervaloInicio ? 
      horariosFuncionamento.intervaloInicio.split(":").map(Number) : null;
    const intervaloFim = horariosFuncionamento.intervaloFim ? 
      horariosFuncionamento.intervaloFim.split(":").map(Number) : null;
    
    for (let h = hIni; h < hFim || (h === hFim && mIni < mFim); h++) {
      for (let m = (h === hIni ? mIni : 0); m < 60; m += 30) {
        if (h > hFim || (h === hFim && m >= mFim)) break;
        
        // Verificar se está dentro do intervalo de almoço
        if (intervaloInicio && intervaloFim) {
          const minutosAtual = h * 60 + m;
          const minutosIntervaloInicio = intervaloInicio[0] * 60 + intervaloInicio[1];
          const minutosIntervaloFim = intervaloFim[0] * 60 + intervaloFim[1];
          
          if (minutosAtual >= minutosIntervaloInicio && minutosAtual < minutosIntervaloFim) {
            continue; // Pular horários dentro do intervalo
          }
        }
        
        const hora = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
        horarios.push(hora);
      }
    }
    
    // Filtrar horários já ocupados pelo barbeiro (considerando duração dos serviços)
    const agsDia = eventos.filter(ev => {
      const ag = ev.extendedProps as Agendamento;
      if (!ag) return false;
      
      // Comparar colaborador
      if (ag.colaboradorId !== form.colaboradorId) return false;
      
      // Comparar data (considerando formato com timezone)
      let dataEvento = ag.data;
      if (ag.data.includes('T')) {
        dataEvento = ag.data.split('T')[0];
      }
      
      let dataForm = form.data;
      if (form.data && form.data.includes('T')) {
        dataForm = form.data.split('T')[0];
      }
      
      return dataEvento === dataForm && ag.status === 'ativo';
    });
    
    // Filtrar horários que conflitam com agendamentos existentes
    return horarios.filter(horario => {
      if (!horario || typeof horario !== "string" || !horario.includes(":")) return false;
      const [h, m] = horario.split(":").map(Number);
      const inicioHorario = h * 60 + m;
      
      // Se temos um serviço selecionado, verificar se cabe no horário
      if (form.servicoId) {
        const servico = servicos.find(s => s.id === form.servicoId);
        if (!servico) return false;
        const fimHorario = inicioHorario + servico.duracaoEmMinutos;
        
        // Verificar se o serviço termina antes do fechamento da unidade
        const minutosFechamento = hFim * 60 + mFim;
        if (fimHorario > minutosFechamento) return false;
      }
      
      // Verificar conflitos com agendamentos existentes
      for (const ag of agsDia) {
        // Pular o próprio agendamento se estiver editando
        if (agendamentoId && ag.id === agendamentoId) continue;
        if (!ag.hora || typeof ag.hora !== "string" || !ag.hora.includes(":")) continue;
        const [hAg, mAg] = ag.hora.split(":").map(Number);
        const inicioAg = hAg * 60 + mAg;
        
        // Encontrar duração do serviço do agendamento
        const servicoAg = servicos.find(s => s.id === ag.servicoId);
        const duracaoAg = servicoAg ? servicoAg.duracaoEmMinutos : 30;
        const fimAg = inicioAg + duracaoAg;
        
        // Se temos um serviço selecionado, verificar sobreposição
        if (form.servicoId) {
          const servico = servicos.find(s => s.id === form.servicoId);
          if (!servico) return false;
          const fimHorario = inicioHorario + servico.duracaoEmMinutos;
          
          // Verificar se há sobreposição
          if (inicioHorario < fimAg && fimHorario > inicioAg) {
            return false; // Conflito encontrado
          }
        } else {
          // Se não temos serviço selecionado, verificar se o horário está ocupado
          if (inicioHorario >= inicioAg && inicioHorario < fimAg) {
            return false; // Horário ocupado
          }
        }
      }
      
      return true; // Horário disponível
    });
  }, [form.data, form.colaboradorId, form.servicoId, unidadeSelecionada, unidades, eventos, servicos]);

  // Função para saber se a unidade está aberta no dia selecionado
  function unidadeAbertaNoDia(unidadeId: string, data: string) {
    if (!unidadeId || !data) return false;
    const unidade = unidades.find(u => u.id === unidadeId);
    if (!unidade) return false;
    const diaSemana = getDiaSemanaFirestore(data);
    const horariosFuncionamento = unidade.horariosFuncionamento?.[diaSemana];
    return !!(horariosFuncionamento && horariosFuncionamento.aberto);
  }

  // Função para saber se o horário está dentro do funcionamento da unidade
  function horarioDentroFuncionamento(unidadeId: string, data: string, hora: string) {
    if (!unidadeId || !data || !hora) return false;
    const unidade = unidades.find(u => u.id === unidadeId);
    if (!unidade) return false;
    const diaSemana = getDiaSemanaFirestore(data);
    const horariosFuncionamento = unidade.horariosFuncionamento?.[diaSemana];
    if (!horariosFuncionamento || !horariosFuncionamento.aberto) return false;
    const [hIni, mIni] = horariosFuncionamento.abertura.split(":").map(Number);
    const [hFim, mFim] = horariosFuncionamento.fechamento.split(":").map(Number);
    const [h, m] = hora.split(":").map(Number);
    const minutos = h * 60 + m;
    const minutosIni = hIni * 60 + mIni;
    const minutosFim = hFim * 60 + mFim;
    return minutos >= minutosIni && minutos < minutosFim;
  }

  // Função para limpar formulário
  const limparFormulario = useCallback(() => {
    setForm({});
    setErro("");
    setSucesso("");
  }, []);

  // Handler para clique em dia/slot
  const aoClicarNoDia = (info: DateClickInfo) => {
    const data = info.dateStr;
    // Limpar formulário e definir apenas a data
    limparFormulario();
    setForm({ data });
    setModalNovoOpen(true);
  };

  // Abrir modal para editar agendamento
  const aoClicarEvento = (info: EventClickInfo) => {
    const ag = info.event.extendedProps as Agendamento;
    setForm({ ...ag });
    
    // Definir a unidade do agendamento
    const colaborador = colaboradores.find(c => c.id === ag.colaboradorId);
    if (colaborador) {
      const unidade = unidades.find(u => u.nome === colaborador.unidadeNome);
      if (unidade) {
        setUnidadeSelecionada(unidade.id);
      }
    }
    
    setErro("");
    setSucesso("");
    setModalEditar(true);
  };

  // Salvar novo agendamento
  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    
    // Validações básicas
    if (!form.clienteId) {
      setErro("Por favor, selecione um cliente!");
      return;
    }
    
    if (!form.servicoId) {
      setErro("Por favor, selecione um serviço!");
      return;
    }
    
    if (!form.colaboradorId) {
      setErro("Por favor, selecione um profissional!");
      return;
    }
    
    // Verificar se o colaborador está de férias
    if (colaboradorEstaDeFerias(form.colaboradorId)) {
      setErro("Este profissional está de férias e não pode receber agendamentos!");
      return;
    }
    
    if (!form.data) {
      setErro("Por favor, selecione uma data!");
      return;
    }
    
    // Verificar se o colaborador está de férias na data selecionada
    if (colaboradorEstaDeFeriasNaData(form.colaboradorId, form.data)) {
      setErro("Este profissional está de férias na data selecionada!");
      return;
    }
    
    if (!form.hora) {
      setErro("Por favor, selecione um horário!");
      return;
    }
    
    if (!unidadeSelecionada) {
      setErro("Por favor, selecione uma unidade!");
      return;
    }
    
    // Verificar se a unidade está aberta no dia selecionado
    if (!unidadeAbertaNoDia(unidadeSelecionada, form.data)) {
      setErro("A unidade está fechada neste dia!");
      return;
    }
    
    // Verificar se o horário está dentro do funcionamento da unidade
    if (!horarioDentroFuncionamento(unidadeSelecionada, form.data, form.hora)) {
      setErro("O horário selecionado está fora do horário de funcionamento da unidade!");
      return;
    }
    
    // Verifica conflito de horário
    if (await existeConflitoHorario({
      data: form.data!,
      hora: form.hora!,
      colaboradorId: form.colaboradorId!,
      servicoId: form.servicoId!
    })) {
      setErro("Já existe um agendamento para este colaborador neste horário!");
      return;
    }
    
    try {
      const cliente = clientes.find((c) => c.id === form.clienteId);
      const colaborador = colaboradores.find((c) => c.id === form.colaboradorId);
      const servico = servicos.find((s) => s.id === form.servicoId);
      await criarAgendamento({
        ...form,
        clienteNome: cliente?.nomeCompleto || "",
        colaboradorNome: colaborador?.nomeCompleto || "",
        servicoNome: servico?.nomeDoServico || "",
      } as Omit<Agendamento, "id" | "criadoEm">);
      setSucesso("Agendamento criado com sucesso!");
      setModalNovoOpen(false);
      limparFormulario();
      buscarAgendamentos();
    } catch (err) {
      if (err instanceof Error) setErro(err.message);
      else setErro("Erro ao criar agendamento");
    }
  };

  // Salvar edição
  const handleEditar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    
    // Validações básicas
    if (!unidadeSelecionada) {
      setErro("Por favor, selecione uma unidade!");
      return;
    }
    
    if (!form.clienteId) {
      setErro("Por favor, selecione um cliente!");
      return;
    }
    
    if (!form.servicoId) {
      setErro("Por favor, selecione um serviço!");
      return;
    }
    
    if (!form.colaboradorId) {
      setErro("Por favor, selecione um profissional!");
      return;
    }
    
    // Verificar se o colaborador está de férias
    if (colaboradorEstaDeFerias(form.colaboradorId)) {
      setErro("Este profissional está de férias e não pode receber agendamentos!");
      return;
    }
    
    if (!form.data) {
      setErro("Por favor, selecione uma data!");
      return;
    }
    
    // Verificar se o colaborador está de férias na data selecionada
    if (colaboradorEstaDeFeriasNaData(form.colaboradorId, form.data)) {
      setErro("Este profissional está de férias na data selecionada!");
      return;
    }
    
    if (!form.hora) {
      setErro("Por favor, selecione um horário!");
      return;
    }
    
    // Verificar se a unidade está aberta no dia selecionado
    if (!unidadeAbertaNoDia(unidadeSelecionada, form.data)) {
      setErro("A unidade está fechada neste dia!");
      return;
    }
    
    // Verificar se o horário está dentro do funcionamento da unidade
    if (!horarioDentroFuncionamento(unidadeSelecionada, form.data, form.hora)) {
      setErro("O horário selecionado está fora do horário de funcionamento da unidade!");
      return;
    }
    
    // Verifica conflito de horário
    if (await existeConflitoHorario({
      data: form.data!,
      hora: form.hora!,
      colaboradorId: form.colaboradorId!,
      servicoId: form.servicoId!,
      agendamentoId: form.id
    })) {
      setErro("Já existe um agendamento para este colaborador neste horário!");
      return;
    }
    
    try {
      const cliente = clientes.find((c) => c.id === form.clienteId);
      const colaborador = colaboradores.find((c) => c.id === form.colaboradorId);
      const servico = servicos.find((s) => s.id === form.servicoId);
      await atualizarAgendamento(form.id!, {
        ...form,
        clienteNome: cliente?.nomeCompleto || "",
        colaboradorNome: colaborador?.nomeCompleto || "",
        servicoNome: servico?.nomeDoServico || "",
      });
      setSucesso("Agendamento atualizado!");
      setModalEditar(false);
      buscarAgendamentos();
    } catch (err) {
      if (err instanceof Error) setErro(err.message);
      else setErro("Erro ao atualizar agendamento");
    }
  };

  // Cancelar agendamento
  const handleCancelar = async () => {
    setErro("");
    setSucesso("");
    try {
      await cancelarAgendamento(form.id!);
      setSucesso("Agendamento cancelado!");
      setModalEditar(false);
      buscarAgendamentos();
    } catch (err) {
      if (err instanceof Error) setErro(err.message);
      else setErro("Erro ao cancelar agendamento");
    }
  };

  // Marcar agendamento como concluído
  const handleConcluir = async () => {
    setErro("");
    setSucesso("");
    try {
      await marcarComoConcluido(form.id!);
      setSucesso("Agendamento marcado como concluído!");
      setModalEditar(false);
      buscarAgendamentos();
    } catch (err) {
      if (err instanceof Error) setErro(err.message);
      else setErro("Erro ao marcar agendamento como concluído");
    }
  };



  // Função para verificar conflito de horário
  async function existeConflitoHorario({ data, hora, colaboradorId, servicoId, agendamentoId }: { data: string, hora: string, colaboradorId: string, servicoId: string, agendamentoId?: string }) {
    if (!data || !hora || !colaboradorId || !servicoId) return false;
    
    const servico = servicos.find((s: Servico & { id: string }) => s.id === servicoId);
    if (!servico) return false;
    
    const dur = servico.duracaoEmMinutos;
    
    // Proteção contra valores undefined
    if (!hora || typeof hora !== "string" || !hora.includes(":")) return false;
    const [horaPart, minPart] = hora.split(":");
    if (!horaPart || !minPart) return false;
    
    const inicioNovo = parseInt(horaPart) * 60 + parseInt(minPart);
    const fimNovo = inicioNovo + dur;
    
    // Buscar todos os agendamentos ativos do colaborador na data
    const ags = await listarAgendamentos({ data, colaboradorId, status: "ativo" });
    
    for (const ag of ags) {
      // Pular o próprio agendamento se estiver editando
      if (agendamentoId && ag.id === agendamentoId) continue;
      
      // Proteção contra valores undefined
      if (!ag.hora || typeof ag.hora !== "string" || !ag.hora.includes(":")) continue;
      const [horaAg, minAg] = ag.hora.split(":");
      if (!horaAg || !minAg) continue;
      
      const inicioExist = parseInt(horaAg) * 60 + parseInt(minAg);
      const servExist = servicos.find((s: Servico & { id: string }) => s.id === ag.servicoId);
      const durExist = servExist ? servExist.duracaoEmMinutos : 30;
      const fimExist = inicioExist + durExist;
      
      // Verificar sobreposição: se há conflito entre os horários
      if (inicioNovo < fimExist && fimNovo > inicioExist) {
        return true;
      }
    }
    return false;
  }

  // Função para verificar se um colaborador está de férias
  function colaboradorEstaDeFerias(colaboradorId: string): boolean {
    const info = colaboradoresInfo.find(i => i.pessoaId === colaboradorId);
    if (!info || !info.periodoFeriasInicio || !info.periodoFeriasFim) return false;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let inicio: Date, fim: Date;
    
    // Verificar se é Timestamp do Firestore
    if (typeof info.periodoFeriasInicio === 'object' && 'toDate' in info.periodoFeriasInicio) {
      inicio = (info.periodoFeriasInicio as { toDate: () => Date }).toDate();
    } else {
      inicio = new Date(info.periodoFeriasInicio as string | Date);
    }
    
    if (typeof info.periodoFeriasFim === 'object' && 'toDate' in info.periodoFeriasFim) {
      fim = (info.periodoFeriasFim as { toDate: () => Date }).toDate();
    } else {
      fim = new Date(info.periodoFeriasFim as string | Date);
    }
    
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);
    
    return hoje >= inicio && hoje <= fim;
  }

  // Função para obter informações de férias de um colaborador
  function getInfoFeriasColaborador(colaboradorId: string): string {
    const info = colaboradoresInfo.find(i => i.pessoaId === colaboradorId);
    if (!info || !info.periodoFeriasInicio || !info.periodoFeriasFim) return "";
    
    let inicio: Date, fim: Date;
    
    // Verificar se é Timestamp do Firestore
    if (typeof info.periodoFeriasInicio === 'object' && 'toDate' in info.periodoFeriasInicio) {
      inicio = (info.periodoFeriasInicio as { toDate: () => Date }).toDate();
    } else {
      inicio = new Date(info.periodoFeriasInicio as string | Date);
    }
    
    if (typeof info.periodoFeriasFim === 'object' && 'toDate' in info.periodoFeriasFim) {
      fim = (info.periodoFeriasFim as { toDate: () => Date }).toDate();
    } else {
      fim = new Date(info.periodoFeriasFim as string | Date);
    }
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);
    
    if (hoje >= inicio && hoje <= fim) {
      return ` (DE FÉRIAS até ${fim.toLocaleDateString('pt-BR')})`;
    } else if (hoje < inicio) {
      return ` (Férias de ${inicio.toLocaleDateString('pt-BR')} até ${fim.toLocaleDateString('pt-BR')})`;
    }
    
    return "";
  }

  // Função para verificar se um colaborador está de férias em uma data específica
  const colaboradorEstaDeFeriasNaData = useCallback((colaboradorId: string, data: string): boolean => {
    const info = colaboradoresInfo.find(i => i.pessoaId === colaboradorId);
    if (!info || !info.periodoFeriasInicio || !info.periodoFeriasFim) return false;
    
    const dataVerificar = new Date(data);
    dataVerificar.setHours(0, 0, 0, 0);
    
    let inicio: Date, fim: Date;
    
    // Verificar se é Timestamp do Firestore
    if (typeof info.periodoFeriasInicio === 'object' && 'toDate' in info.periodoFeriasInicio) {
      inicio = (info.periodoFeriasInicio as { toDate: () => Date }).toDate();
    } else {
      inicio = new Date(info.periodoFeriasInicio as string | Date);
    }
    
    if (typeof info.periodoFeriasFim === 'object' && 'toDate' in info.periodoFeriasFim) {
      fim = (info.periodoFeriasFim as { toDate: () => Date }).toDate();
    } else {
      fim = new Date(info.periodoFeriasFim as string | Date);
    }
    
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);
    
    return dataVerificar >= inicio && dataVerificar <= fim;
  }, [colaboradoresInfo]);

  // Modal de Novo Agendamento
  const ModalNovoAgendamento = modalNovoOpen && typeof window !== "undefined" && document.body && createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-[99998] bg-black bg-opacity-80 transition-opacity duration-300 ${modalNovoOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={e => { if (e.target === e.currentTarget) setModalNovoOpen(false); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
          transform transition-all duration-300
          ${modalNovoOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-80 scale-95'}
          overflow-y-auto max-h-[90vh]`}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={() => setModalNovoOpen(false)}
          aria-label="Fechar"
          type="button"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-black">Novo Agendamento</h2>
        <form onSubmit={handleSalvar} className="flex flex-col gap-4">
          {/* Unidade */}
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={unidadeSelecionada}
              onChange={e => setUnidadeSelecionada(e.target.value)}
              required
              disabled={loadingUnidades}
            >
              <option value="">Selecione a unidade</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Unidade *</label>
          </div>
          {/* Serviço */}
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={form.servicoId || ""}
              onChange={e => setForm(f => ({ ...f, servicoId: e.target.value }))}
              required
            >
              <option value="">Selecione o serviço</option>
              {servicosAtivos.map(s => (
                <option key={s.id} value={s.id}>{s.nomeDoServico}</option>
              ))}
            </select>
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Serviço *</label>
          </div>
          {/* Profissional */}
          <div className="relative">
            {unidadeSelecionada ? (
              barbeirosUnidade.length > 0 ? (
                <select
                  className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                  value={form.colaboradorId || ""}
                  onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value, hora: "" }))}
                  required
                  disabled={loadingUnidades}
                >
                  <option value="">Selecione o profissional</option>
                  {barbeirosUnidade.map(c => {
                    const infoFerias = getInfoFeriasColaborador(c.id!);
                    const estaDeFeriasNaData = form.data ? colaboradorEstaDeFeriasNaData(c.id!, form.data) : false;
                    const textoFerias = estaDeFeriasNaData ? ` (DE FÉRIAS em ${form.data})` : infoFerias;
                    return (
                      <option 
                        key={c.id} 
                        value={c.id}
                        disabled={estaDeFeriasNaData}
                      >
                        {c.nomeCompleto} {textoFerias}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 border border-orange-300 rounded-lg bg-orange-50 text-orange-600 select-none">
                  Não há profissionais disponíveis nesta unidade (alguns podem estar de férias)
                </div>
              )
            ) : (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                Selecione uma unidade primeiro
              </div>
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Profissional *</label>
          </div>
          {/* Data */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Data *</label>
            <input
              type="date"
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={formatarDataInput(form.data)}
              onChange={e => {
                setForm(f => ({ ...f, data: e.target.value, hora: "" }));
              }}
              required
              min={getHojeISO()}
            />
          </div>
          {/* Horário */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Horário *</label>
            {unidadeSelecionada && form.data && unidadeAbertaNoDia(unidadeSelecionada, form.data) ? (
              <>
                {form.colaboradorId && form.servicoId ? (
                  gerarHorariosDisponiveis().length > 0 ? (
                    <>
                      <select
                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                        value={form.hora || ""}
                        onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                        required
                      >
                        <option value="">Selecione o horário</option>
                        {gerarHorariosDisponiveis().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <div className="text-xs text-gray-500 mt-1">
                        {gerarHorariosDisponiveis().length} horário(s) disponível(is)
                      </div>
                    </>
                  ) : (
                    <div className="p-3 border border-red-300 rounded-lg bg-red-50 text-red-600 select-none">
                      Não há horários disponíveis para este profissional nesta data
                    </div>
                  )
                ) : (
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                    Selecione um profissional e serviço primeiro
                  </div>
                )}
              </>
            ) : unidadeSelecionada && form.data ? (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">Unidade fechada neste dia</div>
            ) : (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                {!unidadeSelecionada ? "Selecione uma unidade primeiro" : "Selecione uma data primeiro"}
              </div>
            )}
          </div>
          {/* Cliente */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Cliente *</label>
            <ClienteSearch
              onClienteSelect={(cliente) => setForm(f => ({ ...f, clienteId: cliente.id }))}
              selectedCliente={clientes.find(c => c.id === form.clienteId) || null}
              placeholder="Buscar cliente pelo nome..."
              className="w-full"
            />
          </div>
          {/* Observações */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Observações</label>
            <input
              type="text"
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={form.observacoes ?? ""}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Digite observações (opcional)"
              autoComplete="off"
            />
          </div>
          {erro && <span className="text-red-500 text-center">{erro}</span>}
          {sucesso && <span className="text-green-600 text-center">{sucesso}</span>}
          <div className="flex gap-4 mt-4 justify-center">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
              disabled={loadingUnidades}
            >
              {loadingUnidades ? "Carregando..." : "Agendar"}
            </button>
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
              onClick={() => setModalNovoOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );

  // Modal de Edição de Agendamento
  const ModalEditarAgendamento = modalEditar && typeof window !== "undefined" && document.body && createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-[99998] bg-black bg-opacity-80 transition-opacity duration-300 ${modalEditar ? 'opacity-100' : 'opacity-0'}`}
      onClick={e => { if (e.target === e.currentTarget) setModalEditar(false); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
          transform transition-all duration-300
          ${modalEditar ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-80 scale-95'}
          overflow-y-auto max-h-[90vh]`}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={() => setModalEditar(false)}
          aria-label="Fechar"
          type="button"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-black">Editar Agendamento</h2>
        {/* Status do agendamento */}
        {form.status && (
          <div className={`text-center p-3 rounded-lg mb-4 ${
            form.status === 'finalizado' ? 'bg-green-100 text-green-800' :
            form.status === 'cancelado' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            <strong>Status:</strong> {form.status === 'finalizado' ? 'Finalizado' : 
                                    form.status === 'cancelado' ? 'Cancelado' : 'Ativo'}
          </div>
        )}
        <form onSubmit={handleEditar} className="flex flex-col gap-4">
          {/* Unidade */}
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={unidadeSelecionada}
              onChange={e => setUnidadeSelecionada(e.target.value)}
              required
              disabled={loadingUnidades || form.status === 'finalizado' || form.status === 'cancelado'}
            >
              <option value="">Selecione a unidade</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Unidade *</label>
          </div>
          {/* Serviço */}
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={form.servicoId || ""}
              onChange={e => setForm(f => ({ ...f, servicoId: e.target.value }))}
              required
              disabled={form.status === 'finalizado' || form.status === 'cancelado'}
            >
              <option value="">Selecione o serviço</option>
              {servicosAtivos.map(s => (
                <option key={s.id} value={s.id}>{s.nomeDoServico}</option>
              ))}
            </select>
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Serviço *</label>
          </div>
          {/* Profissional */}
          <div className="relative">
            {unidadeSelecionada ? (
              barbeirosUnidade.length > 0 ? (
                <select
                  className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                  value={form.colaboradorId || ""}
                  onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value, hora: "" }))}
                  required
                  disabled={loadingUnidades}
                >
                  <option value="">Selecione o profissional</option>
                  {barbeirosUnidade.map(c => {
                    const infoFerias = getInfoFeriasColaborador(c.id!);
                    const estaDeFeriasNaData = form.data ? colaboradorEstaDeFeriasNaData(c.id!, form.data) : false;
                    const textoFerias = estaDeFeriasNaData ? ` (DE FÉRIAS em ${form.data})` : infoFerias;
                    return (
                      <option 
                        key={c.id} 
                        value={c.id}
                        disabled={estaDeFeriasNaData}
                      >
                        {c.nomeCompleto} {textoFerias}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 border border-orange-300 rounded-lg bg-orange-50 text-orange-600 select-none">
                  Não há profissionais disponíveis nesta unidade (alguns podem estar de férias)
                </div>
              )
            ) : (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                Selecione uma unidade primeiro
              </div>
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Profissional *</label>
          </div>
          {/* Data */}
          <div className="relative">
            <input
              type="date"
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
              value={formatarDataInput(form.data)}
              onChange={e => setForm((f: typeof form) => ({ ...f, data: e.target.value, hora: "" }))}
              required
              placeholder=" "
              disabled={form.status === 'finalizado' || form.status === 'cancelado'}
            />
            <label
              className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
            >
              Data
            </label>
          </div>
          {/* Horário */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Horário *</label>
            {unidadeSelecionada && form.data && unidadeAbertaNoDia(unidadeSelecionada, form.data) ? (
              <>
                {form.colaboradorId && form.servicoId ? (
                  gerarHorariosDisponiveis().length > 0 ? (
                    <>
                      <select
                        className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                        value={form.hora || ""}
                        onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                        required
                        disabled={form.status === 'finalizado' || form.status === 'cancelado'}
                      >
                        <option value="">Selecione o horário</option>
                        {gerarHorariosDisponiveis().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <div className="text-xs text-gray-500 mt-1">
                        {gerarHorariosDisponiveis().length} horário(s) disponível(is)
                      </div>
                    </>
                  ) : (
                    <div className="p-3 border border-red-300 rounded-lg bg-red-50 text-red-600 select-none">
                      Não há horários disponíveis para este profissional nesta data
                    </div>
                  )
                ) : (
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                    Selecione um profissional e serviço primeiro
                  </div>
                )}
              </>
            ) : unidadeSelecionada && form.data ? (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">Unidade fechada neste dia</div>
            ) : (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                {!unidadeSelecionada ? "Selecione uma unidade primeiro" : "Selecione uma data primeiro"}
              </div>
            )}
          </div>
          {/* Cliente */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Cliente *</label>
            <ClienteSearch
              onClienteSelect={(cliente) => setForm(f => ({ ...f, clienteId: cliente.id }))}
              selectedCliente={clientes.find(c => c.id === form.clienteId) || null}
              placeholder="Buscar cliente pelo nome..."
              className="w-full"
              disabled={form.status === 'finalizado' || form.status === 'cancelado'}
            />
          </div>
          {/* Observações */}
          <div className="relative">
            <input
              type="text"
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
              value={form.observacoes || ""}
              onChange={e => setForm((f: typeof form) => ({ ...f, observacoes: e.target.value }))}
              placeholder=" "
              disabled={form.status === 'finalizado' || form.status === 'cancelado'}
            />
            <label
              className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
            >
              Observações
            </label>
          </div>
          {erro && <span className="text-red-500 text-center">{erro}</span>}
          {sucesso && <span className="text-green-600 text-center">{sucesso}</span>}
          {/* Botões de ação apenas para agendamentos ativos */}
          {form.status !== 'finalizado' && form.status !== 'cancelado' && (
            <div className="flex gap-4 mt-4 justify-center">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Salvar Alterações
              </button>
              <button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                onClick={() => setModalEditar(false)}
              >
                Cancelar
              </button>
            </div>
          )}
          
          {/* Botão de fechar para agendamentos finalizados/cancelados */}
          {(form.status === 'finalizado' || form.status === 'cancelado') && (
            <div className="flex gap-4 mt-4 justify-center">
              <button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                onClick={() => setModalEditar(false)}
              >
                Fechar
              </button>
            </div>
          )}
        </form>
        
        {/* Ações do Agendamento apenas para agendamentos ativos */}
        {form.status !== 'finalizado' && form.status !== 'cancelado' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-black mb-4 text-center">Ações do Agendamento</h3>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCancelar}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Cancelar Agendamento
              </button>
              <button
                onClick={handleConcluir}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Marcar como Concluído
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  // Limpar formulário quando modal for aberto
  useEffect(() => {
    if (modalNovoOpen && !form.data) {
      limparFormulario();
    }
  }, [modalNovoOpen, form.data, limparFormulario]);

  // Limpar erro ao trocar unidade, data ou profissional
  useEffect(() => {
    setErro("");
  }, [unidadeSelecionada, form.data, form.colaboradorId]);

  // Atualizar horários disponíveis quando mudar colaborador, data ou serviço
  useEffect(() => {
    if (form.colaboradorId && form.data && form.servicoId) {
      // Forçar re-render dos horários disponíveis
      setForm(prev => ({ ...prev }));
    }
  }, [form.colaboradorId, form.data, form.servicoId]);

  // Limpar horário quando mudar serviço para forçar recálculo
  useEffect(() => {
    if (form.servicoId && form.hora) {
      // Verificar se o horário atual ainda é válido com o novo serviço
      const horariosDisponiveis = gerarHorariosDisponiveis();
      if (!horariosDisponiveis.includes(form.hora)) {
        setForm(prev => ({ ...prev, hora: "" }));
      }
    }
  }, [form.servicoId, form.hora, gerarHorariosDisponiveis]);

  // Limpar colaborador quando mudar data e ele estiver de férias na nova data
  useEffect(() => {
    if (form.colaboradorId && form.data && colaboradorEstaDeFeriasNaData(form.colaboradorId, form.data)) {
      setForm(prev => ({ ...prev, colaboradorId: "", hora: "" }));
    }
  }, [form.data, form.colaboradorId, colaboradorEstaDeFeriasNaData]);

  return (
    <div className="p-4 bg-white rounded shadow">
      {/* Modal de aviso de unidade fechada */}
      {modalFechado.aberto && typeof window !== "undefined" && document.body &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-[99998] bg-black bg-opacity-80 transition-opacity duration-300"
            onClick={e => { if (e.target === e.currentTarget) setModalFechado({ aberto: false, dia: "" }); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setModalFechado({ aberto: false, dia: "" })}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-black">Unidade Fechada</h2>
              <p className="text-center text-black mb-8">A unidade está fechada neste dia.<br/>Escolha outro dia para agendar.</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setModalFechado({ aberto: false, dia: "" })}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  OK
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        events={eventos}
        dateClick={aoClicarNoDia}
        eventClick={aoClicarEvento}
        navLinks={false}
        nowIndicator
        datesSet={buscarAgendamentos}
        viewDidMount={aoMudarView}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotLabelInterval="00:30:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        height={altura}
        selectAllow={info => {
          if (!unidadeSelecionada) return false;
          const data = info.startStr.split("T")[0];
          const hora = info.startStr.split("T")[1]?.slice(0,5);
          return unidadeAbertaNoDia(unidadeSelecionada, data) && horarioDentroFuncionamento(unidadeSelecionada, data, hora);
        }}
      />

      {ModalNovoAgendamento}
      {ModalEditarAgendamento}
    </div>
  );
}

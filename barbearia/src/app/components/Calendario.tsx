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
  
  // Se já está no formato correto, retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  
  // Se está no formato DD/MM/YYYY, converter
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }
  
  // Se está no formato DD-MM-YYYY, converter
  if (/^\d{2}-\d{2}-\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split('-');
    return `${ano}-${mes}-${dia}`;
  }
  
  // Tenta converter de outros formatos usando Date
  try {
    const d = new Date(data);
    if (!isNaN(d.getTime())) {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
  } catch (error) {
    console.warn("Erro ao converter data:", data, error);
  }
  
  return "";
}

// Função utilitária para garantir formato YYYY-MM-DD local
function getHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Função para formatar data para exibição (DD/MM/YYYY)
function formatarDataExibicao(data: string | undefined): string {
  if (!data) return "Data não definida";
  
  // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
  let dataLimpa = data;
  if (data.includes('T')) {
    dataLimpa = data.split('T')[0];
  }
  
  // Se já está no formato YYYY-MM-DD, converter para DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    const [ano, mes, dia] = dataLimpa.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  // Se está no formato DD/MM/YYYY, retornar como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataLimpa)) {
    return dataLimpa;
  }
  
  // Se está no formato DD-MM-YYYY, converter para DD/MM/YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dataLimpa)) {
    const [dia, mes, ano] = dataLimpa.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  return "Data inválida";
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
  // Adicionar estados de animação
  const [animandoNovo, setAnimandoNovo] = useState(false);
  const [animandoEditar, setAnimandoEditar] = useState(false);

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
        // Calcular horário de término
        let horaFim = "";
        if (ag.hora && ag.servicoId) {
          const servico = servicos.find(s => s.id === ag.servicoId);
          if (servico) {
            const [h, m] = ag.hora.split(":").map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
              const hFim = Math.floor(totalMin / 60);
              const mFim = totalMin % 60;
              horaFim = `${hFim.toString().padStart(2, "0")}:${mFim.toString().padStart(2, "0")}`;
            }
          }
        }
        return {
          id: ag.id,
          title: `${ag.hora}${horaFim ? ` - ${horaFim}` : ''}<br>${ag.servicoNome} - ${ag.clienteNome}`,
          start: `${dataFormatada}T${ag.hora}`,
          extendedProps: ag,
          backgroundColor: ag.status === 'cancelado' ? '#ef4444' : 
                          ag.status === 'finalizado' ? '#10b981' : '#3b82f6',
          borderColor: ag.status === 'cancelado' ? '#dc2626' : 
                      ag.status === 'finalizado' ? '#059669' : '#2563eb',
        };
      })
    );
  }, [servicos]);

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
    
    // Validar horários de funcionamento
    if (isNaN(hIni) || isNaN(mIni) || isNaN(hFim) || isNaN(mFim)) {
      console.error("Horários de funcionamento inválidos:", horariosFuncionamento);
      return [];
    }
    
    // Intervalo de almoço (se configurado)
    const intervaloInicio = horariosFuncionamento.intervaloInicio ? 
      horariosFuncionamento.intervaloInicio.split(":").map(Number) : null;
    const intervaloFim = horariosFuncionamento.intervaloFim ? 
      horariosFuncionamento.intervaloFim.split(":").map(Number) : null;
    
    // Validar intervalo de almoço
    if (intervaloInicio && (isNaN(intervaloInicio[0]) || isNaN(intervaloInicio[1]))) {
      console.warn("Intervalo de almoço início inválido:", horariosFuncionamento.intervaloInicio);
    }
    if (intervaloFim && (isNaN(intervaloFim[0]) || isNaN(intervaloFim[1]))) {
      console.warn("Intervalo de almoço fim inválido:", horariosFuncionamento.intervaloFim);
    }
    
    // Obter data de hoje para comparação
    const hojeISO = getHojeISO();
    const dataSelecionada = formatarDataInput(form.data);
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    
    // Gerar todos os horários possíveis
    for (let h = hIni; h < hFim || (h === hFim && mIni < mFim); h++) {
      for (let m = (h === hIni ? mIni : 0); m < 60; m += 30) {
        if (h > hFim || (h === hFim && m >= mFim)) break;
        
        // Verificar se está dentro do intervalo de almoço
        if (intervaloInicio && intervaloFim && !isNaN(intervaloInicio[0]) && !isNaN(intervaloFim[0])) {
          const minutosAtual = h * 60 + m;
          const minutosIntervaloInicio = intervaloInicio[0] * 60 + intervaloInicio[1];
          const minutosIntervaloFim = intervaloFim[0] * 60 + intervaloFim[1];
          
          if (minutosAtual >= minutosIntervaloInicio && minutosAtual < minutosIntervaloFim) {
            continue; // Pular horários dentro do intervalo
          }
        }
        
        // Só mostrar horários futuros no dia de hoje
        if (dataSelecionada === hojeISO) {
          const minutosHorario = h * 60 + m;
          if (minutosHorario <= minutosAgora) continue;
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
      if (!horario || typeof horario !== "string" || !horario.match(/^\d{2}:\d{2}$/)) {
        console.warn("Horário inválido:", horario);
        return false;
      }
      
      const [h, m] = horario.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) {
        console.warn("Valores de hora/minuto inválidos:", { h, m });
        return false;
      }
      
      const inicioHorario = h * 60 + m;
      
      // Se temos um serviço selecionado, verificar se cabe no horário
      if (form.servicoId) {
        const servico = servicos.find(s => s.id === form.servicoId);
        if (!servico) {
          console.warn("Serviço não encontrado:", form.servicoId);
          return false;
        }
        
        const duracaoServico = servico.duracaoEmMinutos;
        if (!duracaoServico || duracaoServico <= 0) {
          console.warn("Duração do serviço inválida:", duracaoServico);
          return false;
        }
        
        const fimHorario = inicioHorario + duracaoServico;
        
        // Verificar se o serviço termina antes do fechamento da unidade
        const minutosFechamento = hFim * 60 + mFim;
        if (fimHorario > minutosFechamento) {
          return false; // Serviço não cabe no horário de funcionamento
        }
      }
      
      // Verificar conflitos com agendamentos existentes
      for (const ag of agsDia) {
        // Pular o próprio agendamento se estiver editando
        if (agendamentoId && ag.id === agendamentoId) continue;
        
        // Validar hora do agendamento existente
        if (!ag.hora || !ag.hora.match(/^\d{2}:\d{2}$/)) {
          console.warn("Hora inválida no agendamento existente:", ag.hora, "ID:", ag.id);
          continue;
        }
        
        const [hAg, mAg] = ag.hora.split(":").map(Number);
        if (isNaN(hAg) || isNaN(mAg)) {
          console.warn("Valores de hora/minuto inválidos no agendamento existente:", { hAg, mAg }, "ID:", ag.id);
          continue;
        }
        
        const inicioAg = hAg * 60 + mAg;
        
        // Encontrar duração do serviço do agendamento
        const servicoAg = servicos.find(s => s.id === ag.servicoId);
        const duracaoAg = servicoAg ? servicoAg.duracaoEmMinutos : 30;
        const fimAg = inicioAg + duracaoAg;
        
        // Se temos um serviço selecionado, verificar sobreposição
        if (form.servicoId) {
          const servico = servicos.find(s => s.id === form.servicoId);
          if (!servico) return false;
          
          const duracaoServico = servico.duracaoEmMinutos;
          if (!duracaoServico || duracaoServico <= 0) return false;
          
          const fimHorario = inicioHorario + duracaoServico;
          
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

  // Validação extra no submit para impedir agendamento em horários passados
  function horarioEhFuturo(data: string, hora: string) {
    if (!data || !hora) return false;
    const hojeISO = getHojeISO();
    const dataSelecionada = formatarDataInput(data);
    if (dataSelecionada > hojeISO) return true; // Data futura
    if (dataSelecionada < hojeISO) return false; // Data passada
    // Se for hoje, comparar hora
    const agora = new Date();
    const [h, m] = hora.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    const minutosHorario = h * 60 + m;
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    return minutosHorario > minutosAgora;
  }

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
    setForm({ clienteId: "" });
    setUnidadeSelecionada("");
    setErro("");
    setSucesso("");
  }, []);

  // Handler para clique em dia/slot
  const aoClicarNoDia = (info: DateClickInfo) => {
    // Detecta se veio com hora (ex: 2024-06-10T09:00:00)
    const temHora = info.dateStr.includes('T') && info.dateStr.split('T')[1]?.length >= 5;
    const data = info.dateStr.split('T')[0];
    const hora = temHora ? info.dateStr.split('T')[1].slice(0,5) : undefined;
    limparFormulario();
    setForm(hora ? { data, hora } : { data });
    setModalNovoOpen(true);
  };

  // Novo handler para clique em slot de horário
  const aoClicarNoSlot = (info: { start: Date; startStr: string }) => {
    // Sempre vem com hora
    const data = info.startStr.split('T')[0];
    const hora = info.startStr.split('T')[1]?.slice(0,5);
    limparFormulario();
    setForm({ data, hora });
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
    
    // Verificar se a unidade está aberta no dia selecionado
    const dataFormatada = formatarDataInput(form.data);
    if (!unidadeAbertaNoDia(unidadeSelecionada, dataFormatada)) {
      setErro("A unidade está fechada neste dia!");
      return;
    }
    
    // Verificar se o horário está dentro do funcionamento da unidade
    if (!horarioDentroFuncionamento(unidadeSelecionada, dataFormatada, form.hora)) {
      setErro("O horário selecionado está fora do horário de funcionamento da unidade!");
      return;
    }
    
    // Verifica conflito de horário
    if (await existeConflitoHorario({
      data: dataFormatada,
      hora: form.hora!,
      colaboradorId: form.colaboradorId!,
      servicoId: form.servicoId!
    })) {
      setErro("Já existe um agendamento para este colaborador neste horário!");
      return;
    }
    
    if (!horarioEhFuturo(form.data, form.hora)) {
      setErro("Não é possível agendar para horários passados!");
      return;
    }
    
    try {
      const cliente = clientes.find((c) => c.id === form.clienteId);
      const colaborador = colaboradores.find((c) => c.id === form.colaboradorId);
      const servico = servicos.find((s) => s.id === form.servicoId);
      
      await criarAgendamento({
        ...form,
        data: dataFormatada, // Usar a data formatada
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
    const dataFormatada = formatarDataInput(form.data);
    if (!unidadeAbertaNoDia(unidadeSelecionada, dataFormatada)) {
      setErro("A unidade está fechada neste dia!");
      return;
    }
    
    // Verificar se o horário está dentro do funcionamento da unidade
    if (!horarioDentroFuncionamento(unidadeSelecionada, dataFormatada, form.hora)) {
      setErro("O horário selecionado está fora do horário de funcionamento da unidade!");
      return;
    }
    
    // Verifica conflito de horário
    if (await existeConflitoHorario({
      data: dataFormatada,
      hora: form.hora!,
      colaboradorId: form.colaboradorId!,
      servicoId: form.servicoId!,
      agendamentoId: form.id
    })) {
      setErro("Já existe um agendamento para este colaborador neste horário!");
      return;
    }
    
    if (!horarioEhFuturo(form.data, form.hora)) {
      setErro("Não é possível agendar para horários passados!");
      return;
    }
    
    try {
      const cliente = clientes.find((c) => c.id === form.clienteId);
      const colaborador = colaboradores.find((c) => c.id === form.colaboradorId);
      const servico = servicos.find((s) => s.id === form.servicoId);
      
      // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
      let dataFormatada = form.data;
      if (form.data && form.data.includes('T')) {
        dataFormatada = form.data.split('T')[0];
      }
      
      await atualizarAgendamento(form.id!, {
        ...form,
        data: dataFormatada, // Usar a data formatada
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
  const existeConflitoHorario = useCallback(async ({ data, hora, colaboradorId, servicoId, agendamentoId }: { data: string, hora: string, colaboradorId: string, servicoId: string, agendamentoId?: string }) => {
    if (!data || !hora || !colaboradorId || !servicoId) {
      console.warn("Dados incompletos para verificação de conflito:", { data, hora, colaboradorId, servicoId });
      return false;
    }
    
    // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
    let dataFormatada = data;
    if (data.includes('T')) {
      dataFormatada = data.split('T')[0];
    }
    
    // Validar formato da hora
    if (!hora.match(/^\d{2}:\d{2}$/)) {
      console.error("Formato de hora inválido:", hora);
      return false;
    }
    
    const servico = servicos.find((s: Servico & { id: string }) => s.id === servicoId);
    if (!servico) {
      console.error("Serviço não encontrado:", servicoId);
      return false;
    }
    
    const duracaoNovo = servico.duracaoEmMinutos;
    if (!duracaoNovo || duracaoNovo <= 0) {
      console.error("Duração do serviço inválida:", duracaoNovo);
      return false;
    }
    
    // Calcular horários do novo agendamento
    const [horaNovo, minNovo] = hora.split(":").map(Number);
    if (isNaN(horaNovo) || isNaN(minNovo) || horaNovo < 0 || horaNovo > 23 || minNovo < 0 || minNovo > 59) {
      console.error("Valores de hora/minuto inválidos:", { horaNovo, minNovo });
      return false;
    }
    
    const inicioNovo = horaNovo * 60 + minNovo;
    const fimNovo = inicioNovo + duracaoNovo;
    
    try {
      // Buscar todos os agendamentos ativos do colaborador na data
      const ags = await listarAgendamentos({ data: dataFormatada, colaboradorId, status: "ativo" });
      
      for (const ag of ags) {
        // Pular o próprio agendamento se estiver editando
        if (agendamentoId && ag.id === agendamentoId) continue;
        
        // Validar formato da hora do agendamento existente
        if (!ag.hora || !ag.hora.match(/^\d{2}:\d{2}$/)) {
          console.warn("Formato de hora inválido no agendamento existente:", ag.hora, "ID:", ag.id);
          continue;
        }
        
        const [horaExist, minExist] = ag.hora.split(":").map(Number);
        if (isNaN(horaExist) || isNaN(minExist)) {
          console.warn("Valores de hora/minuto inválidos no agendamento existente:", { horaExist, minExist }, "ID:", ag.id);
          continue;
        }
        
        const inicioExist = horaExist * 60 + minExist;
        
        // Buscar duração do serviço do agendamento existente
        const servicoExist = servicos.find((s: Servico & { id: string }) => s.id === ag.servicoId);
        const duracaoExist = servicoExist ? servicoExist.duracaoEmMinutos : 30; // Fallback para 30 min
        const fimExist = inicioExist + duracaoExist;
        
        // Verificar sobreposição: se há conflito entre os horários
        // Conflito ocorre quando:
        // - O início do novo agendamento está dentro do agendamento existente, OU
        // - O fim do novo agendamento está dentro do agendamento existente, OU
        // - O novo agendamento engloba completamente o agendamento existente
        if (inicioNovo < fimExist && fimNovo > inicioExist) {
          console.log("Conflito detectado:", {
            novo: { inicio: inicioNovo, fim: fimNovo, hora: hora },
            existente: { inicio: inicioExist, fim: fimExist, hora: ag.hora, servico: ag.servicoNome }
          });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Erro ao verificar conflito de horário:", error);
      // Em caso de erro, retornar true (conflito) para evitar agendamentos duplicados
      return true;
    }
  }, [servicos]);

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

  // Função utilitária para validar conflito de horário de forma mais eficiente
  const validarConflitoHorario = useCallback(async (hora: string, data: string, colaboradorId: string, servicoId: string, agendamentoId?: string) => {
    if (!hora || !data || !colaboradorId || !servicoId) return null;
    
    try {
      const temConflito = await existeConflitoHorario({
        data,
        hora,
        colaboradorId,
        servicoId,
        agendamentoId
      });
      
      if (temConflito) {
        // Buscar detalhes do conflito para mostrar ao usuário
        const ags = await listarAgendamentos({ data, colaboradorId, status: "ativo" });
        const servico = servicos.find(s => s.id === servicoId);
        const duracaoNovo = servico?.duracaoEmMinutos || 30;
        const [horaNovo, minNovo] = hora.split(":").map(Number);
        const inicioNovo = horaNovo * 60 + minNovo;
        const fimNovo = inicioNovo + duracaoNovo;
        
        const conflitos = ags.filter(ag => {
          if (agendamentoId && ag.id === agendamentoId) return false;
          if (!ag.hora || !ag.hora.match(/^\d{2}:\d{2}$/)) return false;
          
          const [horaExist, minExist] = ag.hora.split(":").map(Number);
          const inicioExist = horaExist * 60 + minExist;
          const servicoExist = servicos.find(s => s.id === ag.servicoId);
          const duracaoExist = servicoExist?.duracaoEmMinutos || 30;
          const fimExist = inicioExist + duracaoExist;
          
          return inicioNovo < fimExist && fimNovo > inicioExist;
        });
        
        if (conflitos.length > 0) {
          const conflito = conflitos[0];
          return {
            temConflito: true,
            detalhes: `Conflito com: ${conflito.servicoNome} (${conflito.hora}) - Cliente: ${conflito.clienteNome}`
          };
        }
      }
      
      return { temConflito: false };
    } catch (error) {
      console.error("Erro ao validar conflito:", error);
      return { temConflito: true, detalhes: "Erro ao verificar conflito" };
    }
  }, [servicos, existeConflitoHorario]);

  // Verificar conflito de horário em tempo real quando selecionar horário
  useEffect(() => {
    const verificarConflitoTempoReal = async () => {
      if (form.hora && form.data && form.colaboradorId && form.servicoId) {
        const resultado = await validarConflitoHorario(
          form.hora,
          form.data,
          form.colaboradorId,
          form.servicoId,
          form.id
        );
        
        if (resultado?.temConflito) {
          setErro(`⚠️ ATENÇÃO: ${resultado.detalhes}`);
        } else {
          // Limpar erro se não houver conflito
          setErro("");
        }
      }
    };

    // Debounce para não fazer muitas verificações
    const timeoutId = setTimeout(verificarConflitoTempoReal, 500);
    return () => clearTimeout(timeoutId);
  }, [form.hora, form.data, form.colaboradorId, form.servicoId, form.id, validarConflitoHorario]);

  // Abrir modal: animação de entrada
  useEffect(() => {
    if (modalNovoOpen) {
      setTimeout(() => setAnimandoNovo(true), 10);
    } else {
      setAnimandoNovo(false);
    }
  }, [modalNovoOpen]);
  useEffect(() => {
    if (modalEditar) {
      setTimeout(() => setAnimandoEditar(true), 10);
    } else {
      setAnimandoEditar(false);
    }
  }, [modalEditar]);

  // Função para fechar modal com animação
  function fecharModalNovoAnimado() {
    setAnimandoNovo(false);
    setTimeout(() => setModalNovoOpen(false), 200);
  }
  function fecharModalEditarAnimado() {
    setAnimandoEditar(false);
    setTimeout(() => setModalEditar(false), 200);
  }

  // Modal Novo Agendamento
  const ModalNovoAgendamento = modalNovoOpen && typeof window !== "undefined" && document.body && createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-[99998] bg-black bg-opacity-80 transition-opacity duration-300 ${modalNovoOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={e => { if (e.target === e.currentTarget) fecharModalNovoAnimado(); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
          transform transition-all duration-300
          ${animandoNovo ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-10'}
          overflow-y-auto max-h-[90vh]`}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={fecharModalNovoAnimado}
          aria-label="Fechar"
          type="button"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-black">Novo Agendamento</h2>
        <form onSubmit={handleSalvar} className="flex flex-col gap-4">
          {/* Unidade */}
          <div className="relative">
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {unidades.find(u => u.id === unidadeSelecionada)?.nome || "Unidade não definida"}
              </div>
            ) : (
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
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Unidade *</label>
          </div>
          {/* Serviço */}
          <div className="relative">
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {servicos.find(s => s.id === form.servicoId)?.nomeDoServico || "Serviço não definido"}
              </div>
            ) : (
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
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Serviço *</label>
          </div>
          {/* Profissional */}
          <div className="relative">
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {colaboradores.find(c => c.id === form.colaboradorId)?.nomeCompleto || "Profissional não definido"}
              </div>
            ) : (
              <>
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
              </>
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
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {clientes.find(c => c.id === form.clienteId)?.nomeCompleto || "Cliente não definido"}
              </div>
            ) : (
              <ClienteSearch
                onClienteSelect={(cliente) => setForm(f => ({ ...f, clienteId: cliente.id }))}
                selectedCliente={clientes.find(c => c.id === form.clienteId) || null}
                placeholder="Buscar cliente pelo nome..."
                className="w-full"
              />
            )}
          </div>
          {/* Observações */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Observações</label>
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {form.observacoes || "Nenhuma observação"}
              </div>
            ) : (
              <input
                type="text"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={form.observacoes || ""}
                onChange={e => setForm((f: typeof form) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Digite observações (opcional)"
              />
            )}
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

  // Modal Editar Agendamento
  const ModalEditarAgendamento = modalEditar && typeof window !== "undefined" && document.body && createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-[99998] bg-black bg-opacity-80 transition-opacity duration-300 ${modalEditar ? 'opacity-100' : 'opacity-0'}`}
      onClick={e => { if (e.target === e.currentTarget) fecharModalEditarAnimado(); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
          transform transition-all duration-300
          ${animandoEditar ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-10'}
          overflow-y-auto max-h-[90vh]`}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={fecharModalEditarAnimado}
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
            {(form.status === 'finalizado' || form.status === 'cancelado') && (
              <div className="text-sm mt-1">
                Este agendamento não pode ser modificado.
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleEditar} className="flex flex-col gap-4">
          {/* Unidade */}
          <div className="relative">
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {unidades.find(u => u.id === unidadeSelecionada)?.nome || "Unidade não definida"}
              </div>
            ) : (
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
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Unidade *</label>
          </div>
          {/* Serviço */}
          <div className="relative">
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {servicos.find(s => s.id === form.servicoId)?.nomeDoServico || "Serviço não definido"}
              </div>
            ) : (
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
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Serviço *</label>
          </div>
          {/* Profissional */}
          <div className="relative">
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {colaboradores.find(c => c.id === form.colaboradorId)?.nomeCompleto || "Profissional não definido"}
              </div>
            ) : (
              <>
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
              </>
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Profissional *</label>
          </div>
                      {/* Data */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Data *</label>
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {formatarDataExibicao(form.data)}
              </div>
            ) : (
              <input
                type="date"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={formatarDataInput(form.data)}
                onChange={e => setForm((f: typeof form) => ({ ...f, data: e.target.value, hora: "" }))}
                required
              />
            )}
          </div>
          {/* Horário */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Horário *</label>
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {form.hora || "Horário não definido"}
              </div>
            ) : (
              <>
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
              </>
            )}
            {/* Horário de término */}
            {form.hora && form.servicoId && (
              <div className="mt-2 text-sm text-black">
                <span className="font-semibold">Término previsto: </span>
                {(() => {
                  const servico = servicos.find(s => s.id === form.servicoId);
                  if (!servico) return "-";
                  const [h, m] = form.hora.split(":").map(Number);
                  if (isNaN(h) || isNaN(m)) return "-";
                  const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
                  const hFim = Math.floor(totalMin / 60);
                  const mFim = totalMin % 60;
                  return `${hFim.toString().padStart(2, "0")}:${mFim.toString().padStart(2, "0")}`;
                })()}
              </div>
            )}
          </div>
          {/* Cliente */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Cliente *</label>
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {clientes.find(c => c.id === form.clienteId)?.nomeCompleto || "Cliente não definido"}
              </div>
            ) : (
              <ClienteSearch
                onClienteSelect={(cliente) => setForm(f => ({ ...f, clienteId: cliente.id }))}
                selectedCliente={clientes.find(c => c.id === form.clienteId) || null}
                placeholder="Buscar cliente pelo nome..."
                className="w-full"
              />
            )}
          </div>
          {/* Observações */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Observações</label>
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {form.observacoes || "Nenhuma observação"}
              </div>
            ) : (
              <input
                type="text"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={form.observacoes || ""}
                onChange={e => setForm((f: typeof form) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Digite observações (opcional)"
              />
            )}
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
      setForm({ data: getHojeISO(), hora: "" });
    }
  }, [modalNovoOpen, form.data]);

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

  // Sempre que abrir o modal de novo agendamento (por botão), limpar o formulário
  useEffect(() => {
    if (modalNovoOpen) {
      limparFormulario();
    }
  }, [modalNovoOpen, limparFormulario]);

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
        selectable={true}
        select={aoClicarNoSlot} // <-- Corrige para usar select
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
        eventContent={(arg) => {
          const ag = arg.event.extendedProps as Agendamento;
          const servico = servicos.find(s => s.id === ag.servicoId);
          let horaFim = "";
          if (ag.hora && servico) {
            const [h, m] = ag.hora.split(":").map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
              const hFim = Math.floor(totalMin / 60);
              const mFim = totalMin % 60;
              horaFim = `${hFim.toString().padStart(2, "0")}:${mFim.toString().padStart(2, "0")}`;
            }
          }
          // Pega as cores do evento
          const bg = arg.event.backgroundColor || "#3b82f6";
          const border = arg.event.borderColor || "#2563eb";
          const color = "#fff";

          return {
            html: `
              <div style="
                background:${bg};
                /* border:2px solid ${border}; */
                border-radius:8px;
                color:${color};
                padding:2px 4px;
                font-size:13px;
                font-weight:bold;
                text-align:left;
                white-space:normal;
              ">
                ${ag.hora || ""}${horaFim ? ` - ${horaFim}` : ""}<br>
                <span style="font-weight:normal;font-size:12px;">${ag.servicoNome || ""} - ${ag.clienteNome || ""}</span>
              </div>
            `
          };
        }}
        dayMaxEventRows={3}
        moreLinkText={(num) => `+${num} mais`}
      />

      {ModalNovoAgendamento}
      {ModalEditarAgendamento}
    </div>
  );
}

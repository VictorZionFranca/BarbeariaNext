"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useState, useCallback, useEffect, useRef } from "react";
import { EventInput } from "@fullcalendar/core";
import {
  listarAgendamentos,
  criarAgendamento,
  atualizarAgendamento,
  cancelarAgendamento,
  marcarComoConcluido,
  Agendamento,
} from "../utils/firestoreAgendamentos";
import { listarClientes, Cliente } from "../utils/firestoreClientes";
import {
  listarColaboradores,
  Colaborador,
} from "../utils/firestoreColaboradores";
import { listarServicos, Servico } from "../utils/firestoreServicos";
import { createPortal } from "react-dom";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";
import ClienteSearch from "./ClienteSearch";
import {
  listarColaboradoresInformacoes,
  ColaboradorInformacoes,
} from "../utils/firestoreColaboradoresInformacoes";
import ModalNovoAgendamento from "./ModalNovoAgendamento";
import ModalEditarAgendamento from "./ModalEditarAgendamento";
import {
  formatarDataInput,
  getHojeISO,
  formatarDataExibicao,
} from "../utils/dataUtils";
import {
  colaboradorEstaDeFerias,
  colaboradorEstaDeFeriasNaData,
  getInfoFeriasColaborador,
  unidadeAbertaNoDia,
  horarioDentroFuncionamento,
} from "../utils/agendaUtils";
import { useHorariosDisponiveis } from "../hooks/useHorariosDisponiveis";
import { horarioEhFuturo } from "../utils/agendaUtils";

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

export default function Calendario({
  modalNovoAberto,
  setModalNovoAberto,
}: CalendarioProps) {
  const [eventos, setEventos] = useState<EventInput[]>([]);
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
  const [modalFechado, setModalFechado] = useState<{
    aberto: boolean;
    dia: string;
  }>({ aberto: false, dia: "" });
  const [colaboradoresInfo, setColaboradoresInfo] = useState<
    ColaboradorInformacoes[]
  >([]);
  // Adicionar estados de animação
  const [animandoNovo, setAnimandoNovo] = useState(false);
  const [animandoEditar, setAnimandoEditar] = useState(false);

  // Se receber controle externo, usa ele; senão, usa estado interno
  const modalNovoOpen =
    typeof modalNovoAberto === "boolean" ? modalNovoAberto : modalAberto;
  const setModalNovoOpen = setModalNovoAberto || setModalAberto;

  // Buscar listas para selects
  useEffect(() => {
    listarClientes().then(setClientes);
    listarColaboradores().then(setColaboradores);
    listarServicos().then((servs) =>
      setServicos(servs as (Servico & { id: string })[])
    );
    listarColaboradoresInformacoes().then(setColaboradoresInfo);
    setLoadingUnidades(true);
    listarUnidades().then((lista) => {
      setUnidades(lista.filter((u) => u.ativo));
      setLoadingUnidades(false);
    });
  }, []);

  // Buscar agendamentos do Firestore
  const buscarAgendamentos = useCallback(async () => {
    const lista = await listarAgendamentos();
    console.log("[LOG] Agendamentos do Firestore:", JSON.parse(JSON.stringify(lista)));
    setEventos(
      lista.map((ag) => {
        // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
        let dataFormatada = ag.data;
        if (ag.data.includes("T")) {
          dataFormatada = ag.data.split("T")[0];
        }
        // Calcular horário de término
        let horaFim = "";
        let status = ag.status;
        if (ag.hora && ag.servicoId) {
          const servico = servicos.find((s) => s.id === ag.servicoId);
          if (servico) {
            const [h, m] = ag.hora.split(":").map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
              const hFim = Math.floor(totalMin / 60);
              const mFim = totalMin % 60;
              horaFim = `${hFim.toString().padStart(2, "0")}:${mFim
                .toString()
                .padStart(2, "0")}`;

              // Verifica se já passou do horário de término e não está finalizado/cancelado
              if (status !== "finalizado" && status !== "cancelado") {
                const agora = new Date();
                const dataHoraFim = new Date(`${dataFormatada}T${horaFim}`);
                if (agora > dataHoraFim) {
                  status = "pendente";
                }
              }
            }
          }
        }
        // Padronizar exibição do horário
        let horarioPadrao = ag.hora || "";
        if (ag.hora && horaFim) {
          horarioPadrao = `${ag.hora} (Término previsto: ${horaFim})`;
        }
        return {
          id: ag.id,
          title: `${horarioPadrao}\n${ag.servicoNome} - ${ag.clienteNome}`,
          start: `${dataFormatada}T${ag.hora}`,
          extendedProps: { ...ag, status },
          backgroundColor:
            status === "cancelado"
              ? "#ef4444"
              : status === "finalizado"
              ? "#10b981"
              : status === "pendente"
              ? "#facc15"
              : "#3b82f6",
          borderColor:
            status === "cancelado"
              ? "#dc2626"
              : status === "finalizado"
              ? "#059669"
              : status === "pendente"
              ? "#eab308"
              : "#2563eb",
        };
      })
    );
  }, [servicos]);

  useEffect(() => {
    buscarAgendamentos();
  }, [buscarAgendamentos]);

  // Filtrar barbeiros ativos da unidade selecionada (excluindo os de férias)
  const barbeirosUnidade = colaboradores.filter(
    (c) =>
      c.unidadeNome ===
        unidades.find((u) => u.id === unidadeSelecionada)?.nome &&
      c.dataInativacao === null &&
      !colaboradorEstaDeFerias(colaboradoresInfo, c.id!)
  );

  // Filtrar serviços ativos
  const servicosAtivos = servicos.filter((s) => s.ativo);

  // Usar o hook para obter gerarHorariosDisponiveis
  const horariosDisponiveis = useHorariosDisponiveis({
    form,
    unidadeSelecionada,
    unidades,
    eventos: eventos as { extendedProps: Partial<Agendamento> }[],
    servicos,
  });

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
    const temHora =
      info.dateStr.includes("T") && info.dateStr.split("T")[1]?.length >= 5;
    const data = info.dateStr.split("T")[0];
    const hora = temHora ? info.dateStr.split("T")[1].slice(0, 5) : undefined;
    limparFormulario();
    setForm((f) => ({ ...f, data, hora }));
    setModalNovoOpen(true);
  };

  // Novo handler para clique em slot de horário
  const aoClicarNoSlot = (info: {
    start: Date;
    startStr: string;
    end: Date;
    endStr: string;
  }) => {
    // Para timeGridWeek e timeGridDay, o select traz o intervalo selecionado
    const data = info.startStr.split("T")[0];
    const hora = info.startStr.split("T")[1]?.slice(0, 5);
    limparFormulario();
    setForm((f) => ({ ...f, data, hora }));
    setModalNovoOpen(true);
  };

  // Abrir modal para editar agendamento
  const aoClicarEvento = (info: EventClickInfo) => {
    type AgendamentoComPendencia = Agendamento & { horaPendencia?: string };
    const ag = info.event.extendedProps as AgendamentoComPendencia;
    console.log("[LOG] Agendamento selecionado no clique:", JSON.parse(JSON.stringify(ag)));
    // Recalcular status (inclusive pendente)
    let status = ag.status;
    let horaFim = "";
    if (ag.hora && ag.servicoId) {
      const servico = servicos.find((s) => s.id === ag.servicoId);
      if (servico) {
        const [h, m] = ag.hora.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
          const hFim = Math.floor(totalMin / 60);
          const mFim = totalMin % 60;
          horaFim = `${hFim.toString().padStart(2, "0")}:${mFim.toString().padStart(2, "0")}`;
          if (status !== "finalizado" && status !== "cancelado") {
            const agora = new Date();
            const dataFormatada = ag.data.includes("T")
              ? ag.data.split("T")[0]
              : ag.data;
            const dataHoraFim = new Date(`${dataFormatada}T${horaFim}`);
            if (agora > dataHoraFim) {
              status = "pendente";
            }
          }
        }
      }
    }
    // Garantir que o campo hora está presente no form
    let horaFinal = "";
    if (ag.hora && ag.hora !== "") {
      horaFinal = ag.hora;
    } else if (ag.horaPendencia && ag.horaPendencia !== "") {
      horaFinal = ag.horaPendencia;
    } else {
      horaFinal = "";
    }
    const formParaModal = { ...ag, status, hora: horaFinal };
    console.log("[LOG] Formulário passado para o modal:", JSON.parse(JSON.stringify(formParaModal)));
    setForm(formParaModal);
    // Definir a unidade do agendamento
    const colaborador = colaboradores.find((c) => c.id === ag.colaboradorId);
    if (colaborador) {
      const unidade = unidades.find((u) => u.nome === colaborador.unidadeNome);
      if (unidade) {
        setUnidadeSelecionada(unidade.id);
      }
    }
    setErro("");
    setSucesso("");
    setModalEditar(true);
    // Debug: mostrar form no console
    setTimeout(() => { console.log('[LOG] Estado final do form no modal:', JSON.parse(JSON.stringify(formParaModal))); }, 0);
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
    if (colaboradorEstaDeFerias(colaboradoresInfo, form.colaboradorId)) {
      setErro(
        "Este profissional está de férias e não pode receber agendamentos!"
      );
      return;
    }

    if (!form.data) {
      setErro("Por favor, selecione uma data!");
      return;
    }

    // Verificar se o colaborador está de férias na data selecionada
    if (colaboradorEstaDeFeriasNaData(colaboradoresInfo, form.colaboradorId, form.data)) {
      setErro("Este profissional está de férias na data selecionada!");
      return;
    }

    if (!form.hora) {
      setErro("Por favor, selecione um horário!");
      return;
    }

    // Verificar se a unidade está aberta no dia selecionado
    const dataFormatada = formatarDataInput(form.data);
    if (!unidadeAbertaNoDia(unidades, unidadeSelecionada, dataFormatada)) {
      setErro("A unidade está fechada neste dia!");
      return;
    }

    // Verificar se o horário está dentro do funcionamento da unidade
    if (
      !horarioDentroFuncionamento(unidades, unidadeSelecionada, form.data || '', form.hora || '')
    ) {
      setErro(
        "O horário selecionado está fora do horário de funcionamento da unidade!"
      );
      return;
    }

    // Verifica conflito de horário
    if (
      await existeConflitoHorario({
        data: dataFormatada,
        hora: form.hora!,
        colaboradorId: form.colaboradorId!,
        servicoId: form.servicoId!,
      })
    ) {
      setErro("Já existe um agendamento para este colaborador neste horário!");
      return;
    }

    if (!horarioEhFuturo(form.data || '', form.hora || '')) {
      setErro("Não é possível agendar para horários passados!");
      return;
    }

    try {
      const cliente = clientes.find((c) => c.id === form.clienteId);
      const colaborador = colaboradores.find(
        (c) => c.id === form.colaboradorId
      );
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
    if (colaboradorEstaDeFerias(colaboradoresInfo, form.colaboradorId)) {
      setErro(
        "Este profissional está de férias e não pode receber agendamentos!"
      );
      return;
    }

    if (!form.data) {
      setErro("Por favor, selecione uma data!");
      return;
    }

    // Verificar se o horário está dentro do funcionamento da unidade
    if (
      !horarioDentroFuncionamento(unidades, unidadeSelecionada, form.data || '', form.hora || '')
    ) {
      setErro(
        "O horário selecionado está fora do horário de funcionamento da unidade!"
      );
      return;
    }

    // Verifica conflito de horário
    if (
      await existeConflitoHorario({
        data: form.data,
        hora: form.hora!,
        colaboradorId: form.colaboradorId!,
        servicoId: form.servicoId!,
        agendamentoId: form.id,
      })
    ) {
      setErro("Já existe um agendamento para este colaborador neste horário!");
      return;
    }

    if (!horarioEhFuturo(form.data || '', form.hora || '')) {
      setErro("Não é possível agendar para horários passados!");
      return;
    }

    try {
      const cliente = clientes.find((c) => c.id === form.clienteId);
      const colaborador = colaboradores.find(
        (c) => c.id === form.colaboradorId
      );
      const servico = servicos.find((s) => s.id === form.servicoId);

      // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
      let dataFormatada = form.data;
      if (form.data && form.data.includes("T")) {
        dataFormatada = form.data.split("T")[0];
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
  const existeConflitoHorario = useCallback(
    async ({
      data,
      hora,
      colaboradorId,
      servicoId,
      agendamentoId,
    }: {
      data: string;
      hora: string;
      colaboradorId: string;
      servicoId: string;
      agendamentoId?: string;
    }) => {
      if (!data || !hora || !colaboradorId || !servicoId) {
        console.warn("Dados incompletos para verificação de conflito:", {
          data,
          hora,
          colaboradorId,
          servicoId,
        });
        return false;
      }

      // Extrair apenas a data (YYYY-MM-DD) se estiver no formato com timezone
      let dataFormatada = data;
      if (data.includes("T")) {
        dataFormatada = data.split("T")[0];
      }

      // Validar formato da hora
      if (!hora.match(/^\d{2}:\d{2}$/)) {
        console.error("Formato de hora inválido:", hora);
        return false;
      }

      const servico = servicos.find(
        (s: Servico & { id: string }) => s.id === servicoId
      );
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
      if (
        isNaN(horaNovo) ||
        isNaN(minNovo) ||
        horaNovo < 0 ||
        horaNovo > 23 ||
        minNovo < 0 ||
        minNovo > 59
      ) {
        console.error("Valores de hora/minuto inválidos:", {
          horaNovo,
          minNovo,
        });
        return false;
      }

      const inicioNovo = horaNovo * 60 + minNovo;
      const fimNovo = inicioNovo + duracaoNovo;

      try {
        // Buscar todos os agendamentos ativos do colaborador na data
        const ags = await listarAgendamentos({
          data: dataFormatada,
          colaboradorId,
          status: "ativo",
        });

        for (const ag of ags) {
          // Pular o próprio agendamento se estiver editando
          if (agendamentoId && ag.id === agendamentoId) continue;

          // Validar formato da hora do agendamento existente
          if (!ag.hora || !ag.hora.match(/^\d{2}:\d{2}$/)) {
            console.warn(
              "Formato de hora inválido no agendamento existente:",
              ag.hora,
              "ID:",
              ag.id
            );
            continue;
          }

          const [horaExist, minExist] = ag.hora.split(":").map(Number);
          if (isNaN(horaExist) || isNaN(minExist)) {
            console.warn(
              "Valores de hora/minuto inválidos no agendamento existente:",
              { horaExist, minExist },
              "ID:",
              ag.id
            );
            continue;
          }

          const inicioExist = horaExist * 60 + minExist;

          // Buscar duração do serviço do agendamento existente
          const servicoExist = servicos.find(
            (s: Servico & { id: string }) => s.id === ag.servicoId
          );
          const duracaoExist = servicoExist
            ? servicoExist.duracaoEmMinutos
            : 30; // Fallback para 30 min
          const fimExist = inicioExist + duracaoExist;

          // Verificar sobreposição: se há conflito entre os horários
          // Conflito ocorre quando:
          // - O início do novo agendamento está dentro do agendamento existente, OU
          // - O fim do novo agendamento está dentro do agendamento existente, OU
          // - O novo agendamento engloba completamente o agendamento existente
          if (inicioNovo < fimExist && fimNovo > inicioExist) {
            console.log("Conflito detectado:", {
              novo: { inicio: inicioNovo, fim: fimNovo, hora: hora },
              existente: {
                inicio: inicioExist,
                fim: fimExist,
                hora: ag.hora,
                servico: ag.servicoNome,
              },
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
    },
    [servicos]
  );

  // Função para fechar modal com animação
  function fecharModalNovoAnimado() {
    setAnimandoNovo(false);
    setTimeout(() => setModalNovoOpen(false), 200);
  }
  function fecharModalEditarAnimado() {
    setAnimandoEditar(false);
    setTimeout(() => setModalEditar(false), 200);
  }  

  // Limpar formulário quando modal for aberto
  useEffect(() => {
    if (modalNovoOpen && (!form.data || form.data === "")) {
      setForm((f) => ({ ...f, data: getHojeISO() }));
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
      setForm((prev) => ({ ...prev }));
    }
  }, [form.colaboradorId, form.data, form.servicoId]);

  // Limpar horário quando mudar serviço para forçar recálculo
  useEffect(() => {
    if (modalNovoOpen) {
      if (form.servicoId && form.hora) {
        if (!horariosDisponiveis.includes(form.hora)) {
          setForm((prev) => ({ ...prev, hora: "" }));
        }
      }
    }
  }, [form.servicoId, form.hora, horariosDisponiveis, modalNovoOpen]);

  // Limpar colaborador quando mudar data e ele estiver de férias na nova data
  // Atenção: O ESLint exige 'colaboradoresInfo' como dependência, mas o React pode avisar sobre dependências variáveis.
  // Aqui priorizamos o linter para manter o projeto limpo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (modalNovoOpen) {
      if (
        form.colaboradorId &&
        form.data &&
        colaboradorEstaDeFeriasNaData(colaboradoresInfo, form.colaboradorId, form.data)
      ) {
        setForm((prev) => ({ ...prev, colaboradorId: "", hora: "" }));
      }
    }
  }, [form.data, form.colaboradorId, modalNovoOpen, colaboradoresInfo]);

  // Sempre que abrir o modal de novo agendamento (por botão), limpar o formulário
  useEffect(() => {
    if (modalNovoOpen) {
      limparFormulario();
    }
  }, [modalNovoOpen, limparFormulario]);

  // Adicionar animação ao abrir o modal de novo agendamento
  useEffect(() => {
    if (modalNovoOpen) {
      setAnimandoNovo(true);
    }
  }, [modalNovoOpen]);

  // Adicionar animação ao abrir o modal de edição de agendamento
  useEffect(() => {
    if (modalEditar) {
      setAnimandoEditar(true);
    }
  }, [modalEditar]);

  // Definir helpers locais para uso das funções importadas
  const unidadeAbertaNoDiaLocal = (unidadeId: string, data: string) => unidadeAbertaNoDia(unidades, unidadeId, data);
  const horarioDentroFuncionamentoLocal = (unidadeId: string, data: string, hora: string) => horarioDentroFuncionamento(unidades, unidadeId, data, hora);

  return (
    <div className="p-4 bg-white rounded shadow">
      {/* Modal de aviso de unidade fechada */}
      {modalFechado.aberto &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[99998] bg-black bg-opacity-80 transition-opacity duration-300"
            onClick={(e) => {
              if (e.target === e.currentTarget)
                setModalFechado({ aberto: false, dia: "" });
            }}
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
              <h2 className="text-2xl font-bold mb-6 text-center text-black">
                Unidade Fechada
              </h2>
              <p className="text-center text-black mb-8">
                A unidade está fechada neste dia.
                <br />
                Escolha outro dia para agendar.
              </p>
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
        )}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        events={eventos}
        dateClick={aoClicarNoDia}
        eventClick={aoClicarEvento}
        selectable={true}
        select={aoClicarNoSlot}
        navLinks={false}
        nowIndicator
        datesSet={buscarAgendamentos}
        viewDidMount={() => {}}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="20:30:00"
        slotLabelInterval="00:30:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        selectAllow={(info) => {
          if (!unidadeSelecionada) return false;
          const data = info.startStr.split("T")[0];
          const hora = info.startStr.split("T")[1]?.slice(0, 5);
          return (
            unidadeAbertaNoDiaLocal(unidadeSelecionada, data) &&
            horarioDentroFuncionamentoLocal(unidadeSelecionada, data, hora)
          );
        }}
        eventContent={(arg) => {
          const ag = arg.event.extendedProps as Agendamento;
          const servico = servicos.find((s) => s.id === ag.servicoId);
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
          // Padronizar exibição do horário
          let horarioPadrao = ag.hora || "";
          if (ag.hora && horaFim) {
            horarioPadrao = `${ag.hora} (Término previsto: ${horaFim})`;
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
                ${horarioPadrao}<br>
                <span style="font-weight:normal;font-size:12px;">
                  ${ag.servicoNome || ""} - ${ag.clienteNome || ""}
                </span>
              </div>
            `,
          };
        }}
        dayMaxEventRows={3}
        moreLinkText={(num) => `+${num} mais`}
        height="722px"
      />

      {modalNovoOpen && (
        <ModalNovoAgendamento
          form={form}
          setForm={setForm}
          unidades={unidades}
          unidadeSelecionada={unidadeSelecionada}
          setUnidadeSelecionada={setUnidadeSelecionada}
          servicos={servicos}
          colaboradores={colaboradores}
          clientes={clientes}
          servicosAtivos={servicosAtivos}
          barbeirosUnidade={barbeirosUnidade}
          gerarHorariosDisponiveis={() => horariosDisponiveis}
          unidadeAbertaNoDia={(unidadeId, data) => unidadeAbertaNoDiaLocal(unidadeId, data)}
          getInfoFeriasColaborador={(colaboradorId) => getInfoFeriasColaborador(colaboradoresInfo, colaboradorId)}
          handleSalvar={handleSalvar}
          modalNovoOpen={modalNovoOpen}
          setModalNovoOpen={setModalNovoOpen}
          erro={erro}
          sucesso={sucesso}
          loadingUnidades={loadingUnidades}
          animandoNovo={animandoNovo}
          fecharModalNovoAnimado={fecharModalNovoAnimado}
          ClienteSearch={ClienteSearch}
          formatarDataInput={formatarDataInput}
          getHojeISO={getHojeISO}
          colaboradorEstaDeFeriasNaData={(colaboradorId, data) => colaboradorEstaDeFeriasNaData(colaboradoresInfo, colaboradorId, data)}
        />
      )}
      {modalEditar && (
        <ModalEditarAgendamento
          form={form}
          setForm={setForm}
          unidades={unidades}
          unidadeSelecionada={unidadeSelecionada}
          setUnidadeSelecionada={setUnidadeSelecionada}
          servicos={servicos}
          colaboradores={colaboradores}
          clientes={clientes}
          servicosAtivos={servicosAtivos}
          barbeirosUnidade={barbeirosUnidade}
          gerarHorariosDisponiveis={() => horariosDisponiveis}
          unidadeAbertaNoDia={(unidadeId, data) => unidadeAbertaNoDiaLocal(unidadeId, data)}
          getInfoFeriasColaborador={(colaboradorId) => getInfoFeriasColaborador(colaboradoresInfo, colaboradorId)}
          handleEditar={handleEditar}
          handleCancelar={handleCancelar}
          handleConcluir={handleConcluir}
          modalEditar={modalEditar}
          setModalEditar={setModalEditar}
          erro={erro}
          sucesso={sucesso}
          loadingUnidades={loadingUnidades}
          animandoEditar={animandoEditar}
          fecharModalEditarAnimado={fecharModalEditarAnimado}
          ClienteSearch={ClienteSearch}
          formatarDataInput={formatarDataInput}
          formatarDataExibicao={formatarDataExibicao}
          colaboradorEstaDeFeriasNaData={(colaboradorId, data) => colaboradorEstaDeFeriasNaData(colaboradoresInfo, colaboradorId, data)}
        />
      )}
    </div>
  );
}

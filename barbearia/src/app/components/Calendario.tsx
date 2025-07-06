"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useState, useCallback, useEffect, useRef } from "react";
import { EventInput } from "@fullcalendar/core";
import { listarAgendamentos, criarAgendamento, atualizarAgendamento, cancelarAgendamento, Agendamento } from "../utils/firestoreAgendamentos";
import { listarClientes, Cliente } from "../utils/firestoreClientes";
import { listarColaboradores, Colaborador } from "../utils/firestoreColaboradores";
import { listarServicos, Servico } from "../utils/firestoreServicos";
import { createPortal } from "react-dom";
import { listarUnidades, Unidade } from "../utils/firestoreUnidades";

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

// Função utilitária para formatar hora para HH:mm
function formatarHoraInput(hora: string | undefined): string {
  if (!hora) return "";
  if (/^\d{2}:\d{2}$/.test(hora)) return hora;
  // Tenta converter de outros formatos
  if (/^\d{2}:\d{2}:\d{2}$/.test(hora)) return hora.slice(0, 5);
  return hora;
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
  const d = new Date(date);
  // getDay: 0 (domingo) até 6 (sábado)
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

  // Se receber controle externo, usa ele; senão, usa estado interno
  const modalNovoOpen = typeof modalNovoAberto === 'boolean' ? modalNovoAberto : modalAberto;
  const setModalNovoOpen = setModalNovoAberto || setModalAberto;

  // Buscar listas para selects
  useEffect(() => {
    listarClientes().then(setClientes);
    listarColaboradores().then(setColaboradores);
    listarServicos().then((servs) => setServicos(servs as (Servico & { id: string })[]));
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
      lista.map((ag) => ({
        id: ag.id,
        title: `${ag.servicoNome} - ${ag.clienteNome}`,
        start: `${ag.data}T${ag.hora}`,
        extendedProps: ag,
      }))
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

  // Filtrar barbeiros ativos da unidade selecionada
  const barbeirosUnidade = colaboradores.filter(c => c.unidadeNome === unidades.find(u => u.id === unidadeSelecionada)?.nome && c.dataInativacao === null);

  // Filtrar serviços ativos
  const servicosAtivos = servicos.filter(s => s.ativo);

  // Função para gerar horários disponíveis (considerando agenda do barbeiro e horários da unidade)
  function gerarHorariosDisponiveis() {
    if (!form.data || !form.colaboradorId || !unidadeSelecionada) return [];
    const unidade = unidades.find(u => u.id === unidadeSelecionada);
    if (!unidade) return [];
    const diaSemana = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"][new Date(form.data).getDay()];
    const horariosFuncionamento = unidade.horariosFuncionamento?.[diaSemana];
    if (!horariosFuncionamento || !horariosFuncionamento.aberto) return [];
    const horarios: string[] = [];
    const [hIni, mIni] = horariosFuncionamento.abertura.split(":").map(Number);
    const [hFim, mFim] = horariosFuncionamento.fechamento.split(":").map(Number);
    for (let h = hIni; h < hFim || (h === hFim && mIni < mFim); h++) {
      for (let m = (h === hIni ? mIni : 0); m < 60; m += 30) {
        if (h > hFim || (h === hFim && m >= mFim)) break;
        const hora = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
        horarios.push(hora);
      }
    }
    // Filtrar horários já ocupados pelo barbeiro
    // (simplificado: só horários do dia e barbeiro)
    const agsDia = eventos.filter(ev => ev.extendedProps && ev.extendedProps.colaboradorId === form.colaboradorId && ev.extendedProps.data === form.data);
    const ocupados = agsDia.map(ev => ev.extendedProps?.hora).filter(Boolean);
    return horarios.filter(h => !ocupados.includes(h));
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

  // Handler para clique em dia/slot
  const aoClicarNoDia = (info: DateClickInfo) => {
    if (!unidadeSelecionada) return;
    const data = info.dateStr;
    // Busca a unidade e verifica o funcionamento do dia
    const unidade = unidades.find(u => u.id === unidadeSelecionada);
    if (!unidade) return;
    const diaSemana = getDiaSemanaFirestore(data);
    const horariosFuncionamento = unidade.horariosFuncionamento?.[diaSemana];
    if (!horariosFuncionamento || horariosFuncionamento.aberto === false) {
      setModalFechado({ aberto: true, dia: data });
      return;
    }
    setForm(f => ({
      ...f,
      data,
      hora: "", // Limpa o campo de horário, será preenchido após selecionar profissional/serviço
    }));
    setErro("");
    setSucesso("");
    setModalNovoOpen(true);
  };

  // Abrir modal para editar agendamento
  const aoClicarEvento = (info: EventClickInfo) => {
    const ag = info.event.extendedProps as Agendamento;
    setForm({ ...ag });
    setErro("");
    setSucesso("");
    setModalEditar(true);
  };

  // Salvar novo agendamento
  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
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

  // Função utilitária para gerar opções de horários válidos
  function gerarHorariosValidos(servicoId: string | undefined) {
    const horarios: string[] = [];
    for (let h = 8; h < 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 12) continue;
        const hora = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        horarios.push(hora);
      }
    }
    if (servicoId) {
      const servico = servicos.find((s: Servico & { id: string }) => s.id === servicoId);
      if (servico) {
        const dur = servico.duracaoEmMinutos;
        return horarios.filter(horario => {
          const [h, m] = horario.split(":").map(Number);
          const inicio = h * 60 + m;
          const fim = inicio + dur;
          if (fim > 20 * 60) return false;
          if (inicio < 12 * 60 && fim > 12 * 60) return false;
          return true;
        });
      }
    }
    return horarios;
  }

  // Função para verificar conflito de horário
  async function existeConflitoHorario({ data, hora, colaboradorId, servicoId, agendamentoId }: { data: string, hora: string, colaboradorId: string, servicoId: string, agendamentoId?: string }) {
    if (!data || !hora || !colaboradorId || !servicoId) return false;
    const servico = servicos.find((s: Servico & { id: string }) => s.id === servicoId);
    if (!servico) return false;
    const dur = servico.duracaoEmMinutos;
    const inicioNovo = parseInt(hora.split(":")[0]) * 60 + parseInt(hora.split(":")[1]);
    const fimNovo = inicioNovo + dur;
    const ags = await listarAgendamentos({ data, colaboradorId, status: "ativo" });
    for (const ag of ags) {
      if (agendamentoId && ag.id === agendamentoId) continue;
      const inicioExist = parseInt(ag.hora.split(":")[0]) * 60 + parseInt(ag.hora.split(":")[1]);
      const servExist = servicos.find((s: Servico & { id: string }) => s.id === ag.servicoId);
      const durExist = servExist ? servExist.duracaoEmMinutos : 30;
      const fimExist = inicioExist + durExist;
      if (inicioNovo < fimExist && fimNovo > inicioExist) {
        return true;
      }
    }
    return false;
  }

  // Modal de Novo Agendamento
  const ModalNovoAgendamento = modalNovoOpen && typeof window !== "undefined" && document.body && createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300 ${modalNovoOpen ? 'opacity-100' : 'opacity-0'}`}
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
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={form.colaboradorId || ""}
              onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value, hora: "" }))}
              required
              disabled={!unidadeSelecionada}
            >
              <option value="">Selecione o profissional</option>
              {barbeirosUnidade.map(c => (
                <option key={c.id} value={c.id}>{c.nomeCompleto}</option>
              ))}
            </select>
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
              <select
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={form.hora || ""}
                onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                required
                disabled={!form.data || !form.colaboradorId || !unidadeSelecionada || gerarHorariosDisponiveis().length === 0}
              >
                <option value="">Selecione o horário</option>
                {gerarHorariosDisponiveis().map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">Unidade fechada neste dia</div>
            )}
          </div>
          {/* Cliente */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Cliente *</label>
            <input
              type="text"
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              placeholder="Buscar cliente pelo nome..."
              value={clientes.find(c => c.id === form.clienteId)?.nomeCompleto || ""}
              onChange={e => {
                const nome = e.target.value.toLowerCase();
                const clienteEncontrado = clientes.find(c => c.nomeCompleto.toLowerCase().includes(nome));
                setForm(f => ({ ...f, clienteId: clienteEncontrado ? clienteEncontrado.id : "" }));
              }}
              required
              autoComplete="off"
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
      className={`fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300 ${modalEditar ? 'opacity-100' : 'opacity-0'}`}
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
        <form onSubmit={handleEditar} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="date"
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
              value={formatarDataInput(form.data)}
              onChange={e => setForm((f: typeof form) => ({ ...f, data: e.target.value }))}
              required
              placeholder=" "
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
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
              value={formatarHoraInput(form.hora)}
              onChange={e => setForm((f: typeof form) => ({ ...f, hora: e.target.value }))}
              required
            >
              <option value="" disabled>Selecione o horário</option>
              {gerarHorariosValidos(form.servicoId).map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <label
              className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                peer-focus:-top-3 peer-focus:text-xs peer-focus:text-black
                peer-[&:not(:placeholder-shown)]:-top-3 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black"
            >
              Hora
            </label>
          </div>
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={form.clienteId}
              onChange={e => setForm((f: typeof form) => ({ ...f, clienteId: e.target.value }))}
              required
            >
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
            </select>
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Cliente</label>
          </div>
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={form.colaboradorId}
              onChange={e => setForm((f: typeof form) => ({ ...f, colaboradorId: e.target.value }))}
              required
            >
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
            </select>
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Colaborador</label>
          </div>
          <div className="relative">
            <select
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
              value={form.servicoId}
              onChange={e => setForm((f: typeof form) => ({ ...f, servicoId: e.target.value }))}
              required
            >
              {servicos.map(s => <option key={s.id} value={s.id}>{s.nomeDoServico}</option>)}
            </select>
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">Serviço</label>
          </div>
          <div className="relative">
            <input
              type="text"
              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black peer w-full"
              value={form.observacoes}
              onChange={e => setForm((f: typeof form) => ({ ...f, observacoes: e.target.value }))}
              placeholder=" "
            />
            <label className="absolute left-3 top-3 text-gray-500 bg-white px-1 transition-all duration-200 pointer-events-none">Observações</label>
          </div>
          {erro && <span className="text-red-500 text-center">{erro}</span>}
          {sucesso && <span className="text-green-600 text-center">{sucesso}</span>}
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
        </form>
        <button
          onClick={handleCancelar}
          className="mt-4 bg-red-600 hover:bg-red-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200 w-full"
        >
          Cancelar Agendamento
        </button>
      </div>
    </div>,
    document.body
  );

  // Limpar erro ao trocar unidade, data ou profissional
  useEffect(() => {
    setErro("");
  }, [unidadeSelecionada, form.data, form.colaboradorId]);

  return (
    <div className="p-4 bg-white rounded shadow">
      {/* Modal de aviso de unidade fechada */}
      {modalFechado.aberto && typeof window !== "undefined" && document.body &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-[99999] bg-black bg-opacity-80 transition-opacity duration-300"
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
        eventColor="#3b82f6"
        eventTextColor="#fff"
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

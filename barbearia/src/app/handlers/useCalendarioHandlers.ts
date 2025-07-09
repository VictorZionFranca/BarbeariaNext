import { Agendamento } from "../utils/firestoreAgendamentos";
import { Cliente } from "../utils/firestoreClientes";
import { Colaborador } from "../utils/firestoreColaboradores";
import { Servico } from "../utils/firestoreServicos";

interface UseCalendarioHandlersParams {
  form: Partial<Agendamento>;
  unidadeSelecionada: string;
  clientes: Cliente[];
  colaboradores: Colaborador[];
  servicos: (Servico & { id: string })[];
  setErro: (msg: string) => void;
  setSucesso: (msg: string) => void;
  setModalNovoOpen: (open: boolean) => void;
  setModalEditar: (open: boolean) => void;
  limparFormulario: () => void;
  buscarAgendamentos: () => Promise<void>;
  colaboradorEstaDeFerias: (colaboradorId: string) => boolean;
  colaboradorEstaDeFeriasNaData: (colaboradorId: string, data: string) => boolean;
  unidadeAbertaNoDia: (unidadeId: string, data: string) => boolean;
  horarioDentroFuncionamento: (unidadeId: string, data: string, hora: string) => boolean;
  existeConflitoHorario: (params: {
    data: string;
    hora: string;
    colaboradorId: string;
    servicoId: string;
    agendamentoId?: string;
  }) => Promise<boolean>;
  horarioEhFuturo: (data: string, hora: string) => boolean;
}

export function useCalendarioHandlers({
  form,
  unidadeSelecionada,
  clientes,
  colaboradores,
  servicos,
  setErro,
  setSucesso,
  setModalNovoOpen,
  setModalEditar,
  limparFormulario,
  buscarAgendamentos,
  colaboradorEstaDeFerias,
  colaboradorEstaDeFeriasNaData,
  unidadeAbertaNoDia,
  horarioDentroFuncionamento,
  existeConflitoHorario,
  horarioEhFuturo,
}: UseCalendarioHandlersParams) {
  async function handleSalvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");
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
    if (colaboradorEstaDeFerias(form.colaboradorId)) {
      setErro("Este profissional está de férias e não pode receber agendamentos!");
      return;
    }
    if (!form.data) {
      setErro("Por favor, selecione uma data!");
      return;
    }
    if (colaboradorEstaDeFeriasNaData(form.colaboradorId, form.data)) {
      setErro("Este profissional está de férias na data selecionada!");
      return;
    }
    if (!form.hora) {
      setErro("Por favor, selecione um horário!");
      return;
    }
    if (!unidadeAbertaNoDia(unidadeSelecionada, form.data)) {
      setErro("A unidade está fechada neste dia!");
      return;
    }
    if (!horarioDentroFuncionamento(unidadeSelecionada, form.data, form.hora)) {
      setErro("O horário selecionado está fora do horário de funcionamento da unidade!");
      return;
    }
    if (
      await existeConflitoHorario({
        data: form.data,
        hora: form.hora,
        colaboradorId: form.colaboradorId,
        servicoId: form.servicoId,
      })
    ) {
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
      await (await import("../utils/firestoreAgendamentos")).criarAgendamento({
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
  }

  async function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");
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
    if (colaboradorEstaDeFerias(form.colaboradorId)) {
      setErro("Este profissional está de férias e não pode receber agendamentos!");
      return;
    }
    if (!form.data) {
      setErro("Por favor, selecione uma data!");
      return;
    }
    if (colaboradorEstaDeFeriasNaData(form.colaboradorId, form.data)) {
      setErro("Este profissional está de férias na data selecionada!");
      return;
    }
    if (!form.hora) {
      setErro("Por favor, selecione um horário!");
      return;
    }
    if (!unidadeAbertaNoDia(unidadeSelecionada, form.data)) {
      setErro("A unidade está fechada neste dia!");
      return;
    }
    if (!horarioDentroFuncionamento(unidadeSelecionada, form.data, form.hora)) {
      setErro("O horário selecionado está fora do horário de funcionamento da unidade!");
      return;
    }
    if (
      await existeConflitoHorario({
        data: form.data,
        hora: form.hora,
        colaboradorId: form.colaboradorId,
        servicoId: form.servicoId,
        agendamentoId: form.id,
      })
    ) {
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
      await (await import("../utils/firestoreAgendamentos")).atualizarAgendamento(form.id!, {
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
  }

  async function handleCancelar() {
    setErro("");
    setSucesso("");
    try {
      await (await import("../utils/firestoreAgendamentos")).atualizarAgendamento(form.id!, {
        ...form,
        status: "cancelado"
      });
      setSucesso("Agendamento cancelado!");
      setModalEditar(false);
      buscarAgendamentos();
    } catch (err) {
      if (err instanceof Error) setErro(err.message);
      else setErro("Erro ao cancelar agendamento");
    }
  }

  async function handleConcluir() {
    setErro("");
    setSucesso("");
    try {
      await (await import("../utils/firestoreAgendamentos")).atualizarAgendamento(form.id!, {
        ...form,
        status: "finalizado"
      });
      setSucesso("Agendamento marcado como concluído!");
      setModalEditar(false);
      buscarAgendamentos();
    } catch (err) {
      if (err instanceof Error) setErro(err.message);
      else setErro("Erro ao marcar agendamento como concluído");
    }
  }

  return { handleSalvar, handleEditar, handleCancelar, handleConcluir };
} 
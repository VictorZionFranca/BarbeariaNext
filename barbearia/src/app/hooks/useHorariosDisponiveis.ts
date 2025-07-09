import { useMemo } from "react";
import { Agendamento } from "../utils/firestoreAgendamentos";
import { Unidade } from "../utils/firestoreUnidades";
import { Servico } from "../utils/firestoreServicos";

interface UseHorariosDisponiveisParams {
  form: Partial<Agendamento>;
  unidadeSelecionada: string;
  unidades: Unidade[];
  eventos: { extendedProps: Partial<Agendamento> }[];
  servicos: (Servico & { id: string })[];
  agendamentoId?: string;
}

export function useHorariosDisponiveis({
  form,
  unidadeSelecionada,
  unidades,
  eventos,
  servicos,
  agendamentoId,
}: UseHorariosDisponiveisParams): string[] {
  return useMemo(() => {
    if (!form.data || !form.colaboradorId || !unidadeSelecionada) return [];
    const unidade = unidades.find((u) => u.id === unidadeSelecionada);
    if (!unidade) return [];
    const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    let dataLimpa = form.data;
    if (form.data.includes("T")) dataLimpa = form.data.split("T")[0];
    const [ano, mes, dia] = dataLimpa.split("-").map(Number);
    const d = new Date(ano, mes - 1, dia);
    const diaSemana = dias[d.getDay()];
    const horariosFuncionamento = unidade.horariosFuncionamento?.[diaSemana];
    if (!horariosFuncionamento || !horariosFuncionamento.aberto) return [];
    const horarios: string[] = [];
    const [hIni, mIni] = horariosFuncionamento.abertura.split(":").map(Number);
    const [hFim, mFim] = horariosFuncionamento.fechamento.split(":").map(Number);
    if (isNaN(hIni) || isNaN(mIni) || isNaN(hFim) || isNaN(mFim)) return [];
    const intervaloInicio = horariosFuncionamento.intervaloInicio
      ? horariosFuncionamento.intervaloInicio.split(":").map(Number)
      : null;
    const intervaloFim = horariosFuncionamento.intervaloFim
      ? horariosFuncionamento.intervaloFim.split(":").map(Number)
      : null;
    const hoje = new Date();
    const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const dataSelecionada = dataLimpa;
    const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();
    for (let h = hIni; h < hFim || (h === hFim && mIni < mFim); h++) {
      for (let m = h === hIni ? mIni : 0; m < 60; m += 30) {
        if (h > hFim || (h === hFim && m >= mFim)) break;
        if (
          intervaloInicio &&
          intervaloFim &&
          !isNaN(intervaloInicio[0]) &&
          !isNaN(intervaloFim[0])
        ) {
          const minutosAtual = h * 60 + m;
          const minutosIntervaloInicio = intervaloInicio[0] * 60 + intervaloInicio[1];
          const minutosIntervaloFim = intervaloFim[0] * 60 + intervaloFim[1];
          if (minutosAtual >= minutosIntervaloInicio && minutosAtual < minutosIntervaloFim) {
            continue;
          }
        }
        if (dataSelecionada === hojeISO) {
          const minutosHorario = h * 60 + m;
          if (minutosHorario <= minutosAgora) continue;
        }
        const hora = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        horarios.push(hora);
      }
    }
    const agsDia = eventos.filter((ev) => {
      const ag = ev.extendedProps as Agendamento;
      if (!ag) return false;
      if (ag.colaboradorId !== form.colaboradorId) return false;
      let dataEvento = ag.data;
      if (ag.data && ag.data.includes("T")) {
        dataEvento = ag.data.split("T")[0];
      }
      let dataForm = form.data;
      if (form.data && form.data.includes("T")) {
        dataForm = form.data.split("T")[0];
      }
      return dataEvento === dataForm && ag.status === "ativo";
    });
    return horarios.filter((horario) => {
      if (!horario || typeof horario !== "string" || !horario.match(/^\d{2}:\d{2}$/)) return false;
      const [h, m] = horario.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return false;
      const inicioHorario = h * 60 + m;
      if (form.servicoId) {
        const servico = servicos.find((s) => s.id === form.servicoId);
        if (!servico) return false;
        const duracaoServico = servico.duracaoEmMinutos;
        if (!duracaoServico || duracaoServico <= 0) return false;
        const fimHorario = inicioHorario + duracaoServico;
        const minutosFechamento = hFim * 60 + mFim;
        if (fimHorario > minutosFechamento) return false;
      }
      for (const ag of agsDia) {
        const agProps = ag.extendedProps;
        if (agendamentoId && agProps.id === agendamentoId) continue;
        if (!agProps.hora || !agProps.hora.match(/^\d{2}:\d{2}$/)) continue;
        const [hAg, mAg] = agProps.hora.split(":").map(Number);
        if (isNaN(hAg) || isNaN(mAg)) continue;
        const inicioAg = hAg * 60 + mAg;
        const servicoAg = servicos.find((s) => s.id === agProps.servicoId);
        const duracaoAg = servicoAg ? servicoAg.duracaoEmMinutos : 30;
        const fimAg = inicioAg + duracaoAg;
        if (form.servicoId) {
          const servico = servicos.find((s) => s.id === form.servicoId);
          if (!servico) return false;
          const duracaoServico = servico.duracaoEmMinutos;
          if (!duracaoServico || duracaoServico <= 0) return false;
          const fimHorario = inicioHorario + duracaoServico;
          if (inicioHorario < fimAg && fimHorario > inicioAg) {
            return false;
          }
        } else {
          if (inicioHorario >= inicioAg && inicioHorario < fimAg) {
            return false;
          }
        }
      }
      return true;
    });
  }, [form, unidadeSelecionada, unidades, eventos, servicos, agendamentoId]);
} 
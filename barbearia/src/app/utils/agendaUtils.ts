import { Unidade } from "./firestoreUnidades";
import { ColaboradorInformacoes } from "./firestoreColaboradoresInformacoes";

// Verifica se o horário é futuro
export function horarioEhFuturo(data: string, hora: string): boolean {
  if (!data || !hora) return false;
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  const hojeISO = `${ano}-${mes}-${dia}`;
  const dataSelecionada = data;
  if (dataSelecionada > hojeISO) return true;
  if (dataSelecionada < hojeISO) return false;
  const agora = new Date();
  const [h, m] = hora.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  const minutosHorario = h * 60 + m;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  return minutosHorario > minutosAgora;
}

// Verifica se a unidade está aberta no dia selecionado
export function unidadeAbertaNoDia(unidades: Unidade[], unidadeId: string, data: string): boolean {
  if (!unidadeId || !data) return false;
  const unidade = unidades.find((u) => u.id === unidadeId);
  if (!unidade) return false;
  const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  let dataLimpa = data;
  if (data.includes("T")) dataLimpa = data.split("T")[0];
  const [ano, mes, dia] = dataLimpa.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  const diaSemana = dias[d.getDay()];
  const horariosFuncionamento = unidade.horariosFuncionamento?.[diaSemana];
  return !!(horariosFuncionamento && horariosFuncionamento.aberto);
}

// Verifica se o horário está dentro do funcionamento da unidade
export function horarioDentroFuncionamento(unidades: Unidade[], unidadeId: string, data: string, hora: string): boolean {
  if (!unidadeId || !data || !hora) return false;
  const unidade = unidades.find((u) => u.id === unidadeId);
  if (!unidade) return false;
  const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  let dataLimpa = data;
  if (data.includes("T")) dataLimpa = data.split("T")[0];
  const [ano, mes, dia] = dataLimpa.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  const diaSemana = dias[d.getDay()];
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

// Verifica se o colaborador está de férias hoje
export function colaboradorEstaDeFerias(colaboradoresInfo: ColaboradorInformacoes[], colaboradorId: string): boolean {
  const info = colaboradoresInfo.find((i) => i.pessoaId === colaboradorId);
  if (!info || !info.periodoFeriasInicio || !info.periodoFeriasFim) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let inicio: Date, fim: Date;
  if (typeof info.periodoFeriasInicio === "object" && "toDate" in info.periodoFeriasInicio) {
    inicio = (info.periodoFeriasInicio as { toDate: () => Date }).toDate();
  } else {
    inicio = new Date(info.periodoFeriasInicio as string | Date);
  }
  if (typeof info.periodoFeriasFim === "object" && "toDate" in info.periodoFeriasFim) {
    fim = (info.periodoFeriasFim as { toDate: () => Date }).toDate();
  } else {
    fim = new Date(info.periodoFeriasFim as string | Date);
  }
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  return hoje >= inicio && hoje <= fim;
}

// Verifica se o colaborador está de férias em uma data específica
export function colaboradorEstaDeFeriasNaData(colaboradoresInfo: ColaboradorInformacoes[], colaboradorId: string, data: string): boolean {
  const info = colaboradoresInfo.find((i) => i.pessoaId === colaboradorId);
  if (!info || !info.periodoFeriasInicio || !info.periodoFeriasFim) return false;
  const dataVerificar = new Date(data);
  dataVerificar.setHours(0, 0, 0, 0);
  let inicio: Date, fim: Date;
  if (typeof info.periodoFeriasInicio === "object" && "toDate" in info.periodoFeriasInicio) {
    inicio = (info.periodoFeriasInicio as { toDate: () => Date }).toDate();
  } else {
    inicio = new Date(info.periodoFeriasInicio as string | Date);
  }
  if (typeof info.periodoFeriasFim === "object" && "toDate" in info.periodoFeriasFim) {
    fim = (info.periodoFeriasFim as { toDate: () => Date }).toDate();
  } else {
    fim = new Date(info.periodoFeriasFim as string | Date);
  }
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  return dataVerificar >= inicio && dataVerificar <= fim;
}

// Retorna informações de férias do colaborador
export function getInfoFeriasColaborador(colaboradoresInfo: ColaboradorInformacoes[], colaboradorId: string): string {
  const info = colaboradoresInfo.find((i) => i.pessoaId === colaboradorId);
  if (!info || !info.periodoFeriasInicio || !info.periodoFeriasFim) return "";
  let inicio: Date, fim: Date;
  if (typeof info.periodoFeriasInicio === "object" && "toDate" in info.periodoFeriasInicio) {
    inicio = (info.periodoFeriasInicio as { toDate: () => Date }).toDate();
  } else {
    inicio = new Date(info.periodoFeriasInicio as string | Date);
  }
  if (typeof info.periodoFeriasFim === "object" && "toDate" in info.periodoFeriasFim) {
    fim = (info.periodoFeriasFim as { toDate: () => Date }).toDate();
  } else {
    fim = new Date(info.periodoFeriasFim as string | Date);
  }
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  if (hoje >= inicio && hoje <= fim) {
    return ` (DE FÉRIAS até ${fim.toLocaleDateString("pt-BR")})`;
  } else if (hoje < inicio) {
    return ` (Férias de ${inicio.toLocaleDateString("pt-BR")}` +
      ` até ${fim.toLocaleDateString("pt-BR")})`;
  }
  return "";
} 
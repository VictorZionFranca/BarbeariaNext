// Função utilitária para formatar data para YYYY-MM-DD
export function formatarDataInput(data: string | undefined): string {
  if (!data) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split("/");
    return `${ano}-${mes}-${dia}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split("-");
    return `${ano}-${mes}-${dia}`;
  }
  try {
    const d = new Date(data);
    if (!isNaN(d.getTime())) {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const dia = String(d.getDate()).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    }
  } catch (error) {
    console.warn("Erro ao converter data:", data, error);
  }
  return "";
}

// Função utilitária para garantir formato YYYY-MM-DD local
export function getHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Função para formatar data para exibição (DD/MM/YYYY)
export function formatarDataExibicao(data: string | undefined): string {
  if (!data) return "Data não definida";
  let dataLimpa = data;
  if (data.includes("T")) {
    dataLimpa = data.split("T")[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    const [ano, mes, dia] = dataLimpa.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataLimpa)) {
    return dataLimpa;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dataLimpa)) {
    const [dia, mes, ano] = dataLimpa.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return "Data inválida";
}

// Função para obter o nome do dia da semana no padrão dos horários da unidade
export function getDiaSemanaFirestore(date: string) {
  const dias = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ];
  let dataLimpa = date;
  if (date.includes("T")) {
    dataLimpa = date.split("T")[0];
  }
  const [ano, mes, dia] = dataLimpa.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  return dias[d.getDay()];
} 
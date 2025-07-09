import { createPortal } from "react-dom";
import React from "react";
import { Agendamento } from "../utils/firestoreAgendamentos";
import { Unidade } from "../utils/firestoreUnidades";
import { Servico } from "../utils/firestoreServicos";
import { Colaborador } from "../utils/firestoreColaboradores";
import { Cliente } from "../utils/firestoreClientes";

function ModalEditarAgendamento({
  form,
  setForm,
  unidades,
  unidadeSelecionada,
  setUnidadeSelecionada,
  servicos,
  colaboradores,
  clientes,
  servicosAtivos,
  barbeirosUnidade,
  gerarHorariosDisponiveis,
  unidadeAbertaNoDia,
  colaboradorEstaDeFeriasNaData,
  getInfoFeriasColaborador,
  handleEditar,
  handleCancelar,
  handleConcluir,
  modalEditar,
  setModalEditar,
  erro,
  sucesso,
  loadingUnidades,
  animandoEditar,
  fecharModalEditarAnimado,
  ClienteSearch,
  formatarDataInput,
  formatarDataExibicao,
}: {
  form: Partial<Agendamento> & { horaPendencia?: string };
  setForm: React.Dispatch<React.SetStateAction<Partial<Agendamento>>>;
  unidades: Unidade[];
  unidadeSelecionada: string;
  setUnidadeSelecionada: (id: string) => void;
  servicos: (Servico & { id: string })[];
  colaboradores: Colaborador[];
  clientes: Cliente[];
  servicosAtivos: (Servico & { id: string })[];
  barbeirosUnidade: Colaborador[];
  gerarHorariosDisponiveis: () => string[];
  unidadeAbertaNoDia: (unidadeId: string, data: string) => boolean;
  colaboradorEstaDeFeriasNaData: (
    colaboradorId: string,
    data: string
  ) => boolean;
  getInfoFeriasColaborador: (colaboradorId: string) => string;
  handleEditar: (e: React.FormEvent<HTMLFormElement>) => void;
  handleCancelar: () => void;
  handleConcluir: () => void;
  modalEditar: boolean;
  setModalEditar: (open: boolean) => void;
  erro: string;
  sucesso: string;
  loadingUnidades: boolean;
  animandoEditar: boolean;
  fecharModalEditarAnimado: () => void;
  ClienteSearch: React.ComponentType<{
    onClienteSelect: (cliente: Cliente) => void;
    selectedCliente: Cliente | null;
    placeholder?: string;
    className?: string;
  }>;
  formatarDataInput: (data: string | undefined) => string;
  formatarDataExibicao: (data: string | undefined) => string;
}) {
  // Debug: mostrar form ao renderizar o modal
  console.log('ModalEditarAgendamento', form);

  if (!modalEditar || typeof window === "undefined" || !document.body)
    return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-[99998] bg-black bg-opacity-80 transition-opacity duration-300 ${
        modalEditar ? "opacity-100" : "opacity-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) fecharModalEditarAnimado();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 relative
          transform transition-all duration-300
          ${
            animandoEditar
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-10"
          }
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
        <h2 className="text-2xl font-bold mb-6 text-center text-black">
          Editar Agendamento
        </h2>
        {/* Status do agendamento */}
        {form.status && (
          <div
            className={`text-center p-3 rounded-lg mb-4 ${
              form.status === "finalizado"
                ? "bg-green-100 text-green-800"
                : form.status === "cancelado"
                ? "bg-red-100 text-red-800"
                : form.status === "pendente"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            <strong>Status:</strong>{" "}
            {form.status === "finalizado"
              ? "Finalizado"
              : form.status === "cancelado"
              ? "Cancelado"
              : form.status === "pendente"
              ? "Pendente"
              : "Ativo"}
            {(form.status === "finalizado" ||
              form.status === "cancelado" ||
              form.status === "pendente") && (
              <div className="text-sm mt-1">
                Este agendamento não pode ser modificado.
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleEditar} className="flex flex-col gap-4">
          {/* Unidade */}
          <div className="relative">
            {form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente" ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {unidades.find((u) => u.id === unidadeSelecionada)?.nome ||
                  "Unidade não definida"}
              </div>
            ) : (
              <select
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={unidadeSelecionada}
                onChange={(e) => setUnidadeSelecionada(e.target.value)}
                required
                disabled={loadingUnidades}
              >
                <option value="">Selecione a unidade</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">
              Unidade *
            </label>
          </div>
          {/* Serviço */}
          <div className="relative">
            {form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente" ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {servicos.find((s) => s.id === form.servicoId)?.nomeDoServico ||
                  "Serviço não definido"}
              </div>
            ) : (
              <select
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={form.servicoId || ""}
                onChange={(e) =>
                  setForm((f: Partial<Agendamento>) => ({
                    ...f,
                    servicoId: e.target.value,
                  }))
                }
                required
              >
                <option value="">Selecione o serviço</option>
                {servicosAtivos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeDoServico}
                  </option>
                ))}
              </select>
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">
              Serviço *
            </label>
          </div>
          {/* Profissional */}
          <div className="relative">
            {form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente" ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {colaboradores.find((c) => c.id === form.colaboradorId)
                  ?.nomeCompleto || "Profissional não definido"}
              </div>
            ) : (
              <>
                {unidadeSelecionada ? (
                  barbeirosUnidade.length > 0 ? (
                    <select
                      className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                      value={form.colaboradorId || ""}
                      onChange={(e) =>
                        setForm((f: Partial<Agendamento>) => ({
                          ...f,
                          colaboradorId: e.target.value,
                          hora: "",
                        }))
                      }
                      required
                      disabled={loadingUnidades}
                    >
                      <option value="">Selecione o profissional</option>
                      {barbeirosUnidade.map((c: Colaborador) => {
                        const infoFerias = getInfoFeriasColaborador(c.id!);
                        const estaDeFeriasNaData = form.data
                          ? colaboradorEstaDeFeriasNaData(c.id!, form.data)
                          : false;
                        const textoFerias = estaDeFeriasNaData
                          ? ` (DE FÉRIAS em ${form.data})`
                          : infoFerias;
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
                      Não há profissionais disponíveis nesta unidade (alguns
                      podem estar de férias)
                    </div>
                  )
                ) : (
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                    Selecione uma unidade primeiro
                  </div>
                )}
              </>
            )}
            <label className="absolute left-3 -top-3 text-xs text-black bg-white px-1">
              Profissional *
            </label>
          </div>
          {/* Data */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">
              Data *
            </label>
            {form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente" ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {formatarDataExibicao(form.data)}
              </div>
            ) : (
              <input
                type="date"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={formatarDataInput(form.data)}
                onChange={(e) =>
                  setForm((f: Partial<Agendamento>) => ({
                    ...f,
                    data: e.target.value,
                    hora: "",
                  }))
                }
                required
              />
            )}
          </div>
          {/* Horário */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">
              Horário *
            </label>
            {form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente" ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {/* Sempre mostrar o campo hora (ou horaPendencia se não houver hora) e o término previsto */}
                {(form.hora && form.hora !== "") || (form.horaPendencia && form.horaPendencia !== "") ? (
                  (() => {
                    const horaBase = form.hora && form.hora !== "" ? form.hora : form.horaPendencia;
                    const servico = servicos.find((s) => s.id === form.servicoId);
                    let terminoPrevisto = "-";
                    if (servico && horaBase) {
                      const [h, m] = horaBase.split(":").map(Number);
                      if (!isNaN(h) && !isNaN(m)) {
                        const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
                        const hFim = Math.floor(totalMin / 60);
                        const mFim = totalMin % 60;
                        terminoPrevisto = `${hFim.toString().padStart(2, "0")}:${mFim.toString().padStart(2, "0")}`;
                      }
                    }
                    return (
                      <>
                        {horaBase}
                        {servico && (
                          <span className="ml-2 text-xs text-gray-600">
                            (Término previsto: {terminoPrevisto})
                          </span>
                        )}
                      </>
                    );
                  })()
                ) : (
                  "Horário não definido"
                )}
              </div>
            ) : (
              <>
                {unidadeSelecionada &&
                form.data &&
                unidadeAbertaNoDia(unidadeSelecionada, form.data) ? (
                  <>
                    {form.colaboradorId && form.servicoId ? (
                      (() => {
                        const horarios = gerarHorariosDisponiveis();
                        if (form.hora && !horarios.includes(form.hora)) {
                          horarios.unshift(form.hora);
                        }
                        return (
                          <>
                            <select
                              className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                              value={form.hora || ""}
                              onChange={(e) =>
                                setForm((f: Partial<Agendamento>) => ({
                                  ...f,
                                  hora: e.target.value,
                                }))
                              }
                              required
                            >
                              <option value="">Selecione o horário</option>
                              {horarios.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            {/* Exibe apenas o término previsto, se houver */}
                            {form.hora && form.servicoId && (
                              <div className="mt-2 text-xs text-gray-600">
                                (Término previsto: {(() => {
                                  const servico = servicos.find((s) => s.id === form.servicoId);
                                  if (!servico) return "-";
                                  const [h, m] = form.hora!.split(":").map(Number);
                                  if (isNaN(h) || isNaN(m)) return "-";
                                  const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
                                  const hFim = Math.floor(totalMin / 60);
                                  const mFim = totalMin % 60;
                                  return `${hFim.toString().padStart(2, "0")}:${mFim.toString().padStart(2, "0")}`;
                                })()})
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {horarios.length} horário(s)
                              disponível(is)
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                        Selecione um profissional e serviço primeiro
                      </div>
                    )}
                  </>
                ) : unidadeSelecionada && form.data ? (
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                    Unidade fechada neste dia
                  </div>
                ) : (
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 select-none cursor-not-allowed">
                    {!unidadeSelecionada
                      ? "Selecione uma unidade primeiro"
                      : "Selecione uma data primeiro"}
                  </div>
                )}
              </>
            )}
          </div>
          {/* Cliente */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">
              Cliente *
            </label>
            {form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente" ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {clientes.find((c) => c.id === form.clienteId)?.nomeCompleto ||
                  "Cliente não definido"}
              </div>
            ) : (
              <ClienteSearch
                onClienteSelect={(cliente: Cliente) =>
                  setForm((f: Partial<Agendamento>) => ({
                    ...f,
                    clienteId: cliente.id,
                  }))
                }
                selectedCliente={
                  clientes.find((c) => c.id === form.clienteId) || null
                }
                placeholder="Buscar cliente pelo nome..."
                className="w-full"
              />
            )}
          </div>
          {/* Observações */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">
              Observações
            </label>
            {form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente" ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {form.observacoes || "Nenhuma observação"}
              </div>
            ) : (
              <input
                type="text"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
                value={form.observacoes || ""}
                onChange={(e) =>
                  setForm((f: Partial<Agendamento>) => ({
                    ...f,
                    observacoes: e.target.value,
                  }))
                }
                placeholder="Digite observações (opcional)"
              />
            )}
          </div>
          {erro && <span className="text-red-500 text-center">{erro}</span>}
          {sucesso && (
            <span className="text-green-600 text-center">{sucesso}</span>
          )}
          {/* Botões de ação apenas para agendamentos ativos */}
          {form.status !== "finalizado" &&
            form.status !== "cancelado" &&
            form.status !== "pendente" && (
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
          {/* Botão de fechar para agendamentos finalizados/cancelados/pendentes */}
          {(form.status === "finalizado" ||
            form.status === "cancelado" ||
            form.status === "pendente") && (
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
        {/* Ações do Agendamento apenas para agendamentos pendentes */}
        {form.status === "pendente" && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-black mb-4 text-center">
              Ações do Agendamento
            </h3>
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
}

export default ModalEditarAgendamento;

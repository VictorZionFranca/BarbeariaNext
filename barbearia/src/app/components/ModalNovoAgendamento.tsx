import { createPortal } from "react-dom";
import React from "react";
import { Agendamento } from "../utils/firestoreAgendamentos";
import { Unidade } from "../utils/firestoreUnidades";
import { Servico } from "../utils/firestoreServicos";
import { Colaborador } from "../utils/firestoreColaboradores";
import { Cliente } from "../utils/firestoreClientes";

interface ModalNovoAgendamentoProps {
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
  colaboradorEstaDeFeriasNaData: (colaboradorId: string, data: string) => boolean;
  getInfoFeriasColaborador: (colaboradorId: string) => string;
  handleSalvar: (e: React.FormEvent<HTMLFormElement>) => void;
  modalNovoOpen: boolean;
  setModalNovoOpen: (open: boolean) => void;
  erro: string;
  sucesso: string;
  loadingUnidades: boolean;
  animandoNovo: boolean;
  fecharModalNovoAnimado: () => void;
  ClienteSearch: React.ComponentType<{
    onClienteSelect: (cliente: Cliente) => void;
    selectedCliente: Cliente | null;
    placeholder?: string;
    className?: string;
  }>;
  formatarDataInput: (data: string | undefined) => string;
  getHojeISO: () => string;
}

const ModalNovoAgendamento: React.FC<ModalNovoAgendamentoProps> = ({
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
  handleSalvar,
  modalNovoOpen,
  setModalNovoOpen,
  erro,
  sucesso,
  loadingUnidades,
  animandoNovo,
  fecharModalNovoAnimado,
  ClienteSearch,
  formatarDataInput,
  getHojeISO
}) => {
  if (!modalNovoOpen || typeof window === "undefined" || !document.body) return null;

  return createPortal(
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
                {unidades.map((u: Unidade) => (
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
                onChange={e => setForm((f: Partial<Agendamento>) => ({ ...f, servicoId: e.target.value }))}
                required
              >
                <option value="">Selecione o serviço</option>
                {servicosAtivos.map((s: Servico & { id: string }) => (
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
                      onChange={e => setForm((f: Partial<Agendamento>) => ({ ...f, colaboradorId: e.target.value, hora: "" }))}
                      required
                      disabled={loadingUnidades}
                    >
                      <option value="">Selecione o profissional</option>
                      {barbeirosUnidade.map((c: Colaborador) => {
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
                setForm((f: Partial<Agendamento>) => ({ ...f, data: e.target.value, hora: "" }));
              }}
              required
              min={getHojeISO()}
            />
          </div>
          {/* Horário */}
          <div className="relative">
            <label className="block mb-1 text-xs text-black font-semibold">Horário *</label>
            {(form.status === 'finalizado' || form.status === 'cancelado') ? (
              <div className="border border-gray-300 p-3 rounded-lg bg-gray-100 text-black w-full">
                {(form.hora && form.hora !== "") || (form.horaPendencia && form.horaPendencia !== "") ? (
                  <>
                    {form.hora && form.hora !== "" ? form.hora : form.horaPendencia}
                    {form.servicoId && (
                      <span className="ml-2 text-xs text-gray-600">
                        (Término previsto: {(() => {
                          const servico = servicos.find((s) => s.id === form.servicoId);
                          const horaBase = form.hora && form.hora !== "" ? form.hora : form.horaPendencia;
                          if (!servico || !horaBase) return "-";
                          const [h, m] = horaBase.split(":").map(Number);
                          if (isNaN(h) || isNaN(m)) return "-";
                          const totalMin = h * 60 + m + (servico.duracaoEmMinutos || 0);
                          const hFim = Math.floor(totalMin / 60);
                          const mFim = totalMin % 60;
                          return `${hFim.toString().padStart(2, "0")}:${mFim.toString().padStart(2, "0")}`;
                        })()})
                      </span>
                    )}
                  </>
                ) : (
                  "Horário não definido"
                )}
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
                            onChange={e => setForm((f: Partial<Agendamento>) => ({ ...f, hora: e.target.value }))}
                            required
                          >
                            <option value="">Selecione o horário</option>
                            {gerarHorariosDisponiveis().map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          {/* Exibe o horário selecionado e término previsto, se houver */}
                          {form.hora && (
                            <div className="mt-2 text-sm text-black">
                              {form.hora}
                              {form.servicoId && (
                                <span className="ml-2 text-xs text-gray-600">
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
                                </span>
                              )}
                            </div>
                          )}
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
                onClienteSelect={(cliente: Cliente) => setForm((f: Partial<Agendamento>) => ({ ...f, clienteId: cliente.id }))}
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
                onChange={e => setForm((f: Partial<Agendamento>) => ({ ...f, observacoes: e.target.value }))}
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
};

export default ModalNovoAgendamento; 
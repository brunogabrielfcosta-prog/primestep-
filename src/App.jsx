import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Plus, Trash2, Pencil, X, TrendingUp, TrendingDown, Wallet, Check, Clock, Download, Upload, Calendar } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Conexão com o banco de dados da Prime Step (Supabase).
// A chave abaixo é a chave pública ("anon"), feita para ser usada no navegador.
const SUPABASE_URL = "https://gwqbzquvjodwtzebbxra.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cWJ6cXV2am9kd3R6ZWJieHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTI4NDAsImV4cCI6MjEwMzc2ODg0MH0.6bUPgnOO0SxmW0ilhZK85KFO2vls5QkCxg-BLRt-vMs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');`;

const CATALOGO_SERVICOS = [
  {
    nome: "Higienização Prime",
    valor: 65,
    descricao: "Limpeza profunda do cabedal, entressola e cadarços com produtos especializados e escovas próprias para cada material.",
  },
  {
    nome: "Blindagem Protetora",
    valor: 25,
    descricao: "Impermeabilização que cria uma barreira contra água, poeira e manchas do uso diário.",
  },
  {
    nome: "Restauração Prime",
    valor: 120,
    descricao: "Recuperação de solado amarelado, reparos no couro/camurça e retoques de pintura para devolver a aparência original.",
  },
  {
    nome: "Taxa de Entrega",
    valor: 15,
    descricao: "Busca e/ou entrega do par na casa do cliente. Valor base — ajuste conforme a distância.",
  },
];

const CATEGORIAS_DESPESA = ["Produtos e insumos", "Aluguel", "Salários", "Marketing", "Impostos", "Equipamentos", "Outros"];

const PLANOS_ASSINATURA = [
  {
    id: "basic",
    nome: "Basic",
    valor: 80,
    tagline: "Cuide do essencial.",
    itens: ["1 Cleaning Simple por mês", "1 Impermeabilização por mês", "Condições especiais em serviços adicionais"],
  },
  {
    id: "prime",
    nome: "Prime",
    valor: 115,
    tagline: "Eleve o cuidado.",
    destaque: true,
    itens: ["2 Cleaning Simple por mês", "1 Impermeabilização por mês", "Shoebag Prime de brinde", "Condições especiais em serviços adicionais"],
  },
  {
    id: "black",
    nome: "Black",
    valor: 249.99,
    tagline: "O cuidado completo.",
    itens: ["3 Cleaning Simple por mês", "1 Restauração por mês", "Prioridade na agenda", "Retirada e entrega inclusas"],
  },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_EXT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// Etapas do fluxo operacional: do recebimento do tênis até a liberação para entrega.
const ETAPAS_PEDIDO = [
  { id: "fotos_antes", label: "Fotos do antes", color: "#8A8375" },
  { id: "higienizacao", label: "Higienização", color: "#5B7A8C" },
  { id: "secagem", label: "Secagem", color: "#C7A96B" },
  { id: "acabamento", label: "Acabamento", color: "#A24632" },
  { id: "fotos_depois", label: "Fotos do depois", color: "#6B7A8F" },
  { id: "liberado", label: "Liberado p/ entrega", color: "#4B6552" },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatBRL(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBR(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ---------- Banco de dados (Supabase) ----------
// Converte uma linha do banco de volta para o formato que o app usa.
function rowToVenda(row) {
  return {
    id: row.id, data: row.data, cliente: row.cliente, status: row.status, itens: row.itens || [], valor: Number(row.valor),
    assinaturaId: row.assinatura_id || null, mesReferencia: row.mes_referencia || null,
  };
}
function rowToDespesa(row) {
  return { id: row.id, data: row.data, descricao: row.descricao, categoria: row.categoria, valor: Number(row.valor) };
}
function rowToAssinatura(row) {
  return {
    id: row.id, cliente: row.cliente, planoId: row.plano_id, planoNome: row.plano_nome,
    valorMensal: Number(row.valor_mensal), diaCobranca: row.dia_cobranca, dataInicio: row.data_inicio, status: row.status,
  };
}
function rowToPedido(row) {
  return {
    id: row.id, cliente: row.cliente, tenis: row.tenis, dataEntrada: row.data_entrada,
    etapa: row.etapa, observacoes: row.observacoes || "", dataEntrega: row.data_entrega || null,
  };
}

async function loadVendas() {
  const { data, error } = await supabase.from("vendas").select("*").order("data", { ascending: false });
  if (error) {
    console.error("Erro ao carregar vendas", error);
    return [];
  }
  return (data || []).map(rowToVenda);
}
async function loadDespesas() {
  const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false });
  if (error) {
    console.error("Erro ao carregar despesas", error);
    return [];
  }
  return (data || []).map(rowToDespesa);
}
async function loadAssinaturas() {
  const { data, error } = await supabase.from("assinaturas").select("*").order("cliente", { ascending: true });
  if (error) {
    console.error("Erro ao carregar assinaturas", error);
    return [];
  }
  return (data || []).map(rowToAssinatura);
}
async function loadPedidos() {
  const { data, error } = await supabase.from("pedidos").select("*").order("data_entrada", { ascending: false });
  if (error) {
    console.error("Erro ao carregar pedidos", error);
    return [];
  }
  return (data || []).map(rowToPedido);
}
async function upsertVenda(v) {
  const { error } = await supabase.from("vendas").upsert({
    id: v.id, data: v.data, cliente: v.cliente, status: v.status, itens: v.itens, valor: v.valor,
    assinatura_id: v.assinaturaId || null, mes_referencia: v.mesReferencia || null,
  });
  if (error) console.error("Erro ao salvar venda", error);
}
async function deleteVendaRow(id) {
  const { error } = await supabase.from("vendas").delete().eq("id", id);
  if (error) console.error("Erro ao excluir venda", error);
}
async function upsertDespesa(d) {
  const { error } = await supabase.from("despesas").upsert({
    id: d.id, data: d.data, descricao: d.descricao, categoria: d.categoria, valor: d.valor,
  });
  if (error) console.error("Erro ao salvar despesa", error);
}
async function deleteDespesaRow(id) {
  const { error } = await supabase.from("despesas").delete().eq("id", id);
  if (error) console.error("Erro ao excluir despesa", error);
}
async function upsertAssinatura(a) {
  const { error } = await supabase.from("assinaturas").upsert({
    id: a.id, cliente: a.cliente, plano_id: a.planoId, plano_nome: a.planoNome,
    valor_mensal: a.valorMensal, dia_cobranca: a.diaCobranca, data_inicio: a.dataInicio, status: a.status,
  });
  if (error) console.error("Erro ao salvar assinatura", error);
}
async function deleteAssinaturaRow(id) {
  const { error } = await supabase.from("assinaturas").delete().eq("id", id);
  if (error) console.error("Erro ao excluir assinatura", error);
}
async function upsertPedido(p) {
  const { error } = await supabase.from("pedidos").upsert({
    id: p.id, cliente: p.cliente, tenis: p.tenis, data_entrada: p.dataEntrada,
    etapa: p.etapa, observacoes: p.observacoes, data_entrega: p.dataEntrega || null,
  });
  if (error) console.error("Erro ao salvar pedido", error);
}
async function deletePedidoRow(id) {
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) console.error("Erro ao excluir pedido", error);
}

// ---------- Small UI atoms ----------
function LedgerCard({ children, style }) {
  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--paper-line)",
        borderRadius: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  const toneColor = tone === "up" ? "var(--green)" : tone === "down" ? "var(--rust)" : "var(--ink)";
  const Icon = icon;
  return (
    <LedgerCard style={{ padding: "18px 20px", flex: 1, minWidth: 180 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
          {label}
        </span>
        <Icon size={16} color={toneColor} strokeWidth={2.25} />
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: toneColor, letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </LedgerCard>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontFamily: "Inter, sans-serif" }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  padding: "9px 11px",
  borderRadius: 5,
  border: "1px solid var(--paper-line)",
  background: "#FFFDF8",
  color: "var(--ink)",
  outline: "none",
};

// ---------- Modal form for Venda / Despesa ----------
function novoItemServico() {
  return { itemId: uid(), sel: CATALOGO_SERVICOS[0].nome, servico: CATALOGO_SERVICOS[0].nome, precoUnit: String(CATALOGO_SERVICOS[0].valor), quantidade: 1 };
}

function EntryModal({ type, initial, onSave, onClose }) {
  const isVenda = type === "venda";
  const [data, setData] = useState(initial?.data || todayStr());
  const [nome, setNome] = useState(isVenda ? initial?.cliente || "" : initial?.descricao || "");
  const [categoria, setCategoria] = useState(initial?.categoria || CATEGORIAS_DESPESA[0]);
  const [status, setStatus] = useState(initial?.status || "pago");
  const [valor, setValor] = useState(initial?.valor != null ? String(initial.valor) : "");
  const [itens, setItens] = useState(() => {
    if (!isVenda) return [];
    const source = initial?.itens?.length ? initial.itens : initial?.servico ? [{ servico: initial.servico, valor: initial.valor }] : null;
    if (!source) return [novoItemServico()];
    return source.map((it) => {
      const match = CATALOGO_SERVICOS.find((s) => s.nome === it.servico);
      const qtd = it.quantidade || 1;
      const precoUnit = qtd ? Number(it.valor) / qtd : it.valor;
      return { itemId: uid(), sel: match ? match.nome : "custom", servico: it.servico, precoUnit: String(precoUnit), quantidade: qtd };
    });
  });
  const [error, setError] = useState("");

  function itemSubtotal(it) {
    const preco = parseFloat(String(it.precoUnit).replace(",", ".")) || 0;
    const qtd = parseInt(it.quantidade, 10) || 0;
    return preco * qtd;
  }
  const total = itens.reduce((s, it) => s + itemSubtotal(it), 0);

  function updateItem(itemId, patch) {
    setItens((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, ...patch } : it)));
  }
  function handleItemServicoChange(itemId, nomeSel) {
    if (nomeSel === "custom") {
      updateItem(itemId, { sel: "custom", servico: "" });
    } else {
      const item = CATALOGO_SERVICOS.find((s) => s.nome === nomeSel);
      updateItem(itemId, { sel: nomeSel, servico: item.nome, precoUnit: String(item.valor) });
    }
  }
  function addItem() {
    setItens((prev) => [...prev, novoItemServico()]);
  }
  function removeItem(itemId) {
    setItens((prev) => (prev.length > 1 ? prev.filter((it) => it.itemId !== itemId) : prev));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) {
      setError(isVenda ? "Informe o cliente." : "Informe a descrição.");
      return;
    }
    if (isVenda) {
      for (const it of itens) {
        if (it.sel === "custom" && !it.servico.trim()) {
          setError("Informe o nome de todos os serviços adicionados.");
          return;
        }
        if (itemSubtotal(it) <= 0) {
          setError("Informe um valor e quantidade válidos para cada serviço.");
          return;
        }
      }
      const itensClean = itens.map((it) => ({
        servico: it.servico.trim(),
        quantidade: parseInt(it.quantidade, 10) || 1,
        valor: itemSubtotal(it),
      }));
      const totalClean = itensClean.reduce((s, it) => s + it.valor, 0);
      onSave({ id: initial?.id || uid(), data, cliente: nome.trim(), status, itens: itensClean, valor: totalClean });
    } else {
      const v = parseFloat(String(valor).replace(",", "."));
      if (!v || v <= 0) {
        setError("Informe um valor válido.");
        return;
      }
      onSave({ id: initial?.id || uid(), data, valor: v, descricao: nome.trim(), categoria });
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              {initial ? "Editar" : "Novo"} {isVenda ? "registro de venda" : "registro de despesa"}
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Data">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
            </Field>
            <Field label={isVenda ? "Cliente" : "Descrição"}>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={isVenda ? "Nome do cliente" : "Ex.: Conta de energia"}
                style={inputStyle}
              />
            </Field>

            {isVenda ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)" }}>
                    Serviços
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {itens.map((it, idx) => (
                      <div key={it.itemId} style={{ border: "1px solid var(--paper-line)", borderRadius: 5, padding: 10, display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                        {itens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(it.itemId)}
                            title="Remover serviço"
                            style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 3 }}
                          >
                            <X size={14} />
                          </button>
                        )}
                        <select value={it.sel} onChange={(e) => handleItemServicoChange(it.itemId, e.target.value)} style={{ ...inputStyle, paddingRight: 26 }}>
                          {CATALOGO_SERVICOS.map((s) => (
                            <option key={s.nome} value={s.nome}>{s.nome} — {formatBRL(s.valor)}</option>
                          ))}
                          <option value="custom">Outro (personalizado)</option>
                        </select>
                        {it.sel !== "custom" ? (
                          <span style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>
                            {CATALOGO_SERVICOS.find((s) => s.nome === it.sel)?.descricao}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={it.servico}
                            onChange={(e) => updateItem(it.itemId, { servico: e.target.value })}
                            placeholder="Nome do serviço"
                            style={inputStyle}
                          />
                        )}
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "42%" }}>
                            <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Valor unitário</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={it.precoUnit}
                              onChange={(e) => updateItem(it.itemId, { precoUnit: e.target.value })}
                              placeholder="0,00"
                              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Qtd.</span>
                            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--paper-line)", borderRadius: 5, overflow: "hidden" }}>
                              <button
                                type="button"
                                onClick={() => updateItem(it.itemId, { quantidade: Math.max(1, (parseInt(it.quantidade, 10) || 1) - 1) })}
                                style={{ border: "none", background: "#FFFDF8", width: 28, height: 34, cursor: "pointer", color: "var(--ink)", fontWeight: 700 }}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={it.quantidade}
                                onChange={(e) => updateItem(it.itemId, { quantidade: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                style={{ ...inputStyle, border: "none", borderLeft: "1px solid var(--paper-line)", borderRight: "1px solid var(--paper-line)", borderRadius: 0, width: 44, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}
                              />
                              <button
                                type="button"
                                onClick={() => updateItem(it.itemId, { quantidade: (parseInt(it.quantidade, 10) || 1) + 1 })}
                                style={{ border: "none", background: "#FFFDF8", width: 28, height: 34, cursor: "pointer", color: "var(--ink)", fontWeight: 700 }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div style={{ flex: 1, textAlign: "right" }}>
                            <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>Subtotal</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14.5, color: "var(--green)" }}>
                              {formatBRL(itemSubtotal(it))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 2,
                      background: "none", border: "1px dashed var(--paper-line)", borderRadius: 5, padding: "7px 10px",
                      color: "var(--ink)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
                    }}
                  >
                    <Plus size={13} /> Adicionar serviço
                  </button>
                </div>

                <Field label="Status do pagamento">
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </Field>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: "1px solid var(--paper-line)" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Total da venda
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: "var(--green)" }}>
                    {formatBRL(total)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Field label="Categoria">
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
                    {CATEGORIAS_DESPESA.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Valor (R$)">
                  <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
                </Field>
              </>
            )}

            {error && <div style={{ color: "var(--rust)", fontSize: 12.5, fontFamily: "Inter, sans-serif" }}>{error}</div>}
            <button
              type="submit"
              style={{
                marginTop: 6, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif",
                fontWeight: 600, fontSize: 13.5, letterSpacing: "0.02em",
              }}
            >
              Salvar registro
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal de Assinatura ----------
function AssinaturaModal({ initial, onSave, onClose }) {
  const [cliente, setCliente] = useState(initial?.cliente || "");
  const [planoId, setPlanoId] = useState(initial?.planoId || PLANOS_ASSINATURA[0].id);
  const planoAtual = PLANOS_ASSINATURA.find((p) => p.id === planoId);
  const [valorMensal, setValorMensal] = useState(initial?.valorMensal != null ? String(initial.valorMensal) : String(PLANOS_ASSINATURA[0].valor));
  const [diaCobranca, setDiaCobranca] = useState(initial?.diaCobranca || 5);
  const [dataInicio, setDataInicio] = useState(initial?.dataInicio || todayStr());
  const [status, setStatus] = useState(initial?.status || "ativa");
  const [error, setError] = useState("");

  function handlePlanoChange(id) {
    setPlanoId(id);
    const p = PLANOS_ASSINATURA.find((pl) => pl.id === id);
    if (p) setValorMensal(String(p.valor));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!cliente.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    const v = parseFloat(String(valorMensal).replace(",", "."));
    if (!v || v <= 0) {
      setError("Informe um valor mensal válido.");
      return;
    }
    const dia = parseInt(diaCobranca, 10);
    if (!dia || dia < 1 || dia > 28) {
      setError("O dia de cobrança deve ser entre 1 e 28.");
      return;
    }
    onSave({
      id: initial?.id || uid(),
      cliente: cliente.trim(),
      planoId,
      planoNome: planoAtual?.nome || "Personalizado",
      valorMensal: v,
      diaCobranca: dia,
      dataInicio,
      status,
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              {initial ? "Editar" : "Nova"} assinatura
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Cliente">
              <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" style={inputStyle} />
            </Field>

            <Field label="Plano">
              <select value={planoId} onChange={(e) => handlePlanoChange(e.target.value)} style={inputStyle}>
                {PLANOS_ASSINATURA.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} — {formatBRL(p.valor)}/mês</option>
                ))}
              </select>
            </Field>
            {planoAtual && (
              <ul style={{ margin: "-4px 0 0", padding: "0 0 0 18px", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
                {planoAtual.itens.map((it) => <li key={it}>{it}</li>)}
              </ul>
            )}

            <Field label="Valor mensal (R$)">
              <input type="text" inputMode="decimal" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>

            <Field label="Dia de cobrança (todo mês)">
              <input type="number" min={1} max={28} value={diaCobranca} onChange={(e) => setDiaCobranca(e.target.value)} style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>

            <Field label="Início da assinatura">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>

            {error && <div style={{ color: "var(--rust)", fontSize: 12.5, fontFamily: "Inter, sans-serif" }}>{error}</div>}
            <button
              type="submit"
              style={{
                marginTop: 6, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif",
                fontWeight: 600, fontSize: 13.5, letterSpacing: "0.02em",
              }}
            >
              Salvar assinatura
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal de Pedido (fluxo operacional) ----------
function PedidoModal({ initial, onSave, onClose }) {
  const [cliente, setCliente] = useState(initial?.cliente || "");
  const [tenis, setTenis] = useState(initial?.tenis || "");
  const [dataEntrada, setDataEntrada] = useState(initial?.dataEntrada || todayStr());
  const [etapa, setEtapa] = useState(initial?.etapa || ETAPAS_PEDIDO[0].id);
  const [observacoes, setObservacoes] = useState(initial?.observacoes || "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!cliente.trim()) {
      setError("Informe o cliente.");
      return;
    }
    if (!tenis.trim()) {
      setError("Informe o modelo do tênis.");
      return;
    }
    onSave({
      id: initial?.id || uid(),
      cliente: cliente.trim(),
      tenis: tenis.trim(),
      dataEntrada,
      etapa,
      observacoes: observacoes.trim(),
      dataEntrega: etapa === "liberado" ? (initial?.dataEntrega || todayStr()) : null,
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              {initial ? "Editar" : "Novo"} par em processo
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Cliente">
              <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" style={inputStyle} />
            </Field>
            <Field label="Tênis (modelo)">
              <input type="text" value={tenis} onChange={(e) => setTenis(e.target.value)} placeholder="Ex.: Nike Air Force 1 branco" style={inputStyle} />
            </Field>
            <Field label="Data de entrada">
              <input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Etapa atual">
              <select value={etapa} onChange={(e) => setEtapa(e.target.value)} style={inputStyle}>
                {ETAPAS_PEDIDO.map((et) => (
                  <option key={et.id} value={et.id}>{et.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Observações">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes do estado do par, combinados com o cliente, etc."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "Inter, sans-serif" }}
              />
            </Field>

            {error && <div style={{ color: "var(--rust)", fontSize: 12.5, fontFamily: "Inter, sans-serif" }}>{error}</div>}
            <button
              type="submit"
              style={{
                marginTop: 6, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif",
                fontWeight: 600, fontSize: 13.5, letterSpacing: "0.02em",
              }}
            >
              Salvar pedido
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal de detalhe do dia (calendário) ----------
function DayDetailModal({ iso, vendasDoDia, onEdit, onDelete, onAddNew, onClose }) {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const total = vendasDoDia.reduce((s, v) => s + Number(v.valor || 0), 0);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "85vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
                {DIAS_SEMANA_EXT[dow]}
              </h3>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                {formatDateBR(iso)}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {vendasDoDia.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--paper-line)", marginBottom: 8 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                {vendasDoDia.length} venda{vendasDoDia.length > 1 ? "s" : ""} nesse dia
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>
                {formatBRL(total)}
              </span>
            </div>
          )}

          {vendasDoDia.length === 0 ? (
            <div style={{ padding: "20px 4px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
              Nenhuma venda registrada nesse dia.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {vendasDoDia.map((v) => (
                <div key={v.id} style={{ border: "1px solid var(--paper-line)", borderRadius: 6, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--ink)" }}>{v.cliente}</strong>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                      {(v.itens?.length
                        ? v.itens.map((i) => (i.quantidade > 1 ? `${i.servico} (x${i.quantidade})` : i.servico))
                        : v.servico
                        ? [v.servico]
                        : []
                      ).join(", ")}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 11, fontWeight: 600, color: v.status === "pago" ? "var(--green)" : "var(--rust)" }}>
                      {v.status === "pago" ? <Check size={11} /> : <Clock size={11} />}
                      {v.status === "pago" ? "Pago" : "Pendente"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13.5, color: "var(--green)" }}>{formatBRL(v.valor)}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => onEdit(v)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(v.id)} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 2 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onAddNew}
            style={{
              marginTop: 16, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer",
              background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif",
              fontWeight: 600, fontSize: 13.5, letterSpacing: "0.02em",
            }}
          >
            <Plus size={15} /> Registrar venda nesse dia
          </button>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Ledger row list ----------
function LedgerRow({ children, onEdit, onDelete }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr 110px 90px",
        gap: 10,
        alignItems: "center",
        padding: "12px 6px",
        borderBottom: "1px solid var(--paper-line)",
        fontFamily: "Inter, sans-serif",
        fontSize: 13.5,
      }}
    >
      {children}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button onClick={onEdit} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 4 }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ControleFinanceiro() {
  const [vendas, setVendas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [assinaturas, setAssinaturas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null); // {type: 'venda'|'despesa'|'assinatura'|'pedido', initial?}
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  useEffect(() => {
    (async () => {
      const [v, d, a, p] = await Promise.all([loadVendas(), loadDespesas(), loadAssinaturas(), loadPedidos()]);
      setVendas(v);
      setDespesas(d);
      setAssinaturas(a);
      setPedidos(p);
      setLoading(false);
    })();
  }, []);

  // Atualiza a tela na hora (otimista) e salva no banco em seguida.
  const persistVendas = useCallback((list, changed) => {
    setVendas(list);
    if (changed?.type === "upsert") upsertVenda(changed.item);
    if (changed?.type === "delete") deleteVendaRow(changed.id);
  }, []);
  const persistDespesas = useCallback((list, changed) => {
    setDespesas(list);
    if (changed?.type === "upsert") upsertDespesa(changed.item);
    if (changed?.type === "delete") deleteDespesaRow(changed.id);
  }, []);
  const persistAssinaturas = useCallback((list, changed) => {
    setAssinaturas(list);
    if (changed?.type === "upsert") upsertAssinatura(changed.item);
    if (changed?.type === "delete") deleteAssinaturaRow(changed.id);
  }, []);
  const persistPedidos = useCallback((list, changed) => {
    setPedidos(list);
    if (changed?.type === "upsert") upsertPedido(changed.item);
    if (changed?.type === "delete") deletePedidoRow(changed.id);
  }, []);

  const [importMsg, setImportMsg] = useState("");

  function handleExport() {
    const payload = { app: "primestep-controle-financeiro", exportadoEm: new Date().toISOString(), vendas, despesas, assinaturas };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `primestep-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const v = Array.isArray(parsed.vendas) ? parsed.vendas : null;
        const d = Array.isArray(parsed.despesas) ? parsed.despesas : null;
        const a = Array.isArray(parsed.assinaturas) ? parsed.assinaturas : [];
        if (!v || !d) throw new Error("formato inválido");
        const ok = window.confirm(
          `Este backup tem ${v.length} venda(s), ${d.length} despesa(s) e ${a.length} assinatura(s).\nIsso vai SUBSTITUIR os dados atuais (${vendas.length} venda(s), ${despesas.length} despesa(s), ${assinaturas.length} assinatura(s)). Continuar?`
        );
        if (!ok) return;
        // Apaga tudo que existe hoje e grava o backup inteiro no banco.
        await Promise.all(vendas.map((old) => deleteVendaRow(old.id)));
        await Promise.all(despesas.map((old) => deleteDespesaRow(old.id)));
        await Promise.all(assinaturas.map((old) => deleteAssinaturaRow(old.id)));
        await Promise.all(v.map((item) => upsertVenda(item)));
        await Promise.all(d.map((item) => upsertDespesa(item)));
        await Promise.all(a.map((item) => upsertAssinatura(item)));
        setVendas(v);
        setDespesas(d);
        setAssinaturas(a);
        setImportMsg("Backup restaurado com sucesso.");
        setTimeout(() => setImportMsg(""), 4000);
      } catch (err) {
        setImportMsg("Não foi possível ler este arquivo. Verifique se é um backup válido.");
        setTimeout(() => setImportMsg(""), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleSaveEntry(entry) {
    if (modal.type === "venda") {
      const exists = vendas.some((v) => v.id === entry.id);
      persistVendas(exists ? vendas.map((v) => (v.id === entry.id ? entry : v)) : [entry, ...vendas], { type: "upsert", item: entry });
    } else if (modal.type === "despesa") {
      const exists = despesas.some((d) => d.id === entry.id);
      persistDespesas(exists ? despesas.map((d) => (d.id === entry.id ? entry : d)) : [entry, ...despesas], { type: "upsert", item: entry });
    } else if (modal.type === "assinatura") {
      const exists = assinaturas.some((a) => a.id === entry.id);
      persistAssinaturas(exists ? assinaturas.map((a) => (a.id === entry.id ? entry : a)) : [entry, ...assinaturas], { type: "upsert", item: entry });
    } else if (modal.type === "pedido") {
      const exists = pedidos.some((p) => p.id === entry.id);
      persistPedidos(exists ? pedidos.map((p) => (p.id === entry.id ? entry : p)) : [entry, ...pedidos], { type: "upsert", item: entry });
    }
    setModal(null);
  }

  function deleteVenda(id) {
    persistVendas(vendas.filter((v) => v.id !== id), { type: "delete", id });
  }
  function deleteDespesa(id) {
    persistDespesas(despesas.filter((d) => d.id !== id), { type: "delete", id });
  }
  function deleteAssinatura(id) {
    persistAssinaturas(assinaturas.filter((a) => a.id !== id), { type: "delete", id });
  }
  function deletePedido(id) {
    persistPedidos(pedidos.filter((p) => p.id !== id), { type: "delete", id });
  }
  function moverEtapaPedido(pedido, novaEtapaId) {
    const atualizado = { ...pedido, etapa: novaEtapaId, dataEntrega: novaEtapaId === "liberado" ? todayStr() : null };
    persistPedidos(pedidos.map((p) => (p.id === pedido.id ? atualizado : p)), { type: "upsert", item: atualizado });
  }

  // Verifica se a cobrança de uma assinatura já foi registrada em determinado mês (YYYY-MM).
  function cobrancaDoMes(assinaturaId, mesKey) {
    return vendas.find((v) => v.assinaturaId === assinaturaId && v.mesReferencia === mesKey);
  }

  function handleRegistrarCobranca(sub) {
    const mesKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (cobrancaDoMes(sub.id, mesKey)) return;
    const entry = {
      id: uid(),
      data: todayStr(),
      cliente: sub.cliente,
      status: "pago",
      itens: [{ servico: `Assinatura ${sub.planoNome}`, quantidade: 1, valor: sub.valorMensal }],
      valor: sub.valorMensal,
      assinaturaId: sub.id,
      mesReferencia: mesKey,
    };
    persistVendas([entry, ...vendas], { type: "upsert", item: entry });
  }

  const vendasMes = useMemo(() => vendas.filter((v) => v.data?.startsWith(monthFilter)), [vendas, monthFilter]);
  const despesasMes = useMemo(() => despesas.filter((d) => d.data?.startsWith(monthFilter)), [despesas, monthFilter]);

  const totalReceitas = vendasMes.reduce((s, v) => s + Number(v.valor || 0), 0);
  const totalDespesas = despesasMes.reduce((s, d) => s + Number(d.valor || 0), 0);
  const saldo = totalReceitas - totalDespesas;
  const pendentes = vendasMes.filter((v) => v.status === "pendente").reduce((s, v) => s + Number(v.valor || 0), 0);

  const chartData = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const receita = vendas.filter((v) => v.data?.startsWith(key)).reduce((s, v) => s + Number(v.valor || 0), 0);
      const despesa = despesas.filter((v) => v.data?.startsWith(key)).reduce((s, v) => s + Number(v.valor || 0), 0);
      arr.push({ mes: MESES[d.getMonth()], receita, despesa });
    }
    return arr;
  }, [vendas, despesas]);

  const monthOptions = useMemo(() => {
    const set = new Set();
    [...vendas, ...despesas].forEach((e) => e.data && set.add(e.data.slice(0, 7)));
    set.add(monthFilter);
    return Array.from(set).sort().reverse();
  }, [vendas, despesas, monthFilter]);

  function monthLabel(key) {
    const [y, m] = key.split("-");
    return `${MESES[parseInt(m, 10) - 1]}/${y}`;
  }

  function getItens(v) {
    if (v.itens?.length) return v.itens;
    if (v.servico) return [{ servico: v.servico, valor: v.valor }];
    return [];
  }

  const [selectedDia, setSelectedDia] = useState(null);
  const [pieScope, setPieScope] = useState("mes"); // 'mes' | 'todos'
  const [compareMonths, setCompareMonths] = useState([]);

  useEffect(() => {
    if (monthOptions.length && compareMonths.length === 0) {
      setCompareMonths(monthOptions.slice(0, Math.min(3, monthOptions.length)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOptions.length]);

  const PIE_COLORS = ["#17140F", "#4B6552", "#A24632", "#8A8375", "#C7A96B", "#5B7A8C"];

  const pieData = useMemo(() => {
    const source = pieScope === "mes" ? vendasMes : vendas;
    const totals = {};
    source.forEach((v) => {
      getItens(v).forEach((it) => {
        const nome = it.servico || "Outro";
        totals[nome] = (totals[nome] || 0) + Number(it.valor || 0);
      });
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [vendas, vendasMes, pieScope]);

  function toggleCompareMonth(key) {
    setCompareMonths((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()));
  }

  const compareData = useMemo(() => {
    return compareMonths
      .slice()
      .sort()
      .map((key) => {
        const vs = vendas.filter((v) => v.data?.startsWith(key));
        const ds = despesas.filter((d) => d.data?.startsWith(key));
        const receita = vs.reduce((s, v) => s + Number(v.valor || 0), 0);
        const despesa = ds.reduce((s, d) => s + Number(d.valor || 0), 0);
        const qtdServicos = vs.reduce((s, v) => s + getItens(v).length, 0);
        return { key, label: monthLabel(key), receita, despesa, saldo: receita - despesa, qtdServicos, qtdVendas: vs.length };
      });
  }, [vendas, despesas, compareMonths]);

  // Vendas por dia da semana (todo o período), pra ver qual dia costuma vender mais.
  const vendasPorDiaSemana = useMemo(() => {
    const totais = Array(7).fill(0);
    const qtds = Array(7).fill(0);
    vendas.forEach((v) => {
      if (!v.data) return;
      const dow = new Date(`${v.data}T00:00:00`).getDay();
      totais[dow] += Number(v.valor || 0);
      qtds[dow] += 1;
    });
    return DIAS_SEMANA.map((label, i) => ({ label, total: totais[i], qtd: qtds[i] }));
  }, [vendas]);
  const melhorDiaSemana = vendasPorDiaSemana.length ? vendasPorDiaSemana.reduce((a, b) => (b.total > a.total ? b : a)) : null;

  // Grade de calendário do mês selecionado, com o total vendido em cada dia.
  const calendarioSemanas = useMemo(() => {
    const [y, m] = monthFilter.split("-").map(Number);
    const diasNoMes = new Date(y, m, 0).getDate();
    const primeiroDiaSemana = new Date(y, m - 1, 1).getDay();
    const celulas = [];
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const iso = `${monthFilter}-${String(dia).padStart(2, "0")}`;
      const vendasDoDia = vendas.filter((v) => v.data === iso);
      const total = vendasDoDia.reduce((s, v) => s + Number(v.valor || 0), 0);
      celulas.push({ dia, iso, total, qtd: vendasDoDia.length });
    }
    while (celulas.length % 7 !== 0) celulas.push(null);
    const semanas = [];
    for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
    return semanas;
  }, [vendas, monthFilter]);

  const resumoSemanas = useMemo(() => {
    return calendarioSemanas.map((semana, idx) => ({
      numero: idx + 1,
      total: semana.reduce((s, c) => s + (c ? c.total : 0), 0),
    }));
  }, [calendarioSemanas]);
  const melhorSemanaMes = resumoSemanas.length ? resumoSemanas.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const maxDiaValor = Math.max(1, ...calendarioSemanas.flat().filter(Boolean).map((c) => c.total));

  // Histórico completo: todos os meses que já tiveram movimento, do primeiro ao mais recente.
  const historicoCompleto = useMemo(() => {
    const set = new Set();
    [...vendas, ...despesas].forEach((e) => e.data && set.add(e.data.slice(0, 7)));
    const meses = Array.from(set).sort(); // ordem cronológica
    const linhas = meses.map((key) => {
      const receita = vendas.filter((v) => v.data?.startsWith(key)).reduce((s, v) => s + Number(v.valor || 0), 0);
      const despesa = despesas.filter((d) => d.data?.startsWith(key)).reduce((s, d) => s + Number(d.valor || 0), 0);
      return { key, label: monthLabel(key), receita, despesa, saldo: receita - despesa };
    });
    const totalReceitaGeral = linhas.reduce((s, l) => s + l.receita, 0);
    const totalDespesaGeral = linhas.reduce((s, l) => s + l.despesa, 0);
    const melhorMes = linhas.length ? linhas.reduce((a, b) => (b.receita > a.receita ? b : a)) : null;
    const piorMes = linhas.length ? linhas.reduce((a, b) => (b.receita < a.receita ? b : a)) : null;
    return { linhas: linhas.slice().reverse(), totalReceitaGeral, totalDespesaGeral, saldoGeral: totalReceitaGeral - totalDespesaGeral, melhorMes, piorMes };
  }, [vendas, despesas]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", padding: "0", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        ${FONT_IMPORT}
        :root {
          --bg: #E7E3DB;
          --paper: #FBFAF7;
          --paper-line: #D6D1C4;
          --ink: #17140F;
          --gold: #17140F;
          --green: #4B6552;
          --rust: #A24632;
          --muted: #8A8375;
        }
        * { box-sizing: border-box; }
        select { -webkit-appearance: none; appearance: none; }
        button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 18px 60px" }}>
        {/* Header */}
        <div style={{ position: "relative", padding: "22px 24px", marginBottom: 26, border: "1.5px solid var(--ink)", opacity: 0.97 }}>
          {/* corner ticks, echoing the logo's bracket frame */}
          {[
            { top: -1.5, left: -1.5, bt: true, bl: true },
            { top: -1.5, right: -1.5, bt: true, br: true },
            { bottom: -1.5, left: -1.5, bb: true, bl: true },
            { bottom: -1.5, right: -1.5, bb: true, br: true },
          ].map((c, i) => (
            <span
              key={i}
              style={{
                position: "absolute", width: 14, height: 14,
                top: c.top, bottom: c.bottom, left: c.left, right: c.right,
                borderTop: c.bt ? "2.5px solid var(--bg)" : "none",
                borderBottom: c.bb ? "2.5px solid var(--bg)" : "none",
                borderLeft: c.bl ? "2.5px solid var(--bg)" : "none",
                borderRight: c.br ? "2.5px solid var(--bg)" : "none",
              }}
            />
          ))}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 30, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                prime<span style={{ fontWeight: 500 }}>step</span>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, letterSpacing: "0.22em", color: "var(--muted)", fontWeight: 600, marginTop: 6 }}>
                CONTROLE FINANCEIRO
              </div>
            </div>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{ ...inputStyle, background: "var(--paper)", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}
            >
              {monthOptions.map((k) => (
                <option key={k} value={k}>{monthLabel(k)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={handleExport}
              title="Baixar backup de todos os dados"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 4,
                border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              <Download size={13} /> Baixar backup
            </button>
            <label
              title="Restaurar a partir de um arquivo de backup"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 4,
                border: "1px solid var(--paper-line)", background: "transparent", color: "var(--muted)",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              <Upload size={13} /> Restaurar backup
              <input type="file" accept="application/json" onChange={handleImportFile} style={{ display: "none" }} />
            </label>
            {importMsg && (
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>{importMsg}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ color: "var(--muted)", fontFamily: "Inter, sans-serif", padding: 40, textAlign: "center" }}>Carregando registros…</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <StatCard label="Receitas do mês" value={formatBRL(totalReceitas)} icon={TrendingUp} tone="up" />
              <StatCard label="Despesas do mês" value={formatBRL(totalDespesas)} icon={TrendingDown} tone="down" />
              <StatCard label="Saldo" value={formatBRL(saldo)} icon={Wallet} tone={saldo >= 0 ? "up" : "down"} />
              <StatCard label="A receber (pendente)" value={formatBRL(pendentes)} icon={Clock} />
            </div>

            {/* Chart */}
            <LedgerCard style={{ padding: "18px 16px 8px", marginBottom: 22 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>
                Receita × Despesa — últimos 6 meses
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--paper-line)" />
                  <XAxis dataKey="mes" tick={{ fontFamily: "Inter, sans-serif", fontSize: 12, fill: "var(--muted)" }} axisLine={{ stroke: "var(--paper-line)" }} tickLine={false} />
                  <YAxis tick={{ fontFamily: "Inter, sans-serif", fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => formatBRL(v)}
                    contentStyle={{ background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12.5 }}
                  />
                  <Bar dataKey="receita" name="Receita" fill="var(--green)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="despesa" name="Despesa" fill="var(--rust)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </LedgerCard>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
              {[
                ["operacional", `Operacional (${pedidos.filter((p) => p.etapa !== "liberado").length})`],
                ["vendas", `Vendas (${vendasMes.length})`],
                ["despesas", `Despesas (${despesasMes.length})`],
                ["assinaturas", `Assinaturas (${assinaturas.length})`],
                ["calendario", "Calendário"],
                ["analises", "Análises"],
                ["historico", "Histórico"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    padding: "8px 16px", borderRadius: "6px 6px 0 0",
                    border: key === "operacional" ? "1px solid var(--ink)" : "1px solid var(--paper-line)",
                    borderBottom: tab === key ? "1px solid var(--paper)" : (key === "operacional" ? "1px solid var(--ink)" : "1px solid var(--paper-line)"),
                    background: tab === key ? "var(--paper)" : "transparent",
                    color: tab === key ? "var(--ink)" : "var(--muted)",
                    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer",
                    marginBottom: -1, marginRight: key === "operacional" ? 8 : 0,
                  }}
                >
                  {label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {tab !== "analises" && tab !== "historico" && tab !== "calendario" && (
                <button
                  onClick={() => setModal({ type: tab === "despesas" ? "despesa" : tab === "assinaturas" ? "assinatura" : tab === "operacional" ? "pedido" : "venda" })}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "none",
                    background: "var(--gold)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  <Plus size={15} /> {tab === "assinaturas" ? "Nova assinatura" : tab === "operacional" ? "Novo par" : `Novo ${tab === "despesas" ? "gasto" : "registro"}`}
                </button>
              )}
            </div>

            {tab === "analises" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 4 }}>
                {/* Pie chart: serviço mais vendido */}
                <LedgerCard style={{ padding: "16px 16px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                      Serviços mais vendidos (por receita)
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[["mes", monthLabel(monthFilter)], ["todos", "Todo período"]].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setPieScope(key)}
                          style={{
                            padding: "5px 10px", borderRadius: 4, border: "1px solid var(--paper-line)",
                            background: pieScope === key ? "var(--ink)" : "transparent",
                            color: pieScope === key ? "var(--paper)" : "var(--muted)",
                            fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {pieData.length === 0 ? (
                    <div style={{ padding: "26px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                      Nenhuma venda registrada {pieScope === "mes" ? "neste mês" : "ainda"}.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <ResponsiveContainer width={220} height={220}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}>
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12.5 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 180, padding: "6px 4px" }}>
                        {pieData.map((p, i) => {
                          const total = pieData.reduce((s, x) => s + x.value, 0);
                          const pct = total ? ((p.value / total) * 100).toFixed(0) : 0;
                          return (
                            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5 }}>
                              <span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                              <span style={{ color: "var(--ink)", flex: 1 }}>{p.name}</span>
                              <span style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>{pct}%</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--ink)" }}>{formatBRL(p.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </LedgerCard>

                {/* Comparativo de meses */}
                <LedgerCard style={{ padding: "16px 16px 14px" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                    Comparativo entre meses
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 4px" }}>
                    {monthOptions.map((k) => (
                      <button
                        key={k}
                        onClick={() => toggleCompareMonth(k)}
                        style={{
                          padding: "5px 10px", borderRadius: 4, border: "1px solid var(--paper-line)",
                          background: compareMonths.includes(k) ? "var(--ink)" : "transparent",
                          color: compareMonths.includes(k) ? "var(--paper)" : "var(--muted)",
                          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
                        }}
                      >
                        {monthLabel(k)}
                      </button>
                    ))}
                  </div>

                  {compareData.length === 0 ? (
                    <div style={{ padding: "20px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                      Selecione pelo menos um mês acima para comparar.
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={compareData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="var(--paper-line)" />
                          <XAxis dataKey="label" tick={{ fontFamily: "Inter, sans-serif", fontSize: 12, fill: "var(--muted)" }} axisLine={{ stroke: "var(--paper-line)" }} tickLine={false} />
                          <YAxis tick={{ fontFamily: "Inter, sans-serif", fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12.5 }} />
                          <Legend wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12 }} />
                          <Bar dataKey="receita" name="Receita" fill="var(--green)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="despesa" name="Despesa" fill="var(--rust)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>

                      <div style={{ marginTop: 10, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 12.5 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--paper-line)" }}>
                              {["Mês", "Vendas", "Serviços", "Receita", "Despesa", "Saldo"].map((h) => (
                                <th key={h} style={{ textAlign: h === "Mês" ? "left" : "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {compareData.map((row) => (
                              <tr key={row.key} style={{ borderBottom: "1px solid var(--paper-line)" }}>
                                <td style={{ padding: "7px 8px", fontFamily: "'JetBrains Mono', monospace" }}>{row.label}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right" }}>{row.qtdVendas}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right" }}>{row.qtdServicos}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "var(--green)" }}>{formatBRL(row.receita)}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "var(--rust)" }}>{formatBRL(row.despesa)}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: row.saldo >= 0 ? "var(--green)" : "var(--rust)" }}>{formatBRL(row.saldo)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </LedgerCard>
              </div>
            )}

            {/* Calendário de vendas */}
            {tab === "calendario" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <LedgerCard style={{ padding: "16px 16px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Calendar size={15} color="var(--ink)" />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                      Vendas em {monthLabel(monthFilter)}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
                    {DIAS_SEMANA.map((d) => (
                      <div key={d} style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  {calendarioSemanas.map((semana, si) => {
                    const isMelhor = melhorSemanaMes && si === melhorSemanaMes.numero - 1 && melhorSemanaMes.total > 0;
                    return (
                      <div
                        key={si}
                        style={{
                          display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4,
                          padding: isMelhor ? 4 : 0, borderRadius: 6,
                          outline: isMelhor ? "2px solid var(--green)" : "none", outlineOffset: 1,
                        }}
                      >
                        {semana.map((cel, ci) => {
                          if (!cel) return <div key={ci} />;
                          const intensidade = cel.total > 0 ? Math.max(0.12, cel.total / maxDiaValor) : 0;
                          return (
                            <div
                              key={ci}
                              onClick={() => setSelectedDia(cel.iso)}
                              title={cel.total > 0 ? `${formatDateBR(cel.iso)}: ${formatBRL(cel.total)} (${cel.qtd} venda${cel.qtd > 1 ? "s" : ""}) — toque para ver` : `${formatDateBR(cel.iso)} — toque para registrar`}
                              style={{
                                aspectRatio: "1", borderRadius: 5, padding: "4px 3px", cursor: "pointer",
                                background: cel.total > 0 ? `rgba(75,101,82,${intensidade})` : "#FFFDF8",
                                border: "1px solid var(--paper-line)",
                                display: "flex", flexDirection: "column", justifyContent: "space-between",
                                transition: "transform 0.1s",
                              }}
                            >
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--muted)" }}>{cel.dia}</span>
                              {cel.total > 0 && (
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 }}>
                                  {cel.total >= 1000 ? `${(cel.total / 1000).toFixed(1)}k` : cel.total.toFixed(0)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {melhorSemanaMes && melhorSemanaMes.total > 0 && (
                    <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--green)", fontWeight: 600 }}>
                      🏆 Melhor semana do mês: semana {melhorSemanaMes.numero} — {formatBRL(melhorSemanaMes.total)}
                    </div>
                  )}
                </LedgerCard>

                <LedgerCard style={{ padding: "16px 16px 14px" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                    Qual dia da semana mais vende (todo o período)
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    {vendasPorDiaSemana
                      .slice()
                      .sort((a, b) => b.total - a.total)
                      .map((d) => {
                        const maxTotal = Math.max(1, ...vendasPorDiaSemana.map((x) => x.total));
                        const isMelhor = melhorDiaSemana && d.label === melhorDiaSemana.label && d.total > 0;
                        return (
                          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 34, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
                              {d.label} {isMelhor ? "🏆" : ""}
                            </span>
                            <div style={{ flex: 1, height: 16, background: "#EFEBE1", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ width: `${(d.total / maxTotal) * 100}%`, height: "100%", background: isMelhor ? "var(--green)" : "var(--muted)", borderRadius: 4 }} />
                            </div>
                            <span style={{ width: 90, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                              {formatBRL(d.total)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </LedgerCard>
              </div>
            )}

            {/* Histórico completo */}
            {tab === "historico" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard label="Total faturado (todos os meses)" value={formatBRL(historicoCompleto.totalReceitaGeral)} icon={TrendingUp} tone="up" />
                  <StatCard label="Total de despesas (todos os meses)" value={formatBRL(historicoCompleto.totalDespesaGeral)} icon={TrendingDown} tone="down" />
                  <StatCard label="Saldo acumulado" value={formatBRL(historicoCompleto.saldoGeral)} icon={Wallet} tone={historicoCompleto.saldoGeral >= 0 ? "up" : "down"} />
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <LedgerCard style={{ padding: "16px 18px", flex: 1, minWidth: 220, borderLeft: "3px solid var(--green)" }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                      🏆 Melhor mês
                    </div>
                    {historicoCompleto.melhorMes ? (
                      <>
                        <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 20, color: "var(--ink)" }}>
                          {historicoCompleto.melhorMes.label}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: "var(--green)", fontWeight: 700, marginTop: 4 }}>
                          {formatBRL(historicoCompleto.melhorMes.receita)} em receita
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>Sem dados suficientes ainda.</div>
                    )}
                  </LedgerCard>

                  <LedgerCard style={{ padding: "16px 18px", flex: 1, minWidth: 220, borderLeft: "3px solid var(--rust)" }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                      Mês mais fraco
                    </div>
                    {historicoCompleto.piorMes ? (
                      <>
                        <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 20, color: "var(--ink)" }}>
                          {historicoCompleto.piorMes.label}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: "var(--rust)", fontWeight: 700, marginTop: 4 }}>
                          {formatBRL(historicoCompleto.piorMes.receita)} em receita
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>Sem dados suficientes ainda.</div>
                    )}
                  </LedgerCard>
                </div>

                <LedgerCard style={{ padding: "16px 18px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>
                    Todos os meses, do mais recente ao mais antigo
                  </div>
                  {historicoCompleto.linhas.length === 0 ? (
                    <div style={{ padding: "20px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                      Ainda não há lançamentos suficientes pra montar o histórico.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--paper-line)" }}>
                            {["Mês", "Receita", "Despesa", "Saldo"].map((h) => (
                              <th key={h} style={{ textAlign: h === "Mês" ? "left" : "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {historicoCompleto.linhas.map((row) => {
                            const isBest = historicoCompleto.melhorMes && row.key === historicoCompleto.melhorMes.key;
                            return (
                              <tr key={row.key} style={{ borderBottom: "1px solid var(--paper-line)", background: isBest ? "rgba(75,101,82,0.08)" : "transparent" }}>
                                <td style={{ padding: "7px 8px", fontFamily: "'JetBrains Mono', monospace" }}>
                                  {row.label} {isBest ? "🏆" : ""}
                                </td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "var(--green)" }}>{formatBRL(row.receita)}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "var(--rust)" }}>{formatBRL(row.despesa)}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: row.saldo >= 0 ? "var(--green)" : "var(--rust)" }}>{formatBRL(row.saldo)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </LedgerCard>
              </div>
            )}

            {/* Operacional: fluxo do tênis do recebimento à entrega */}
            {tab === "operacional" && (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                {ETAPAS_PEDIDO.map((et, idx) => {
                  const itensEtapa = pedidos.filter((p) => p.etapa === et.id);
                  return (
                    <div key={et.id} style={{ minWidth: 220, flex: "0 0 220px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 2px" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: et.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink)" }}>
                          {et.label}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--muted)" }}>({itensEtapa.length})</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {itensEtapa.length === 0 ? (
                          <div style={{ border: "1px dashed var(--paper-line)", borderRadius: 5, padding: "16px 10px", textAlign: "center", color: "var(--muted)", fontSize: 11.5, fontFamily: "Inter, sans-serif" }}>
                            Vazio
                          </div>
                        ) : (
                          itensEtapa.map((p) => (
                            <LedgerCard key={p.id} style={{ padding: 10, borderLeft: `3px solid ${et.color}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                                <strong style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)" }}>{p.cliente}</strong>
                                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                  <button onClick={() => setModal({ type: "pedido", initial: p })} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}>
                                    <Pencil size={12} />
                                  </button>
                                  <button onClick={() => deletePedido(p.id)} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 2 }}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.tenis}</div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>
                                Entrada: {formatDateBR(p.dataEntrada)}
                              </div>
                              {p.observacoes && (
                                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--ink)", marginTop: 4, fontStyle: "italic" }}>
                                  {p.observacoes}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                                {idx > 0 && (
                                  <button
                                    onClick={() => moverEtapaPedido(p, ETAPAS_PEDIDO[idx - 1].id)}
                                    style={{ flex: 1, padding: "5px 4px", borderRadius: 4, border: "1px solid var(--paper-line)", background: "transparent", color: "var(--muted)", fontSize: 11, cursor: "pointer" }}
                                  >
                                    ← Voltar
                                  </button>
                                )}
                                {idx < ETAPAS_PEDIDO.length - 1 && (
                                  <button
                                    onClick={() => moverEtapaPedido(p, ETAPAS_PEDIDO[idx + 1].id)}
                                    style={{ flex: 1, padding: "5px 4px", borderRadius: 4, border: "none", background: "var(--ink)", color: "var(--paper)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                  >
                                    Avançar →
                                  </button>
                                )}
                              </div>
                            </LedgerCard>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Assinaturas */}
            {tab === "assinaturas" && (
              <LedgerCard style={{ padding: "6px 14px 4px" }}>
                {assinaturas.length === 0 ? (
                  <div style={{ padding: "26px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                    Nenhuma assinatura cadastrada ainda.
                  </div>
                ) : (
                  assinaturas.map((sub) => {
                    const mesKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                    const cobranca = cobrancaDoMes(sub.id, mesKey);
                    const diaHoje = now.getDate();
                    const pendente = sub.status === "ativa" && !cobranca && diaHoje >= sub.diaCobranca;
                    return (
                      <div
                        key={sub.id}
                        style={{
                          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
                          padding: "14px 6px", borderBottom: "1px solid var(--paper-line)",
                        }}
                      >
                        <div style={{ flex: "1 1 220px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--ink)" }}>{sub.cliente}</strong>
                            <span
                              style={{
                                fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.03em",
                                background: sub.status === "ativa" ? "rgba(75,101,82,0.12)" : sub.status === "pausada" ? "rgba(138,131,117,0.15)" : "rgba(162,70,50,0.12)",
                                color: sub.status === "ativa" ? "var(--green)" : sub.status === "pausada" ? "var(--muted)" : "var(--rust)",
                                textTransform: "uppercase",
                              }}
                            >
                              {sub.status}
                            </span>
                          </div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                            Plano <strong style={{ color: "var(--ink)" }}>{sub.planoNome}</strong> · {formatBRL(sub.valorMensal)}/mês · cobra todo dia {sub.diaCobranca}
                          </div>
                          {pendente && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 11.5, fontWeight: 600, color: "var(--rust)" }}>
                              <Clock size={12} /> Cobrança deste mês pendente
                            </div>
                          )}
                          {cobranca && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 11.5, fontWeight: 600, color: "var(--green)" }}>
                              <Check size={12} /> Cobrança de {monthLabel(mesKey)} registrada em {formatDateBR(cobranca.data)}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {sub.status === "ativa" && (
                            <button
                              onClick={() => handleRegistrarCobranca(sub)}
                              disabled={!!cobranca}
                              title={cobranca ? "Cobrança deste mês já registrada" : "Registrar cobrança deste mês"}
                              style={{
                                padding: "7px 12px", borderRadius: 5, border: "none", cursor: cobranca ? "default" : "pointer",
                                background: cobranca ? "var(--paper-line)" : "var(--ink)", color: cobranca ? "var(--muted)" : "var(--paper)",
                                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12,
                              }}
                            >
                              {cobranca ? "Cobrado este mês" : "Registrar cobrança"}
                            </button>
                          )}
                          <button onClick={() => setModal({ type: "assinatura", initial: sub })} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteAssinatura(sub.id)} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 4 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </LedgerCard>
            )}

            {/* List */}
            {tab !== "analises" && tab !== "historico" && tab !== "assinaturas" && tab !== "operacional" && tab !== "calendario" && (
            <LedgerCard style={{ padding: "6px 14px 4px" }}>
              {tab !== "despesas" ? (
                vendasMes.length === 0 ? (
                  <div style={{ padding: "26px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                    Nenhuma venda registrada neste mês.
                  </div>
                ) : (
                  vendasMes
                    .slice()
                    .sort((a, b) => (a.data < b.data ? 1 : -1))
                    .map((v) => (
                      <LedgerRow key={v.id} onEdit={() => setModal({ type: "venda", initial: v })} onDelete={() => deleteVenda(v.id)}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--muted)" }}>{formatDateBR(v.data)}</span>
                        <span style={{ color: "var(--ink)" }}>
                          <strong>{v.cliente}</strong>
                          <span style={{ color: "var(--muted)" }}>
                            {" — "}
                            {(v.itens?.length
                              ? v.itens.map((i) => (i.quantidade > 1 ? `${i.servico} (x${i.quantidade})` : i.servico))
                              : v.servico
                              ? [v.servico]
                              : []
                            ).join(", ")}
                          </span>
                        </span>
                        <span
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                            color: v.status === "pago" ? "var(--green)" : "var(--rust)",
                          }}
                        >
                          {v.status === "pago" ? <Check size={12} /> : <Clock size={12} />}
                          {v.status === "pago" ? "Pago" : "Pendente"}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--green)", textAlign: "right" }}>
                          {formatBRL(v.valor)}
                        </span>
                      </LedgerRow>
                    ))
                )
              ) : despesasMes.length === 0 ? (
                <div style={{ padding: "26px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                  Nenhuma despesa registrada neste mês.
                </div>
              ) : (
                despesasMes
                  .slice()
                  .sort((a, b) => (a.data < b.data ? 1 : -1))
                  .map((d) => (
                    <LedgerRow key={d.id} onEdit={() => setModal({ type: "despesa", initial: d })} onDelete={() => deleteDespesa(d.id)}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--muted)" }}>{formatDateBR(d.data)}</span>
                      <span style={{ color: "var(--ink)" }}>{d.descricao}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>{d.categoria}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--rust)", textAlign: "right" }}>
                        {formatBRL(d.valor)}
                      </span>
                    </LedgerRow>
                  ))
              )}
            </LedgerCard>
            )}
          </>
        )}
      </div>

      {modal && modal.type === "assinatura" && (
        <AssinaturaModal
          initial={modal.initial}
          onSave={handleSaveEntry}
          onClose={() => setModal(null)}
        />
      )}
      {selectedDia && (
        <DayDetailModal
          iso={selectedDia}
          vendasDoDia={vendas.filter((v) => v.data === selectedDia)}
          onClose={() => setSelectedDia(null)}
          onEdit={(v) => {
            setSelectedDia(null);
            setModal({ type: "venda", initial: v });
          }}
          onDelete={(id) => deleteVenda(id)}
          onAddNew={() => {
            const iso = selectedDia;
            setSelectedDia(null);
            setModal({ type: "venda", initial: { data: iso } });
          }}
        />
      )}
      {modal && modal.type === "pedido" && (
        <PedidoModal
          initial={modal.initial}
          onSave={handleSaveEntry}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal.type !== "assinatura" && modal.type !== "pedido" && (
        <EntryModal
          type={modal.type}
          initial={modal.initial}
          onSave={handleSaveEntry}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

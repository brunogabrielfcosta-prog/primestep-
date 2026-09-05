import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Plus, Trash2, Pencil, X, TrendingUp, TrendingDown, Wallet, Check, Clock, Download, Upload } from "lucide-react";
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

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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
  return { id: row.id, data: row.data, cliente: row.cliente, status: row.status, itens: row.itens || [], valor: Number(row.valor) };
}
function rowToDespesa(row) {
  return { id: row.id, data: row.data, descricao: row.descricao, categoria: row.categoria, valor: Number(row.valor) };
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
async function upsertVenda(v) {
  const { error } = await supabase.from("vendas").upsert({
    id: v.id, data: v.data, cliente: v.cliente, status: v.status, itens: v.itens, valor: v.valor,
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
  return { itemId: uid(), sel: CATALOGO_SERVICOS[0].nome, servico: CATALOGO_SERVICOS[0].nome, valor: String(CATALOGO_SERVICOS[0].valor) };
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
      return { itemId: uid(), sel: match ? match.nome : "custom", servico: it.servico, valor: String(it.valor) };
    });
  });
  const [error, setError] = useState("");

  const total = itens.reduce((s, it) => s + (parseFloat(String(it.valor).replace(",", ".")) || 0), 0);

  function updateItem(itemId, patch) {
    setItens((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, ...patch } : it)));
  }
  function handleItemServicoChange(itemId, nomeSel) {
    if (nomeSel === "custom") {
      updateItem(itemId, { sel: "custom", servico: "" });
    } else {
      const item = CATALOGO_SERVICOS.find((s) => s.nome === nomeSel);
      updateItem(itemId, { sel: nomeSel, servico: item.nome, valor: String(item.valor) });
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
        const v = parseFloat(String(it.valor).replace(",", "."));
        if (!v || v <= 0) {
          setError("Informe um valor válido para cada serviço.");
          return;
        }
      }
      const itensClean = itens.map((it) => ({ servico: it.servico.trim(), valor: parseFloat(String(it.valor).replace(",", ".")) }));
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
                        <input
                          type="text"
                          inputMode="decimal"
                          value={it.valor}
                          onChange={(e) => updateItem(it.itemId, { valor: e.target.value })}
                          placeholder="0,00"
                          style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", width: "50%" }}
                        />
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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null); // {type: 'venda'|'despesa', initial?}
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  useEffect(() => {
    (async () => {
      const [v, d] = await Promise.all([loadVendas(), loadDespesas()]);
      setVendas(v);
      setDespesas(d);
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

  const [importMsg, setImportMsg] = useState("");

  function handleExport() {
    const payload = { app: "primestep-controle-financeiro", exportadoEm: new Date().toISOString(), vendas, despesas };
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
        if (!v || !d) throw new Error("formato inválido");
        const ok = window.confirm(
          `Este backup tem ${v.length} venda(s) e ${d.length} despesa(s).\nIsso vai SUBSTITUIR os dados atuais (${vendas.length} venda(s), ${despesas.length} despesa(s)). Continuar?`
        );
        if (!ok) return;
        // Apaga tudo que existe hoje e grava o backup inteiro no banco.
        await Promise.all(vendas.map((old) => deleteVendaRow(old.id)));
        await Promise.all(despesas.map((old) => deleteDespesaRow(old.id)));
        await Promise.all(v.map((item) => upsertVenda(item)));
        await Promise.all(d.map((item) => upsertDespesa(item)));
        setVendas(v);
        setDespesas(d);
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
    } else {
      const exists = despesas.some((d) => d.id === entry.id);
      persistDespesas(exists ? despesas.map((d) => (d.id === entry.id ? entry : d)) : [entry, ...despesas], { type: "upsert", item: entry });
    }
    setModal(null);
  }

  function deleteVenda(id) {
    persistVendas(vendas.filter((v) => v.id !== id), { type: "delete", id });
  }
  function deleteDespesa(id) {
    persistDespesas(despesas.filter((d) => d.id !== id), { type: "delete", id });
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
                ["vendas", `Vendas (${vendasMes.length})`],
                ["despesas", `Despesas (${despesasMes.length})`],
                ["analises", "Análises"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    padding: "8px 16px", borderRadius: "6px 6px 0 0", border: "1px solid var(--paper-line)",
                    borderBottom: tab === key ? "1px solid var(--paper)" : "1px solid var(--paper-line)",
                    background: tab === key ? "var(--paper)" : "transparent",
                    color: tab === key ? "var(--ink)" : "var(--muted)",
                    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {tab !== "analises" && (
                <button
                  onClick={() => setModal({ type: tab === "despesas" ? "despesa" : "venda" })}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "none",
                    background: "var(--gold)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  <Plus size={15} /> Novo {tab === "despesas" ? "gasto" : "registro"}
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

            {/* List */}
            {tab !== "analises" && (
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
                            {(v.itens?.length ? v.itens.map((i) => i.servico) : v.servico ? [v.servico] : []).join(", ")}
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

      {modal && (
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

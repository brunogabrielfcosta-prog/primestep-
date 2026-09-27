import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Trash2, Pencil, X, TrendingUp, TrendingDown, Wallet, Lock,
  Search, ChevronLeft, ChevronRight, Package, Users, BarChart3, LogOut, Smartphone,
} from "lucide-react";
import { supabase } from "./App.jsx";

// Fornecedores sugeridos (reaproveitados do sistema da Astrotech). O campo
// continua sendo texto livre — isso aqui é só sugestão de autocompletar.
const FORNECEDORES_SUGERIDOS = ["Pistori", "Mega Cell", "Viccelli", "Bruno/Acidente", "Fast Phone", "WD Imports", "Willian Fontes"];

const SENHA_ACESSO = "160805";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m, 10) - 1]}/${y}`;
}

// ---------- Banco de dados ----------
function rowToDivida(row) {
  return { id: row.id, fornecedor: row.fornecedor, valor: Number(row.valor), vendedor: row.vendedor || "", data: row.data, observacao: row.observacao || "" };
}
function rowToPagamentoFornecedor(row) {
  return { id: row.id, fornecedor: row.fornecedor, valor: Number(row.valor), data: row.data };
}
function rowToFiado(row) {
  return { id: row.id, cliente: row.cliente, valor: Number(row.valor), data: row.data, observacao: row.observacao || "" };
}
function rowToPagamentoFiado(row) {
  return { id: row.id, cliente: row.cliente, valor: Number(row.valor), data: row.data };
}
function rowToVenda(row) {
  return {
    id: row.id, cliente: row.cliente, telefone: row.telefone || "", aparelho: row.aparelho, imei: row.imei,
    custo: Number(row.custo), valorVenda: Number(row.valor_venda), data: row.data, observacao: row.observacao || "",
  };
}

async function loadTabela(nome, mapper, orderBy = "data") {
  const { data, error } = await supabase.from(nome).select("*").order(orderBy, { ascending: false });
  if (error) {
    console.error(`Erro ao carregar ${nome}`, error);
    return [];
  }
  return (data || []).map(mapper);
}
async function upsertLinha(nome, payload) {
  const { error } = await supabase.from(nome).upsert(payload);
  if (error) console.error(`Erro ao salvar em ${nome}`, error);
}
async function deleteLinha(nome, id) {
  const { error } = await supabase.from(nome).delete().eq("id", id);
  if (error) console.error(`Erro ao excluir de ${nome}`, error);
}

// ---------- UI atoms ----------
function LedgerCard({ children, style }) {
  return <div style={{ background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 4, ...style }}>{children}</div>;
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
  fontFamily: "Inter, sans-serif", fontSize: 14, padding: "9px 11px", borderRadius: 5,
  border: "1px solid var(--paper-line)", background: "#FFFDF8", color: "var(--ink)", outline: "none",
};
function StatCard({ label, value, icon, tone }) {
  const toneColor = tone === "up" ? "var(--green)" : tone === "down" ? "var(--rust)" : "var(--ink)";
  const Icon = icon;
  return (
    <LedgerCard style={{ padding: "16px 18px", flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>{label}</span>
        <Icon size={15} color={toneColor} strokeWidth={2.25} />
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 21, fontWeight: 700, color: toneColor, letterSpacing: "-0.01em" }}>{value}</div>
    </LedgerCard>
  );
}

// ---------- Modal: senha ----------
function PasswordGate({ onUnlock }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (senha === SENHA_ACESSO) {
      try { sessionStorage.setItem("pessoal_unlocked", "true"); } catch (e) {}
      onUnlock();
    } else {
      setErro("Senha incorreta.");
      setSenha("");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        :root { --bg:#E7E3DB; --paper:#FBFAF7; --paper-line:#D6D1C4; --ink:#17140F; --green:#4B6552; --rust:#A24632; --muted:#8A8375; }
        * { box-sizing: border-box; }
      `}</style>
      <LedgerCard style={{ padding: 30, width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Lock size={20} color="var(--ink)" />
        </div>
        <h2 style={{ margin: "0 0 4px", fontFamily: "Manrope, sans-serif", fontSize: 19, fontWeight: 800, color: "var(--ink)" }}>Acesso restrito</h2>
        <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--muted)" }}>Controle pessoal — digite a senha para entrar.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(""); }}
            placeholder="Senha"
            style={{ ...inputStyle, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 16, letterSpacing: "0.2em" }}
          />
          {erro && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{erro}</div>}
          <button
            type="submit"
            style={{ padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}
          >
            Entrar
          </button>
        </form>
      </LedgerCard>
    </div>
  );
}

// ---------- Modal: nova/editar dívida com fornecedor ----------
function DividaModal({ initial, onSave, onClose }) {
  const [fornecedor, setFornecedor] = useState(initial?.fornecedor || "");
  const [valor, setValor] = useState(initial?.valor != null ? String(initial.valor) : "");
  const [vendedor, setVendedor] = useState(initial?.vendedor || "");
  const [data, setData] = useState(initial?.data || todayStr());
  const [observacao, setObservacao] = useState(initial?.observacao || "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!fornecedor.trim()) { setError("Informe o fornecedor."); return; }
    const v = parseFloat(String(valor).replace(",", "."));
    if (!v || v <= 0) { setError("Informe um valor válido."); return; }
    onSave({ id: initial?.id || uid(), fornecedor: fornecedor.trim(), valor: v, vendedor: vendedor.trim(), data, observacao: observacao.trim() });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{initial ? "Editar" : "Nova"} dívida com fornecedor</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Fornecedor">
              <input list="lista-fornecedores" type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Digite ou escolha um fornecedor" style={inputStyle} />
              <datalist id="lista-fornecedores">
                {FORNECEDORES_SUGERIDOS.map((f) => <option key={f} value={f} />)}
              </datalist>
            </Field>
            <Field label="Valor total (R$)">
              <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>
            <Field label="Vendedor responsável (opcional)">
              <input type="text" value={vendedor} onChange={(e) => setVendedor(e.target.value)} placeholder="Ex: Bruno" style={inputStyle} />
            </Field>
            <Field label="Data">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Observação (opcional)">
              <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: NF 1234, lote de peças" style={inputStyle} />
            </Field>
            {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
            <button type="submit" style={{ marginTop: 4, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
              Adicionar
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal: nova/editar venda fiado ----------
function FiadoModal({ initial, onSave, onClose }) {
  const [cliente, setCliente] = useState(initial?.cliente || "");
  const [valor, setValor] = useState(initial?.valor != null ? String(initial.valor) : "");
  const [data, setData] = useState(initial?.data || todayStr());
  const [observacao, setObservacao] = useState(initial?.observacao || "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!cliente.trim()) { setError("Informe o cliente."); return; }
    const v = parseFloat(String(valor).replace(",", "."));
    if (!v || v <= 0) { setError("Informe um valor válido."); return; }
    onSave({ id: initial?.id || uid(), cliente: cliente.trim(), valor: v, data, observacao: observacao.trim() });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{initial ? "Editar" : "Nova"} venda fiado</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Cliente">
              <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" style={inputStyle} />
            </Field>
            <Field label="Valor (R$)">
              <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>
            <Field label="Data">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Observação (opcional)">
              <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: 1 par Nike Dunk" style={inputStyle} />
            </Field>
            {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
            <button type="submit" style={{ marginTop: 4, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
              Adicionar
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal: nova/editar venda de aparelho ----------
function VendaModal({ initial, onSave, onClose }) {
  const [cliente, setCliente] = useState(initial?.cliente || "");
  const [telefone, setTelefone] = useState(initial?.telefone || "");
  const [aparelho, setAparelho] = useState(initial?.aparelho || "");
  const [imei, setImei] = useState(initial?.imei || "");
  const [custo, setCusto] = useState(initial?.custo != null ? String(initial.custo) : "");
  const [valorVenda, setValorVenda] = useState(initial?.valorVenda != null ? String(initial.valorVenda) : "");
  const [data, setData] = useState(initial?.data || todayStr());
  const [observacao, setObservacao] = useState(initial?.observacao || "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!cliente.trim()) { setError("Informe o cliente."); return; }
    if (!aparelho.trim()) { setError("Informe o aparelho."); return; }
    if (!imei.trim()) { setError("Informe o IMEI."); return; }
    const c = parseFloat(String(custo).replace(",", "."));
    const v = parseFloat(String(valorVenda).replace(",", "."));
    if (!v || v <= 0) { setError("Informe um valor de venda válido."); return; }
    if (isNaN(c) || c < 0) { setError("Informe um valor de custo válido."); return; }
    onSave({
      id: initial?.id || uid(), cliente: cliente.trim(), telefone: telefone.trim(), aparelho: aparelho.trim(),
      imei: imei.trim(), custo: c, valorVenda: v, data, observacao: observacao.trim(),
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{initial ? "Editar" : "Nova"} venda de aparelho</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Cliente">
              <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" style={inputStyle} />
            </Field>
            <Field label="Telefone (opcional)">
              <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex: (65) 99999-0000" style={inputStyle} />
            </Field>
            <Field label="Aparelho">
              <input type="text" value={aparelho} onChange={(e) => setAparelho(e.target.value)} placeholder="Ex: iPhone 12 128GB" style={inputStyle} />
            </Field>
            <Field label="IMEI">
              <input type="text" inputMode="numeric" value={imei} onChange={(e) => setImei(e.target.value)} placeholder="Ex: 356789104561234" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Custo (R$)">
                  <input type="text" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Valor de venda (R$)">
                  <input type="text" inputMode="decimal" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
                </Field>
              </div>
            </div>
            <Field label="Data">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Observação (opcional)">
              <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: garantia de 3 meses" style={inputStyle} />
            </Field>
            {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
            <button type="submit" style={{ marginTop: 4, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
              Salvar venda
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal: registrar pagamento (genérico p/ fornecedor ou cliente) ----------
function PagamentoModal({ nome, saldoRestante, onSave, onClose }) {
  const [valor, setValor] = useState(saldoRestante > 0 ? String(saldoRestante) : "");
  const [data, setData] = useState(todayStr());
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const v = parseFloat(String(valor).replace(",", "."));
    if (!v || v <= 0) { setError("Informe um valor válido."); return; }
    onSave({ id: uid(), valor: v, data });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 16.5, fontWeight: 700, color: "var(--ink)" }}>Registrar pagamento</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--muted)" }}>{nome} · saldo em aberto: <strong style={{ color: "var(--rust)" }}>{formatBRL(saldoRestante)}</strong></p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Valor pago (R$)">
              <input type="text" inputMode="decimal" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>
            <Field label="Data">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
            </Field>
            {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
            <button type="submit" style={{ marginTop: 4, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--green)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
              Confirmar pagamento
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal: detalhe do dia (calendário de fornecedores) ----------
function DiaDetalheModal({ iso, eventos, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 16.5, fontWeight: 700, color: "var(--ink)" }}>{formatDateBR(iso)}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
          </div>
          {eventos.length === 0 ? (
            <div style={{ padding: "16px 4px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Nada registrado nesse dia.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {eventos.map((ev, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--paper-line)" }}>
                  <div>
                    <strong style={{ fontSize: 13.5, color: "var(--ink)", fontFamily: "Inter, sans-serif" }}>{ev.tipo === "pagamento" ? "Pagamento" : "Nova dívida"}</strong>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                      {ev.fornecedor}{ev.vendedor ? ` · Vendedor: ${ev.vendedor}` : ""}{ev.observacao ? ` · ${ev.observacao}` : ""}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13.5, color: ev.tipo === "pagamento" ? "var(--green)" : "var(--rust)" }}>
                    {formatBRL(ev.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Card de fornecedor / cliente com "ver detalhes" ----------
function ResumoCard({ nome, total, pago, saldo, lancamentos, pagamentos, onRegistrarPagamento, onEditarLancamento, onExcluirLancamento, onExcluirPagamento, labelExtra }) {
  const [aberto, setAberto] = useState(false);
  const quitado = saldo <= 0.004;

  return (
    <LedgerCard style={{ padding: "14px 16px", borderLeft: `3px solid ${quitado ? "var(--green)" : "var(--rust)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <strong style={{ fontFamily: "Manrope, sans-serif", fontSize: 15, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase" }}>{nome}</strong>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, letterSpacing: "0.03em", textTransform: "uppercase", whiteSpace: "nowrap",
          background: quitado ? "rgba(75,101,82,0.12)" : "rgba(162,70,50,0.12)", color: quitado ? "var(--green)" : "var(--rust)",
        }}>
          {quitado ? "Quitado" : "Em aberto"}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{lancamentos.length} lançamento{lancamentos.length !== 1 ? "s" : ""}</div>
      <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Total</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{formatBRL(total)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Pago</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14.5, color: "var(--green)" }}>{formatBRL(pago)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Saldo</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14.5, color: quitado ? "var(--green)" : "var(--rust)" }}>{formatBRL(Math.max(saldo, 0))}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {!quitado && (
          <button onClick={onRegistrarPagamento} style={{ padding: "7px 12px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12 }}>
            Registrar pagamento
          </button>
        )}
        <button onClick={() => setAberto((a) => !a)} style={{ padding: "7px 12px", borderRadius: 5, border: "1px solid var(--paper-line)", cursor: "pointer", background: "transparent", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12 }}>
          {aberto ? "Ocultar detalhes" : "Ver detalhes"}
        </button>
      </div>

      {aberto && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--paper-line)", display: "flex", flexDirection: "column", gap: 6 }}>
          {lancamentos.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>{formatDateBR(l.data)} — {l.observacao || labelExtra}{l.vendedor ? ` (${l.vendedor})` : ""}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--ink)" }}>{formatBRL(l.valor)}</span>
                <button onClick={() => onEditarLancamento(l)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}><Pencil size={12} /></button>
                <button onClick={() => onExcluirLancamento(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 2 }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {pagamentos.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "var(--green)" }}>{formatDateBR(p.data)} — Pagamento</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--green)" }}>{formatBRL(p.valor)}</span>
                <button onClick={() => onExcluirPagamento(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 2 }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </LedgerCard>
  );
}

// ---------- Ranking simples (barras) ----------
function RankingList({ itens }) {
  const maxTotal = Math.max(1, ...itens.map((i) => i.total));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {itens.map((i) => (
        <div key={i.nome} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 110, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nome}</span>
          <div style={{ flex: 1, height: 14, background: "#EFEBE1", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(i.total / maxTotal) * 100}%`, height: "100%", background: "var(--muted)", borderRadius: 4 }} />
          </div>
          <span style={{ width: 90, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>{formatBRL(i.total)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Sidebar ----------
function Sidebar({ tab, setTab, onSair }) {
  const itens = [
    { id: "fornecedores", label: "Fornecedores", icon: Package },
    { id: "fiado", label: "Fiado", icon: Users },
    { id: "vendas", label: "Vendas", icon: Smartphone },
    { id: "resumo", label: "Resumo", icon: BarChart3 },
  ];
  return (
    <aside className="pc-sidebar" style={{ width: 210, flexShrink: 0, background: "var(--paper)", borderRight: "1px solid var(--paper-line)", padding: "22px 0", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0 20px 18px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, letterSpacing: "0.2em", color: "var(--muted)", fontWeight: 700 }}>FINANCEIRO</div>
        <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 16, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>Controle Pessoal</div>
      </div>
      <nav className="pc-nav" style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {itens.map((it) => {
          const Icon = it.icon;
          const ativo = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", border: "none", cursor: "pointer",
                background: ativo ? "var(--bg)" : "transparent", color: ativo ? "var(--ink)" : "var(--muted)",
                fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, textAlign: "left",
                borderLeft: ativo ? "3px solid var(--ink)" : "3px solid transparent",
              }}
            >
              <Icon size={16} /> {it.label.toUpperCase()}
            </button>
          );
        })}
      </nav>
      <button
        onClick={onSair}
        style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 20px 0", padding: "9px 0", border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12 }}
      >
        <LogOut size={14} /> Bloquear acesso
      </button>
    </aside>
  );
}

// ---------- App principal (após senha correta) ----------
function ControlePessoalApp({ onSair }) {
  const [dividas, setDividas] = useState([]);
  const [pagamentosF, setPagamentosF] = useState([]);
  const [fiados, setFiados] = useState([]);
  const [pagamentosC, setPagamentosC] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("fornecedores");
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null); // {type: 'divida'|'fiado'|'pagamentoF'|'pagamentoC', initial?, nome?, saldo?}
  const [selectedDia, setSelectedDia] = useState(null);

  useEffect(() => {
    (async () => {
      const [d, pf, f, pc, v] = await Promise.all([
        loadTabela("pessoal_dividas", rowToDivida),
        loadTabela("pessoal_pagamentos", rowToPagamentoFornecedor),
        loadTabela("pessoal_fiado", rowToFiado),
        loadTabela("pessoal_fiado_pagamentos", rowToPagamentoFiado),
        loadTabela("pessoal_vendas", rowToVenda),
      ]);
      setDividas(d); setPagamentosF(pf); setFiados(f); setPagamentosC(pc); setVendas(v);
      setLoading(false);
    })();
  }, []);

  function salvarDivida(item) {
    const exists = dividas.some((d) => d.id === item.id);
    setDividas((prev) => (exists ? prev.map((d) => (d.id === item.id ? item : d)) : [item, ...prev]));
    upsertLinha("pessoal_dividas", { id: item.id, fornecedor: item.fornecedor, valor: item.valor, vendedor: item.vendedor, data: item.data, observacao: item.observacao });
    setModal(null);
  }
  function excluirDivida(id) {
    setDividas((prev) => prev.filter((d) => d.id !== id));
    deleteLinha("pessoal_dividas", id);
  }
  function registrarPagamentoFornecedor(fornecedor, pagamento) {
    const item = { id: pagamento.id, fornecedor, valor: pagamento.valor, data: pagamento.data };
    setPagamentosF((prev) => [item, ...prev]);
    upsertLinha("pessoal_pagamentos", item);
    setModal(null);
  }
  function excluirPagamentoFornecedor(id) {
    setPagamentosF((prev) => prev.filter((p) => p.id !== id));
    deleteLinha("pessoal_pagamentos", id);
  }

  function salvarFiado(item) {
    const exists = fiados.some((f) => f.id === item.id);
    setFiados((prev) => (exists ? prev.map((f) => (f.id === item.id ? item : f)) : [item, ...prev]));
    upsertLinha("pessoal_fiado", { id: item.id, cliente: item.cliente, valor: item.valor, data: item.data, observacao: item.observacao });
    setModal(null);
  }
  function excluirFiado(id) {
    setFiados((prev) => prev.filter((f) => f.id !== id));
    deleteLinha("pessoal_fiado", id);
  }
  function registrarPagamentoCliente(cliente, pagamento) {
    const item = { id: pagamento.id, cliente, valor: pagamento.valor, data: pagamento.data };
    setPagamentosC((prev) => [item, ...prev]);
    upsertLinha("pessoal_fiado_pagamentos", item);
    setModal(null);
  }
  function excluirPagamentoCliente(id) {
    setPagamentosC((prev) => prev.filter((p) => p.id !== id));
    deleteLinha("pessoal_fiado_pagamentos", id);
  }

  function salvarVenda(item) {
    const exists = vendas.some((v) => v.id === item.id);
    setVendas((prev) => (exists ? prev.map((v) => (v.id === item.id ? item : v)) : [item, ...prev]));
    upsertLinha("pessoal_vendas", {
      id: item.id, cliente: item.cliente, telefone: item.telefone, aparelho: item.aparelho,
      imei: item.imei, custo: item.custo, valor_venda: item.valorVenda, data: item.data, observacao: item.observacao,
    });
    setModal(null);
  }
  function excluirVenda(id) {
    setVendas((prev) => prev.filter((v) => v.id !== id));
    deleteLinha("pessoal_vendas", id);
  }

  // ---- Agrupamentos ----
  const resumoFornecedores = useMemo(() => {
    const map = {};
    dividas.forEach((d) => {
      if (!map[d.fornecedor]) map[d.fornecedor] = { nome: d.fornecedor, total: 0, pago: 0, lancamentos: [], pagamentos: [] };
      map[d.fornecedor].total += d.valor;
      map[d.fornecedor].lancamentos.push(d);
    });
    pagamentosF.forEach((p) => {
      if (!map[p.fornecedor]) map[p.fornecedor] = { nome: p.fornecedor, total: 0, pago: 0, lancamentos: [], pagamentos: [] };
      map[p.fornecedor].pago += p.valor;
      map[p.fornecedor].pagamentos.push(p);
    });
    return Object.values(map).map((f) => ({ ...f, saldo: f.total - f.pago })).sort((a, b) => b.saldo - a.saldo);
  }, [dividas, pagamentosF]);

  const resumoClientes = useMemo(() => {
    const map = {};
    fiados.forEach((f) => {
      if (!map[f.cliente]) map[f.cliente] = { nome: f.cliente, total: 0, pago: 0, lancamentos: [], pagamentos: [] };
      map[f.cliente].total += f.valor;
      map[f.cliente].lancamentos.push(f);
    });
    pagamentosC.forEach((p) => {
      if (!map[p.cliente]) map[p.cliente] = { nome: p.cliente, total: 0, pago: 0, lancamentos: [], pagamentos: [] };
      map[p.cliente].pago += p.valor;
      map[p.cliente].pagamentos.push(p);
    });
    return Object.values(map).map((c) => ({ ...c, saldo: c.total - c.pago })).sort((a, b) => b.saldo - a.saldo);
  }, [fiados, pagamentosC]);

  const fornecedoresFiltrados = useMemo(
    () => resumoFornecedores.filter((f) => f.nome.toLowerCase().includes(busca.toLowerCase())),
    [resumoFornecedores, busca]
  );
  const clientesFiltrados = useMemo(
    () => resumoClientes.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase())),
    [resumoClientes, busca]
  );

  // ---- Stats do mês (fornecedores) ----
  const pegoNoMes = useMemo(() => dividas.filter((d) => d.data?.startsWith(monthFilter)).reduce((s, d) => s + d.valor, 0), [dividas, monthFilter]);
  const pagoNoMes = useMemo(() => pagamentosF.filter((p) => p.data?.startsWith(monthFilter)).reduce((s, p) => s + p.valor, 0), [pagamentosF, monthFilter]);
  const saldoDoMes = pagoNoMes - pegoNoMes;

  // ---- Stats do mês (fiado) ----
  const fiadoNoMes = useMemo(() => fiados.filter((f) => f.data?.startsWith(monthFilter)).reduce((s, f) => s + f.valor, 0), [fiados, monthFilter]);
  const recebidoNoMes = useMemo(() => pagamentosC.filter((p) => p.data?.startsWith(monthFilter)).reduce((s, p) => s + p.valor, 0), [pagamentosC, monthFilter]);

  // ---- Calendário (fornecedores) ----
  const monthOptions = useMemo(() => {
    const set = new Set();
    [...dividas, ...pagamentosF].forEach((e) => e.data && set.add(e.data.slice(0, 7)));
    set.add(monthFilter);
    return Array.from(set).sort().reverse();
  }, [dividas, pagamentosF, monthFilter]);

  const calendario = useMemo(() => {
    const [y, m] = monthFilter.split("-").map(Number);
    const diasNoMes = new Date(y, m, 0).getDate();
    const primeiroDiaSemana = new Date(y, m - 1, 1).getDay();
    const celulas = [];
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const iso = `${monthFilter}-${String(dia).padStart(2, "0")}`;
      const pego = dividas.filter((d) => d.data === iso).reduce((s, d) => s + d.valor, 0);
      const pago = pagamentosF.filter((p) => p.data === iso).reduce((s, p) => s + p.valor, 0);
      celulas.push({ dia, iso, pego, pago });
    }
    while (celulas.length % 7 !== 0) celulas.push(null);
    const semanas = [];
    for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
    return semanas;
  }, [dividas, pagamentosF, monthFilter]);

  function eventosDoDia(iso) {
    const evs = [];
    dividas.filter((d) => d.data === iso).forEach((d) => evs.push({ tipo: "divida", fornecedor: d.fornecedor, vendedor: d.vendedor, observacao: d.observacao, valor: d.valor }));
    pagamentosF.filter((p) => p.data === iso).forEach((p) => evs.push({ tipo: "pagamento", fornecedor: p.fornecedor, valor: p.valor }));
    return evs;
  }

  // ---- Vendas de aparelhos (lucro) ----
  const vendasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return vendas.filter((v) => v.cliente.toLowerCase().includes(termo) || v.imei.toLowerCase().includes(termo) || v.aparelho.toLowerCase().includes(termo));
  }, [vendas, busca]);

  const vendasDoMes = useMemo(() => vendas.filter((v) => v.data?.startsWith(monthFilter)), [vendas, monthFilter]);
  const faturadoNoMes = vendasDoMes.reduce((s, v) => s + v.valorVenda, 0);
  const custoNoMes = vendasDoMes.reduce((s, v) => s + v.custo, 0);
  const lucroNoMes = faturadoNoMes - custoNoMes;
  const lucroTotal = vendas.reduce((s, v) => s + (v.valorVenda - v.custo), 0);

  // ---- Resumo geral ----
  const totalAPagar = resumoFornecedores.reduce((s, f) => s + Math.max(f.saldo, 0), 0);
  const totalAReceber = resumoClientes.reduce((s, c) => s + Math.max(c.saldo, 0), 0);
  const saldoLiquido = totalAReceber - totalAPagar;

  const topFornecedores = resumoFornecedores.filter((f) => f.saldo > 0).slice(0, 6).map((f) => ({ nome: f.nome, total: f.saldo }));
  const topClientes = resumoClientes.filter((c) => c.saldo > 0).slice(0, 6).map((c) => ({ nome: c.nome, total: c.saldo }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        :root { --bg:#E7E3DB; --paper:#FBFAF7; --paper-line:#D6D1C4; --ink:#17140F; --green:#4B6552; --rust:#A24632; --muted:#8A8375; }
        * { box-sizing: border-box; }
        .pc-wrap { display: flex; min-height: 100vh; }
        @media (max-width: 760px) {
          .pc-wrap { flex-direction: column; }
          .pc-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--paper-line); padding: 12px 0 !important; }
          .pc-nav { flex-direction: row !important; overflow-x: auto; gap: 4px !important; padding: 0 12px; }
          .pc-nav button { border-left: none !important; border-bottom: 3px solid transparent; white-space: nowrap; }
        }
      `}</style>
      <div className="pc-wrap">
        <Sidebar tab={tab} setTab={setTab} onSair={onSair} />
        <main style={{ flex: 1, padding: "24px 20px 60px", overflowX: "hidden" }}>
          {loading ? (
            <div style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>Carregando…</div>
          ) : (
            <>
              {tab === "fornecedores" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 780 }}>
                  <h1 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Fornecedores</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Pego no mês" value={formatBRL(pegoNoMes)} icon={TrendingDown} tone="down" />
                    <StatCard label="Pago no mês" value={formatBRL(pagoNoMes)} icon={TrendingUp} tone="up" />
                    <StatCard label="Saldo do mês" value={formatBRL(saldoDoMes)} icon={Wallet} tone={saldoDoMes >= 0 ? "up" : "down"} />
                  </div>

                  <LedgerCard style={{ padding: "16px 16px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <button onClick={() => { const [y, m] = monthFilter.split("-").map(Number); const d = new Date(y, m - 2, 1); setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}><ChevronLeft size={18} /></button>
                      <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 14, color: "var(--ink)", textTransform: "uppercase" }}>{monthLabel(monthFilter)}</span>
                      <button onClick={() => { const [y, m] = monthFilter.split("-").map(Number); const d = new Date(y, m, 1); setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}><ChevronRight size={18} /></button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
                      {DIAS_SEMANA.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>{d}</div>)}
                    </div>
                    {calendario.map((semana, si) => (
                      <div key={si} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                        {semana.map((cel, ci) => {
                          if (!cel) return <div key={ci} />;
                          const temMovimento = cel.pego > 0 || cel.pago > 0;
                          return (
                            <div
                              key={ci}
                              onClick={() => setSelectedDia(cel.iso)}
                              style={{ aspectRatio: "1", borderRadius: 5, padding: "4px 3px", cursor: temMovimento ? "pointer" : "default", background: temMovimento ? "#FFFDF8" : "transparent", border: "1px solid var(--paper-line)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                            >
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--muted)" }}>{cel.dia}</span>
                              {cel.pego > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, color: "var(--rust)", lineHeight: 1.1 }}>{cel.pego >= 1000 ? `${(cel.pego / 1000).toFixed(1)}k` : cel.pego.toFixed(0)}</span>}
                              {cel.pago > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, color: "var(--green)", lineHeight: 1.1 }}>{cel.pago >= 1000 ? `${(cel.pago / 1000).toFixed(1)}k` : cel.pago.toFixed(0)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
                      <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--rust)", marginRight: 4 }} />Pego (novas dívidas)</span>
                      <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--green)", marginRight: 4 }} />Pago</span>
                    </div>
                  </LedgerCard>

                  <LedgerCard style={{ padding: 18 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Nova dívida com fornecedor</div>
                    <button
                      onClick={() => setModal({ type: "divida" })}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}
                    >
                      <Plus size={15} /> Nova dívida
                    </button>
                  </LedgerCard>

                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar fornecedor pelo nome..." style={{ ...inputStyle, width: "100%", paddingLeft: 34 }} />
                  </div>

                  {fornecedoresFiltrados.length === 0 ? (
                    <div style={{ padding: "20px 6px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Nenhum fornecedor cadastrado ainda.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {fornecedoresFiltrados.map((f) => (
                        <ResumoCard
                          key={f.nome}
                          nome={f.nome}
                          total={f.total}
                          pago={f.pago}
                          saldo={f.saldo}
                          lancamentos={f.lancamentos}
                          pagamentos={f.pagamentos}
                          labelExtra="Dívida"
                          onRegistrarPagamento={() => setModal({ type: "pagamentoF", nome: f.nome, saldo: Math.max(f.saldo, 0) })}
                          onEditarLancamento={(l) => setModal({ type: "divida", initial: l })}
                          onExcluirLancamento={excluirDivida}
                          onExcluirPagamento={excluirPagamentoFornecedor}
                        />
                      ))}
                    </div>
                  )}

                  {topFornecedores.length > 0 && (
                    <LedgerCard style={{ padding: 18 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Fornecedores que mais devemos</div>
                      <RankingList itens={topFornecedores} />
                    </LedgerCard>
                  )}
                </div>
              )}

              {tab === "fiado" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 780 }}>
                  <h1 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Fiado</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Fiado no mês" value={formatBRL(fiadoNoMes)} icon={TrendingDown} tone="down" />
                    <StatCard label="Recebido no mês" value={formatBRL(recebidoNoMes)} icon={TrendingUp} tone="up" />
                    <StatCard label="Saldo do mês" value={formatBRL(recebidoNoMes - fiadoNoMes)} icon={Wallet} tone={recebidoNoMes - fiadoNoMes >= 0 ? "up" : "down"} />
                  </div>

                  <LedgerCard style={{ padding: 18 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Nova venda fiado</div>
                    <button
                      onClick={() => setModal({ type: "fiado" })}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}
                    >
                      <Plus size={15} /> Nova venda fiado
                    </button>
                  </LedgerCard>

                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente pelo nome..." style={{ ...inputStyle, width: "100%", paddingLeft: 34 }} />
                  </div>

                  {clientesFiltrados.length === 0 ? (
                    <div style={{ padding: "20px 6px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Nenhum cliente fiado cadastrado ainda.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {clientesFiltrados.map((c) => (
                        <ResumoCard
                          key={c.nome}
                          nome={c.nome}
                          total={c.total}
                          pago={c.pago}
                          saldo={c.saldo}
                          lancamentos={c.lancamentos}
                          pagamentos={c.pagamentos}
                          labelExtra="Venda fiado"
                          onRegistrarPagamento={() => setModal({ type: "pagamentoC", nome: c.nome, saldo: Math.max(c.saldo, 0) })}
                          onEditarLancamento={(l) => setModal({ type: "fiado", initial: l })}
                          onExcluirLancamento={excluirFiado}
                          onExcluirPagamento={excluirPagamentoCliente}
                        />
                      ))}
                    </div>
                  )}

                  {topClientes.length > 0 && (
                    <LedgerCard style={{ padding: 18 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Clientes que mais nos devem</div>
                      <RankingList itens={topClientes} />
                    </LedgerCard>
                  )}
                </div>
              )}

              {tab === "vendas" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 780 }}>
                  <h1 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Vendas de aparelhos</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Faturado no mês" value={formatBRL(faturadoNoMes)} icon={TrendingUp} tone="up" />
                    <StatCard label="Custo no mês" value={formatBRL(custoNoMes)} icon={TrendingDown} tone="down" />
                    <StatCard label="Lucro no mês" value={formatBRL(lucroNoMes)} icon={Wallet} tone={lucroNoMes >= 0 ? "up" : "down"} />
                  </div>

                  <LedgerCard style={{ padding: 18 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Nova venda de aparelho</div>
                    <button
                      onClick={() => setModal({ type: "venda" })}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}
                    >
                      <Plus size={15} /> Nova venda
                    </button>
                  </LedgerCard>

                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, aparelho ou IMEI..." style={{ ...inputStyle, width: "100%", paddingLeft: 34 }} />
                  </div>

                  {vendasFiltradas.length === 0 ? (
                    <div style={{ padding: "20px 6px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Nenhuma venda registrada ainda.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {vendasFiltradas
                        .slice()
                        .sort((a, b) => (a.data < b.data ? 1 : -1))
                        .map((v) => {
                          const lucro = v.valorVenda - v.custo;
                          return (
                            <LedgerCard key={v.id} style={{ padding: "14px 16px", borderLeft: `3px solid ${lucro >= 0 ? "var(--green)" : "var(--rust)"}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                <div>
                                  <strong style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--ink)" }}>{v.cliente}</strong>
                                  {v.telefone && <span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: 8 }}>{v.telefone}</span>}
                                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{v.aparelho}</div>
                                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--muted)", marginTop: 3 }}>IMEI: {v.imei}</div>
                                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{formatDateBR(v.data)}</div>
                                  {v.observacao && <div style={{ fontSize: 11.5, color: "var(--ink)", marginTop: 3, fontStyle: "italic" }}>{v.observacao}</div>}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Lucro</span>
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: lucro >= 0 ? "var(--green)" : "var(--rust)" }}>{formatBRL(lucro)}</span>
                                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>venda {formatBRL(v.valorVenda)} · custo {formatBRL(v.custo)}</span>
                                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                                    <button onClick={() => setModal({ type: "venda", initial: v })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}><Pencil size={13} /></button>
                                    <button onClick={() => excluirVenda(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 2 }}><Trash2 size={13} /></button>
                                  </div>
                                </div>
                              </div>
                            </LedgerCard>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {tab === "resumo" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 780 }}>
                  <h1 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Resumo geral</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Total a pagar" value={formatBRL(totalAPagar)} icon={TrendingDown} tone="down" />
                    <StatCard label="Total a receber" value={formatBRL(totalAReceber)} icon={TrendingUp} tone="up" />
                    <StatCard label="Saldo líquido" value={formatBRL(saldoLiquido)} icon={Wallet} tone={saldoLiquido >= 0 ? "up" : "down"} />
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Lucro no mês (aparelhos)" value={formatBRL(lucroNoMes)} icon={Smartphone} tone={lucroNoMes >= 0 ? "up" : "down"} />
                    <StatCard label="Lucro total (aparelhos)" value={formatBRL(lucroTotal)} icon={Wallet} tone={lucroTotal >= 0 ? "up" : "down"} />
                  </div>

                  {topFornecedores.length > 0 && (
                    <LedgerCard style={{ padding: 18 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Fornecedores que mais devemos</div>
                      <RankingList itens={topFornecedores} />
                    </LedgerCard>
                  )}

                  {topClientes.length > 0 && (
                    <LedgerCard style={{ padding: 18 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Clientes que mais nos devem</div>
                      <RankingList itens={topClientes} />
                    </LedgerCard>
                  )}

                  {topFornecedores.length === 0 && topClientes.length === 0 && (
                    <div style={{ padding: "20px 6px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Sem saldos em aberto no momento. 🎉</div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {modal && modal.type === "divida" && <DividaModal initial={modal.initial} onSave={salvarDivida} onClose={() => setModal(null)} />}
      {modal && modal.type === "fiado" && <FiadoModal initial={modal.initial} onSave={salvarFiado} onClose={() => setModal(null)} />}
      {modal && modal.type === "venda" && <VendaModal initial={modal.initial} onSave={salvarVenda} onClose={() => setModal(null)} />}
      {modal && modal.type === "pagamentoF" && (
        <PagamentoModal nome={modal.nome} saldoRestante={modal.saldo} onSave={(p) => registrarPagamentoFornecedor(modal.nome, p)} onClose={() => setModal(null)} />
      )}
      {modal && modal.type === "pagamentoC" && (
        <PagamentoModal nome={modal.nome} saldoRestante={modal.saldo} onSave={(p) => registrarPagamentoCliente(modal.nome, p)} onClose={() => setModal(null)} />
      )}
      {selectedDia && <DiaDetalheModal iso={selectedDia} eventos={eventosDoDia(selectedDia)} onClose={() => setSelectedDia(null)} />}
    </div>
  );
}

// ---------- Export: senha antes de tudo ----------
export default function ControlePessoal() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem("pessoal_unlocked") === "true"; } catch (e) { return false; }
  });

  function lock() {
    try { sessionStorage.removeItem("pessoal_unlocked"); } catch (e) {}
    setUnlocked(false);
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <ControlePessoalApp onSair={lock} />;
}

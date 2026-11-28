import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Trash2, Pencil, X, TrendingUp, TrendingDown, Wallet, Lock,
  Search, ChevronLeft, ChevronRight, Package, Users, BarChart3, LogOut, Smartphone, ShoppingBag, Archive, Footprints,
} from "lucide-react";
import { supabase, avisarErro } from "./App.jsx";

// Fornecedores sugeridos (reaproveitados do sistema da Astrotech). O campo
// continua sendo texto livre — isso aqui é só sugestão de autocompletar.
const FORNECEDORES_SUGERIDOS = ["Pistori", "Mega Cell", "Viccelli", "Bruno/Acidente", "Fast Phone", "WD Imports", "Willian Fontes"];

const SENHA_ACESSO = "160805";

const CATEGORIAS = [{ id: "sneaker", label: "Sneaker" }, { id: "celular", label: "Celular" }];
const ORIGENS = [{ id: "consignacao", label: "Consignação" }, { id: "compra", label: "Compra" }];
const CONDICOES = ["Novo", "Seminovo", "Usado"];

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

// Dívida com fornecedor criada automaticamente a partir de uma venda de aparelho.
const idDividaDaVenda = (vendaId) => `v-${vendaId}`;
// Dívida com fornecedor criada quando uma peça COMPRADA entra no estoque.
const idDividaDoEstoque = (estoqueId) => `e-${estoqueId}`;

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
    id: row.id, cliente: row.cliente, telefone: row.telefone || "", aparelho: row.aparelho, imei: row.imei || "",
    custo: Number(row.custo), valorVenda: Number(row.valor_venda), data: row.data, observacao: row.observacao || "",
    categoria: row.categoria || "celular", tamanho: row.tamanho || "", condicao: row.condicao || "",
    origem: row.origem || "compra", estoqueId: row.estoque_id || null,
  };
}
function rowToEstoque(row) {
  return {
    id: row.id, categoria: row.categoria || "sneaker", modelo: row.modelo, tamanho: row.tamanho || "", condicao: row.condicao || "",
    origem: row.origem || "consignacao", dono: row.dono || "", custo: Number(row.custo) || 0,
    preco: row.preco != null ? Number(row.preco) : null, status: row.status || "disponivel", data: row.data, observacao: row.observacao || "",
  };
}
function diasDesde(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(todayStr()) - new Date(iso)) / 86400000));
}

async function loadTabela(nome, mapper, orderBy = "data") {
  const { data, error } = await supabase.from(nome).select("*").order(orderBy, { ascending: false });
  if (error) {
    avisarErro(`carregar os dados (${nome})`, error);
    return [];
  }
  return (data || []).map(mapper);
}
async function upsertLinha(nome, payload) {
  const { error } = await supabase.from(nome).upsert(payload);
  if (error) avisarErro(`salvar (${nome})`, error);
}
async function deleteLinha(nome, id) {
  const { error } = await supabase.from(nome).delete().eq("id", id);
  if (error) avisarErro(`excluir (${nome})`, error);
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

function Segmented({ options, value, onChange, small }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const ativo = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              flex: small ? "0 0 auto" : 1, padding: small ? "6px 12px" : "9px 10px", borderRadius: small ? 20 : 5, cursor: "pointer",
              fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: small ? 12 : 13,
              border: ativo ? "1px solid var(--choc)" : "1px solid var(--paper-line)",
              background: ativo ? "var(--choc)" : "#FFFDF8", color: ativo ? "var(--paper)" : "var(--ink)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
function Badge({ children, tone }) {
  const cores = {
    choc: ["rgba(74,46,34,0.10)", "var(--choc)"], green: ["rgba(75,101,82,0.12)", "var(--green)"],
    rust: ["rgba(162,70,50,0.12)", "var(--rust)"], muted: ["rgba(122,106,94,0.12)", "var(--muted)"],
  }[tone || "muted"];
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", background: cores[0], color: cores[1] }}>{children}</span>;
}
function parseValor(v) {
  const t = String(v ?? "").trim();
  // "1.500,00" -> 1500.00 ; "1500.50" -> 1500.50 ; "1500,5" -> 1500.5
  return parseFloat(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
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
        @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400..900;1,400..900&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        :root { --bg:#EDE6DA; --paper:#FBF8F3; --paper-line:#DDD3C5; --ink:#1A1310; --green:#4B6552; --rust:#A24632; --muted:#7A6A5E; --choc:#4A2E22; --areia:#C9B49E; }
        * { box-sizing: border-box; }
      `}</style>
      <LedgerCard style={{ padding: 30, width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Lock size={20} color="var(--ink)" />
        </div>
        <h2 style={{ margin: "0 0 4px", fontFamily: "'Bodoni Moda', serif", fontSize: 19, fontWeight: 800, color: "var(--ink)" }}>Acesso restrito</h2>
        <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--muted)" }}>THE EDIT · Gestão — digite a senha para entrar.</p>
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
            style={{ padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}
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
            <h3 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{initial ? "Editar" : "Nova"} dívida com fornecedor</h3>
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
            <button type="submit" style={{ marginTop: 4, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
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
            <h3 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{initial ? "Editar" : "Nova"} venda fiado</h3>
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
            <button type="submit" style={{ marginTop: 4, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
              Adicionar
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Modal shell ----------
function ModalShell({ titulo, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,19,16,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "92vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>{titulo}</h3>
            <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
          </div>
          {children}
        </LedgerCard>
      </div>
    </div>
  );
}
const monoInput = { ...inputStyle, fontFamily: "'JetBrains Mono', monospace" };
const btnPrimario = { marginTop: 4, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5 };

// ---------- Modal: nova/editar venda (sneaker ou celular) ----------
function VendaModal({ initial, fornecedorInicial, fornecedores, dividaJaLancada, onSave, onClose }) {
  const [categoria, setCategoria] = useState(initial?.categoria || "sneaker");
  const [origem, setOrigem] = useState(initial?.origem || "compra");
  const [cliente, setCliente] = useState(initial?.cliente || "");
  const [telefone, setTelefone] = useState(initial?.telefone || "");
  const [aparelho, setAparelho] = useState(initial?.aparelho || "");
  const [imei, setImei] = useState(initial?.imei || "");
  const [tamanho, setTamanho] = useState(initial?.tamanho || "");
  const [condicao, setCondicao] = useState(initial?.condicao || "Seminovo");
  const [fornecedor, setFornecedor] = useState(fornecedorInicial || "");
  const [custo, setCusto] = useState(initial?.custo != null ? String(initial.custo) : "");
  const [valorVenda, setValorVenda] = useState(initial?.valorVenda != null ? String(initial.valorVenda) : "");
  const [data, setData] = useState(initial?.data || todayStr());
  const [observacao, setObservacao] = useState(initial?.observacao || "");
  const [error, setError] = useState("");

  const sneaker = categoria === "sneaker";
  const consig = origem === "consignacao";
  const doEstoque = !!initial?.estoqueId;
  const lucroPrevisto = (parseValor(valorVenda) || 0) - (parseValor(custo) || 0);

  function handleSubmit(e) {
    e.preventDefault();
    if (!cliente.trim()) { setError("Informe o cliente."); return; }
    if (!aparelho.trim()) { setError(sneaker ? "Informe o modelo." : "Informe o aparelho."); return; }
    if (!sneaker && !imei.trim()) { setError("Informe o IMEI."); return; }
    if (sneaker && !tamanho.trim()) { setError("Informe o tamanho."); return; }
    const c = parseValor(custo);
    const v = parseValor(valorVenda);
    if (!v || v <= 0) { setError("Informe um valor de venda válido."); return; }
    if (isNaN(c) || c < 0) { setError(consig ? "Informe o valor do repasse ao dono." : "Informe um valor de custo válido."); return; }
    if (consig && !dividaJaLancada && !fornecedor.trim()) { setError("Informe o dono da peça."); return; }
    if (fornecedor.trim() && !dividaJaLancada && !(c > 0)) { setError("Informe o valor para lançar a dívida em Fornecedores."); return; }
    const digitado = fornecedor.trim();
    const existente = fornecedores.find((f) => f.toLowerCase() === digitado.toLowerCase());
    onSave({
      id: initial?.id || uid(), cliente: cliente.trim(), telefone: telefone.trim(), aparelho: aparelho.trim(),
      imei: sneaker ? "" : imei.trim(), custo: c, valorVenda: v, data, observacao: observacao.trim(),
      categoria, origem, tamanho: sneaker ? tamanho.trim() : "", condicao: sneaker ? condicao : "",
      estoqueId: initial?.estoqueId || null,
      fornecedor: dividaJaLancada ? "" : existente || digitado,
    });
  }

  return (
    <ModalShell titulo={`${initial?.id ? "Editar" : "Nova"} venda`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!doEstoque && (
          <>
            <Field label="Categoria"><Segmented options={CATEGORIAS} value={categoria} onChange={setCategoria} /></Field>
            <Field label="Origem da peça"><Segmented options={ORIGENS} value={origem} onChange={setOrigem} /></Field>
          </>
        )}
        {doEstoque && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", background: "var(--bg)", borderRadius: 5, padding: "8px 10px" }}>
            Peça do estoque · {consig ? "consignada" : "própria"}. Ao salvar, ela sai do estoque como vendida.
          </div>
        )}
        <Field label="Cliente">
          <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" style={inputStyle} />
        </Field>
        <Field label="Telefone (opcional)">
          <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(65) 99999-0000" style={inputStyle} />
        </Field>
        <Field label={sneaker ? "Modelo" : "Aparelho"}>
          <input type="text" value={aparelho} onChange={(e) => setAparelho(e.target.value)} placeholder={sneaker ? "Nike Dunk Low Panda" : "iPhone 13 128GB"} style={inputStyle} />
        </Field>
        {sneaker ? (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Tamanho">
                <input type="text" inputMode="decimal" value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="41" style={monoInput} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Condição">
                <select value={condicao} onChange={(e) => setCondicao(e.target.value)} style={inputStyle}>
                  {CONDICOES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
        ) : (
          <Field label="IMEI">
            <input type="text" inputMode="numeric" value={imei} onChange={(e) => setImei(e.target.value)} placeholder="356789104561234" style={monoInput} />
          </Field>
        )}
        {dividaJaLancada ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>A compra desta peça já está lançada em Fornecedores.</div>
        ) : (
          <Field label={consig ? "Dono da peça (consignante)" : "Fornecedor (de quem comprou)"}>
            <input list="lista-fornecedores-venda" type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder={consig ? "Nome de quem deixou a peça" : "Escolha ou digite — vazio se já é seu"} style={inputStyle} />
            <datalist id="lista-fornecedores-venda">
              {fornecedores.map((f) => <option key={f} value={f} />)}
            </datalist>
          </Field>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label={consig ? "Repasse ao dono (R$)" : "Custo (R$)"}>
              <input type="text" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" style={monoInput} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Valor de venda (R$)">
              <input type="text" inputMode="decimal" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" style={monoInput} />
            </Field>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: lucroPrevisto >= 0 ? "var(--green)" : "var(--rust)", fontWeight: 600 }}>
          {consig ? "Sua comissão" : "Lucro"}: {formatBRL(lucroPrevisto)}
        </div>
        <Field label="Data">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Observação (opcional)">
          <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder={sneaker ? "Com caixa e nota" : "Garantia de 3 meses"} style={inputStyle} />
        </Field>
        {fornecedor.trim() && !dividaJaLancada && (
          <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", borderRadius: 5, padding: "8px 10px" }}>
            {consig ? "O repasse" : "O custo"} vai como dívida em aberto com <strong style={{ color: "var(--ink)" }}>{fornecedor.trim()}</strong> na aba Fornecedores. Quando pagar, é só tocar em "Registrar pagamento" lá.
          </div>
        )}
        {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
        <button type="submit" style={btnPrimario}>Salvar venda</button>
      </form>
    </ModalShell>
  );
}

// ---------- Modal: peça no estoque ----------
function EstoqueModal({ initial, fornecedores, onSave, onClose }) {
  const [categoria, setCategoria] = useState(initial?.categoria || "sneaker");
  const [origem, setOrigem] = useState(initial?.origem || "consignacao");
  const [modelo, setModelo] = useState(initial?.modelo || "");
  const [tamanho, setTamanho] = useState(initial?.tamanho || "");
  const [condicao, setCondicao] = useState(initial?.condicao || "Seminovo");
  const [dono, setDono] = useState(initial?.dono || "");
  const [custo, setCusto] = useState(initial?.custo != null ? String(initial.custo) : "");
  const [preco, setPreco] = useState(initial?.preco != null ? String(initial.preco) : "");
  const [data, setData] = useState(initial?.data || todayStr());
  const [observacao, setObservacao] = useState(initial?.observacao || "");
  const [error, setError] = useState("");
  const sneaker = categoria === "sneaker";
  const consig = origem === "consignacao";

  function handleSubmit(e) {
    e.preventDefault();
    if (!modelo.trim()) { setError(sneaker ? "Informe o modelo." : "Informe o aparelho."); return; }
    if (sneaker && !tamanho.trim()) { setError("Informe o tamanho."); return; }
    if (consig && !dono.trim()) { setError("Informe o dono da peça."); return; }
    const c = custo.trim() === "" ? 0 : parseValor(custo);
    if (isNaN(c) || c < 0) { setError("Valor inválido."); return; }
    const p = preco.trim() === "" ? null : parseValor(preco);
    if (p != null && (isNaN(p) || p <= 0)) { setError("Preço de venda inválido."); return; }
    const digitado = dono.trim();
    const existente = fornecedores.find((f) => f.toLowerCase() === digitado.toLowerCase());
    onSave({
      id: initial?.id || uid(), categoria, origem, modelo: modelo.trim(), tamanho: sneaker ? tamanho.trim() : "",
      condicao, dono: existente || digitado, custo: c, preco: p, status: initial?.status || "disponivel", data, observacao: observacao.trim(),
    });
  }

  return (
    <ModalShell titulo={`${initial ? "Editar" : "Nova"} peça no estoque`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Categoria"><Segmented options={CATEGORIAS} value={categoria} onChange={setCategoria} /></Field>
        <Field label="Origem"><Segmented options={ORIGENS} value={origem} onChange={setOrigem} /></Field>
        <Field label={sneaker ? "Modelo" : "Aparelho"}>
          <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder={sneaker ? "Air Jordan 1 Mocha" : "iPhone 13 128GB"} style={inputStyle} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          {sneaker && (
            <div style={{ flex: 1 }}>
              <Field label="Tamanho">
                <input type="text" inputMode="decimal" value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="41" style={monoInput} />
              </Field>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <Field label="Condição">
              <select value={condicao} onChange={(e) => setCondicao(e.target.value)} style={inputStyle}>
                {CONDICOES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <Field label={consig ? "Dono da peça (consignante)" : "Fornecedor (opcional)"}>
          <input list="lista-fornecedores-estoque" type="text" value={dono} onChange={(e) => setDono(e.target.value)} placeholder={consig ? "Quem deixou a peça" : "De quem comprou"} style={inputStyle} />
          <datalist id="lista-fornecedores-estoque">
            {fornecedores.map((f) => <option key={f} value={f} />)}
          </datalist>
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label={consig ? "Repasse ao dono (R$)" : "Quanto pagou (R$)"}>
              <input type="text" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" style={monoInput} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Preço pedido (R$)">
              <input type="text" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" style={monoInput} />
            </Field>
          </div>
        </div>
        <Field label="Data de entrada">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Observação (opcional)">
          <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Com caixa · prazo de 60 dias" style={inputStyle} />
        </Field>
        {!consig && dono.trim() && (parseValor(custo) || 0) > 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", borderRadius: 5, padding: "8px 10px" }}>
            A compra entra como dívida com <strong style={{ color: "var(--ink)" }}>{dono.trim()}</strong> em Fornecedores agora. Na venda, não lança de novo.
          </div>
        )}
        {consig && (
          <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", borderRadius: 5, padding: "8px 10px" }}>
            Consignado: nada sai do seu bolso agora. O repasse ao dono vira dívida só quando a peça for vendida.
          </div>
        )}
        {error && <div style={{ color: "var(--rust)", fontSize: 12.5 }}>{error}</div>}
        <button type="submit" style={btnPrimario}>Salvar peça</button>
      </form>
    </ModalShell>
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
            <h3 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 16.5, fontWeight: 700, color: "var(--ink)" }}>Registrar pagamento</h3>
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
            <h3 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 16.5, fontWeight: 700, color: "var(--ink)" }}>{formatDateBR(iso)}</h3>
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
        <strong style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 15, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase" }}>{nome}</strong>
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
          <button onClick={onRegistrarPagamento} style={{ padding: "7px 12px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12 }}>
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
    { id: "vendas", label: "Vendas", icon: ShoppingBag },
    { id: "estoque", label: "Estoque", icon: Archive },
    { id: "fornecedores", label: "Fornecedores", icon: Package },
    { id: "fiado", label: "Fiado", icon: Users },
    { id: "resumo", label: "Resumo", icon: BarChart3 },
  ];
  return (
    <aside className="pc-sidebar" style={{ width: 210, flexShrink: 0, background: "var(--paper)", borderRight: "1px solid var(--paper-line)", padding: "22px 0", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0 20px 18px" }}>
        <div style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 24, fontWeight: 500, letterSpacing: "0.14em", color: "var(--choc)" }}>THE EDIT</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, letterSpacing: "0.24em", color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>GESTÃO · SNEAKERS E CELULARES</div>
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
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("vendas");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [tamFiltro, setTamFiltro] = useState("todos");
  const [mostrarVendidas, setMostrarVendidas] = useState(false);
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null); // {type: 'divida'|'fiado'|'pagamentoF'|'pagamentoC', initial?, nome?, saldo?}
  const [selectedDia, setSelectedDia] = useState(null);

  useEffect(() => {
    (async () => {
      const [d, pf, f, pc, v, es] = await Promise.all([
        loadTabela("pessoal_dividas", rowToDivida),
        loadTabela("pessoal_pagamentos", rowToPagamentoFornecedor),
        loadTabela("pessoal_fiado", rowToFiado),
        loadTabela("pessoal_fiado_pagamentos", rowToPagamentoFiado),
        loadTabela("pessoal_vendas", rowToVenda),
        loadTabela("pessoal_estoque", rowToEstoque),
      ]);
      setDividas(d); setPagamentosF(pf); setFiados(f); setPagamentosC(pc); setVendas(v); setEstoque(es);
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

  function upsertDividaLocal(divida) {
    setDividas((prev) => (prev.some((d) => d.id === divida.id) ? prev.map((d) => (d.id === divida.id ? divida : d)) : [divida, ...prev]));
    upsertLinha("pessoal_dividas", divida);
  }
  function removerDividaLocal(id) {
    if (!dividas.some((d) => d.id === id)) return;
    setDividas((prev) => prev.filter((d) => d.id !== id));
    deleteLinha("pessoal_dividas", id);
  }
  function marcarEstoque(id, status) {
    const it = estoque.find((e) => e.id === id);
    if (!it || it.status === status) return;
    const novo = { ...it, status };
    setEstoque((prev) => prev.map((e) => (e.id === id ? novo : e)));
    upsertLinha("pessoal_estoque", novo);
  }

  function salvarVenda({ fornecedor, ...item }) {
    const exists = vendas.some((v) => v.id === item.id);
    setVendas((prev) => (exists ? prev.map((v) => (v.id === item.id ? item : v)) : [item, ...prev]));
    upsertLinha("pessoal_vendas", {
      id: item.id, cliente: item.cliente, telefone: item.telefone, aparelho: item.aparelho,
      imei: item.imei || null, custo: item.custo, valor_venda: item.valorVenda, data: item.data, observacao: item.observacao,
      categoria: item.categoria, tamanho: item.tamanho || null, condicao: item.condicao || null, origem: item.origem, estoque_id: item.estoqueId,
    });

    // Lança (ou atualiza) automaticamente a dívida com o fornecedor / repasse ao dono da peça.
    const dividaId = idDividaDaVenda(item.id);
    if (fornecedor) {
      const detalhe = [item.aparelho, item.tamanho ? `tam ${item.tamanho}` : "", item.imei ? `IMEI ${item.imei}` : "", `venda p/ ${item.cliente}`].filter(Boolean).join(" · ");
      upsertDividaLocal({
        id: dividaId, fornecedor, valor: item.custo, vendedor: "", data: item.data,
        observacao: item.origem === "consignacao" ? `Repasse consignação · ${detalhe}` : detalhe,
      });
    } else {
      removerDividaLocal(dividaId);
    }
    if (item.estoqueId) marcarEstoque(item.estoqueId, "vendido");
    setModal(null);
  }
  function excluirVenda(id) {
    const venda = vendas.find((v) => v.id === id);
    setVendas((prev) => prev.filter((v) => v.id !== id));
    deleteLinha("pessoal_vendas", id);
    removerDividaLocal(idDividaDaVenda(id));
    if (venda?.estoqueId) marcarEstoque(venda.estoqueId, "disponivel");
  }

  function salvarEstoque(item) {
    setEstoque((prev) => (prev.some((e) => e.id === item.id) ? prev.map((e) => (e.id === item.id ? item : e)) : [item, ...prev]));
    upsertLinha("pessoal_estoque", item);
    // Peça COMPRADA: a dívida com o fornecedor nasce na entrada do estoque.
    const did = idDividaDoEstoque(item.id);
    if (item.origem === "compra" && item.dono && item.custo > 0) {
      upsertDividaLocal({
        id: did, fornecedor: item.dono, valor: item.custo, vendedor: "", data: item.data,
        observacao: `Compra p/ estoque · ${item.modelo}${item.tamanho ? ` · tam ${item.tamanho}` : ""}`,
      });
    } else {
      removerDividaLocal(did);
    }
    setModal(null);
  }
  function excluirEstoque(id) {
    setEstoque((prev) => prev.filter((e) => e.id !== id));
    deleteLinha("pessoal_estoque", id);
    removerDividaLocal(idDividaDoEstoque(id));
  }
  function venderDoEstoque(e) {
    setModal({
      type: "venda",
      fornecedorInicial: e.origem === "consignacao" ? e.dono : "",
      initial: {
        aparelho: e.modelo, categoria: e.categoria, tamanho: e.tamanho, condicao: e.condicao, origem: e.origem,
        custo: e.custo, valorVenda: e.preco, estoqueId: e.id,
      },
    });
  }

  const nomesFornecedores = useMemo(() => {
    const nomes = [];
    [...dividas.map((d) => d.fornecedor), ...pagamentosF.map((p) => p.fornecedor), ...FORNECEDORES_SUGERIDOS].forEach((n) => {
      if (n && !nomes.some((x) => x.toLowerCase() === n.toLowerCase())) nomes.push(n);
    });
    return nomes;
  }, [dividas, pagamentosF]);
  const fornecedorDaVenda = (vendaId) => dividas.find((d) => d.id === idDividaDaVenda(vendaId))?.fornecedor || "";

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
  const vendasDaCategoria = useMemo(() => (catFiltro === "todas" ? vendas : vendas.filter((v) => v.categoria === catFiltro)), [vendas, catFiltro]);
  const vendasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return vendasDaCategoria.filter((v) => v.cliente.toLowerCase().includes(termo) || (v.imei || "").toLowerCase().includes(termo) || v.aparelho.toLowerCase().includes(termo));
  }, [vendasDaCategoria, busca]);

  const vendasDoMes = useMemo(() => vendasDaCategoria.filter((v) => v.data?.startsWith(monthFilter)), [vendasDaCategoria, monthFilter]);
  const faturadoNoMes = vendasDoMes.reduce((s, v) => s + v.valorVenda, 0);
  const custoNoMes = vendasDoMes.reduce((s, v) => s + v.custo, 0);
  const lucroNoMes = faturadoNoMes - custoNoMes;
  const lucroTotal = vendas.reduce((s, v) => s + (v.valorVenda - v.custo), 0);
  const lucroMesCat = (cat) => vendas.filter((v) => v.categoria === cat && v.data?.startsWith(monthFilter)).reduce((s, v) => s + (v.valorVenda - v.custo), 0);
  const lucroMesGeral = vendas.filter((v) => v.data?.startsWith(monthFilter)).reduce((s, v) => s + (v.valorVenda - v.custo), 0);
  const mudarMes = (delta) => { const [y, m] = monthFilter.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };

  // ---- Estoque ----
  const estoqueDisponivel = useMemo(() => estoque.filter((e) => e.status === "disponivel"), [estoque]);
  const tamanhosEstoque = useMemo(() => {
    const set = new Set(estoqueDisponivel.filter((e) => e.tamanho).map((e) => e.tamanho));
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [estoqueDisponivel]);
  const estoqueVisivel = useMemo(() => {
    const termo = busca.toLowerCase();
    return estoque
      .filter((e) => (mostrarVendidas ? true : e.status === "disponivel"))
      .filter((e) => (tamFiltro === "todos" ? true : e.tamanho === tamFiltro))
      .filter((e) => e.modelo.toLowerCase().includes(termo) || e.dono.toLowerCase().includes(termo))
      .sort((a, b) => (a.status === b.status ? (a.data < b.data ? 1 : -1) : a.status === "disponivel" ? -1 : 1));
  }, [estoque, mostrarVendidas, tamFiltro, busca]);
  const valorEstoque = estoqueDisponivel.reduce((s, e) => s + (e.preco || 0), 0);
  const lucroPotencial = estoqueDisponivel.filter((e) => e.preco).reduce((s, e) => s + (e.preco - e.custo), 0);

  // ---- Resumo geral ----
  const totalAPagar = resumoFornecedores.reduce((s, f) => s + Math.max(f.saldo, 0), 0);
  const totalAReceber = resumoClientes.reduce((s, c) => s + Math.max(c.saldo, 0), 0);
  const saldoLiquido = totalAReceber - totalAPagar;

  const topFornecedores = resumoFornecedores.filter((f) => f.saldo > 0).slice(0, 6).map((f) => ({ nome: f.nome, total: f.saldo }));
  const topClientes = resumoClientes.filter((c) => c.saldo > 0).slice(0, 6).map((c) => ({ nome: c.nome, total: c.saldo }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400..900;1,400..900&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        :root { --bg:#EDE6DA; --paper:#FBF8F3; --paper-line:#DDD3C5; --ink:#1A1310; --green:#4B6552; --rust:#A24632; --muted:#7A6A5E; --choc:#4A2E22; --areia:#C9B49E; }
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
                  <h1 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Fornecedores</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Pego no mês" value={formatBRL(pegoNoMes)} icon={TrendingDown} tone="down" />
                    <StatCard label="Pago no mês" value={formatBRL(pagoNoMes)} icon={TrendingUp} tone="up" />
                    <StatCard label="Saldo do mês" value={formatBRL(saldoDoMes)} icon={Wallet} tone={saldoDoMes >= 0 ? "up" : "down"} />
                  </div>

                  <LedgerCard style={{ padding: "16px 16px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <button onClick={() => { const [y, m] = monthFilter.split("-").map(Number); const d = new Date(y, m - 2, 1); setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}><ChevronLeft size={18} /></button>
                      <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 800, fontSize: 14, color: "var(--ink)", textTransform: "uppercase" }}>{monthLabel(monthFilter)}</span>
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
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}
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
                  <h1 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Fiado</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Fiado no mês" value={formatBRL(fiadoNoMes)} icon={TrendingDown} tone="down" />
                    <StatCard label="Recebido no mês" value={formatBRL(recebidoNoMes)} icon={TrendingUp} tone="up" />
                    <StatCard label="Saldo do mês" value={formatBRL(recebidoNoMes - fiadoNoMes)} icon={Wallet} tone={recebidoNoMes - fiadoNoMes >= 0 ? "up" : "down"} />
                  </div>

                  <LedgerCard style={{ padding: 18 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Nova venda fiado</div>
                    <button
                      onClick={() => setModal({ type: "fiado" })}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h1 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 28, fontWeight: 500, color: "var(--ink)" }}>Vendas</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => mudarMes(-1)} aria-label="Mês anterior" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}><ChevronLeft size={18} /></button>
                      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12.5, letterSpacing: "0.08em", color: "var(--ink)", textTransform: "uppercase", minWidth: 74, textAlign: "center" }}>{monthLabel(monthFilter)}</span>
                      <button onClick={() => mudarMes(1)} aria-label="Próximo mês" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}><ChevronRight size={18} /></button>
                    </div>
                  </div>
                  <Segmented small options={[{ id: "todas", label: "Todas" }, { id: "sneaker", label: "Sneakers" }, { id: "celular", label: "Celulares" }]} value={catFiltro} onChange={setCatFiltro} />

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Faturado no mês" value={formatBRL(faturadoNoMes)} icon={TrendingUp} tone="up" />
                    <StatCard label="Custo no mês" value={formatBRL(custoNoMes)} icon={TrendingDown} tone="down" />
                    <StatCard label="Lucro no mês" value={formatBRL(lucroNoMes)} icon={Wallet} tone={lucroNoMes >= 0 ? "up" : "down"} />
                  </div>

                  <LedgerCard style={{ padding: 18 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Nova venda · se a peça está no estoque, venda pela aba Estoque</div>
                    <button
                      onClick={() => setModal({ type: "venda" })}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}
                    >
                      <Plus size={15} /> Nova venda
                    </button>
                  </LedgerCard>

                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, modelo ou IMEI..." style={{ ...inputStyle, width: "100%", paddingLeft: 34 }} />
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
                          const consig = v.origem === "consignacao";
                          return (
                            <LedgerCard key={v.id} style={{ padding: "14px 16px", borderLeft: `3px solid ${lucro >= 0 ? "var(--green)" : "var(--rust)"}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                <div>
                                  <strong style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--ink)" }}>{v.cliente}</strong>
                                  {v.telefone && <span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: 8 }}>{v.telefone}</span>}
                                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                                    <Badge tone={v.categoria === "sneaker" ? "choc" : "muted"}>{v.categoria === "sneaker" ? "Sneaker" : "Celular"}</Badge>
                                    {consig && <Badge tone="green">Consignado</Badge>}
                                  </div>
                                  <div style={{ fontSize: 12.5, color: "var(--ink)", marginTop: 5 }}>{v.aparelho}</div>
                                  {v.categoria === "sneaker" ? (
                                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>Tam {v.tamanho || "—"}{v.condicao ? ` · ${v.condicao}` : ""}</div>
                                  ) : (
                                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--muted)", marginTop: 3 }}>IMEI: {v.imei || "—"}</div>
                                  )}
                                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{formatDateBR(v.data)}</div>
                                  {fornecedorDaVenda(v.id) && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{consig ? "Dono" : "Fornecedor"}: <strong style={{ color: "var(--ink)" }}>{fornecedorDaVenda(v.id)}</strong></div>}
                                  {v.observacao && <div style={{ fontSize: 11.5, color: "var(--ink)", marginTop: 3, fontStyle: "italic" }}>{v.observacao}</div>}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>{consig ? "Comissão" : "Lucro"}</span>
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: lucro >= 0 ? "var(--green)" : "var(--rust)" }}>{formatBRL(lucro)}</span>
                                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>venda {formatBRL(v.valorVenda)} · {consig ? "repasse" : "custo"} {formatBRL(v.custo)}</span>
                                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                                    <button aria-label="Editar venda" onClick={() => setModal({ type: "venda", initial: v })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}><Pencil size={13} /></button>
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

              {tab === "estoque" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 780 }}>
                  <h1 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 28, fontWeight: 500, color: "var(--ink)" }}>Estoque</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Peças disponíveis" value={String(estoqueDisponivel.length)} icon={Archive} />
                    <StatCard label="Valor em estoque" value={formatBRL(valorEstoque)} icon={ShoppingBag} />
                    <StatCard label="Lucro potencial" value={formatBRL(lucroPotencial)} icon={TrendingUp} tone="up" />
                  </div>

                  <LedgerCard style={{ padding: 18 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>Entrou peça? Consignada ou comprada</div>
                    <button
                      onClick={() => setModal({ type: "estoque" })}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}
                    >
                      <Plus size={15} /> Nova peça
                    </button>
                  </LedgerCard>

                  {tamanhosEstoque.length > 0 && (
                    <Segmented small options={[{ id: "todos", label: "Todos" }, ...tamanhosEstoque.map((t) => ({ id: t, label: t }))]} value={tamFiltro} onChange={setTamFiltro} />
                  )}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                      <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                      <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por modelo ou dono..." style={{ ...inputStyle, width: "100%", paddingLeft: 34 }} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}>
                      <input type="checkbox" checked={mostrarVendidas} onChange={(e) => setMostrarVendidas(e.target.checked)} /> Mostrar vendidas
                    </label>
                  </div>

                  {estoqueVisivel.length === 0 ? (
                    <div style={{ padding: "20px 6px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Nenhuma peça aqui. Cadastre a primeira em "Nova peça".</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {estoqueVisivel.map((e) => {
                        const consig = e.origem === "consignacao";
                        const vendida = e.status === "vendido";
                        const dias = diasDesde(e.data);
                        const margem = e.preco ? e.preco - e.custo : null;
                        return (
                          <LedgerCard key={e.id} style={{ padding: "14px 16px", borderLeft: `3px solid ${vendida ? "var(--muted)" : "var(--choc)"}`, opacity: vendida ? 0.7 : 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                              <div>
                                <strong style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{e.modelo}</strong>
                                <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                                  {e.tamanho && <Badge tone="choc">Tam {e.tamanho}</Badge>}
                                  <Badge tone={consig ? "green" : "muted"}>{consig ? "Consignado" : "Próprio"}</Badge>
                                  {e.condicao && <Badge>{e.condicao}</Badge>}
                                  {vendida && <Badge tone="rust">Vendido</Badge>}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                                  {e.dono ? `${consig ? "Dono" : "Fornecedor"}: ${e.dono} · ` : ""}entrou {formatDateBR(e.data)}{!vendida ? ` · há ${dias} dia${dias === 1 ? "" : "s"}` : ""}
                                </div>
                                {!vendida && consig && dias > 45 && <div style={{ fontSize: 11.5, color: "var(--rust)", marginTop: 3, fontWeight: 600 }}>Parada há mais de 45 dias — reveja o preço com o dono.</div>}
                                {e.observacao && <div style={{ fontSize: 11.5, color: "var(--ink)", marginTop: 3, fontStyle: "italic" }}>{e.observacao}</div>}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Preço pedido</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{e.preco ? formatBRL(e.preco) : "—"}</span>
                                <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{consig ? "repasse" : "custo"} {formatBRL(e.custo)}{margem != null ? ` · ${consig ? "comissão" : "margem"} ${formatBRL(margem)}` : ""}</span>
                                <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                                  {!vendida && (
                                    <button onClick={() => venderDoEstoque(e)} style={{ padding: "6px 12px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--choc)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12 }}>Vender</button>
                                  )}
                                  <button aria-label="Editar peça" onClick={() => setModal({ type: "estoque", initial: e })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><Pencil size={13} /></button>
                                  {!vendida && <button aria-label="Excluir peça" onClick={() => excluirEstoque(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 4 }}><Trash2 size={13} /></button>}
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
                  <h1 style={{ margin: 0, fontFamily: "'Bodoni Moda', serif", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Resumo geral</h1>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Total a pagar" value={formatBRL(totalAPagar)} icon={TrendingDown} tone="down" />
                    <StatCard label="Total a receber" value={formatBRL(totalAReceber)} icon={TrendingUp} tone="up" />
                    <StatCard label="Saldo líquido" value={formatBRL(saldoLiquido)} icon={Wallet} tone={saldoLiquido >= 0 ? "up" : "down"} />
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label={`Lucro sneakers · ${monthLabel(monthFilter)}`} value={formatBRL(lucroMesCat("sneaker"))} icon={Footprints} tone={lucroMesCat("sneaker") >= 0 ? "up" : "down"} />
                    <StatCard label={`Lucro celulares · ${monthLabel(monthFilter)}`} value={formatBRL(lucroMesCat("celular"))} icon={Smartphone} tone={lucroMesCat("celular") >= 0 ? "up" : "down"} />
                    <StatCard label={`Lucro total · ${monthLabel(monthFilter)}`} value={formatBRL(lucroMesGeral)} icon={Wallet} tone={lucroMesGeral >= 0 ? "up" : "down"} />
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatCard label="Lucro desde o início" value={formatBRL(lucroTotal)} icon={TrendingUp} tone={lucroTotal >= 0 ? "up" : "down"} />
                    <StatCard label="Peças no estoque" value={String(estoqueDisponivel.length)} icon={Archive} />
                    <StatCard label="Valor em estoque" value={formatBRL(valorEstoque)} icon={ShoppingBag} />
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
      {modal && modal.type === "venda" && (() => {
        const est = estoque.find((e) => e.id === modal.initial?.estoqueId);
        const dividaJaLancada = !!(est && est.origem === "compra" && dividas.some((d) => d.id === idDividaDoEstoque(est.id)));
        return (
          <VendaModal
            initial={modal.initial}
            fornecedorInicial={modal.fornecedorInicial ?? (modal.initial?.id ? fornecedorDaVenda(modal.initial.id) : "")}
            fornecedores={nomesFornecedores}
            dividaJaLancada={dividaJaLancada}
            onSave={salvarVenda}
            onClose={() => setModal(null)}
          />
        );
      })()}
      {modal && modal.type === "estoque" && <EstoqueModal initial={modal.initial} fornecedores={nomesFornecedores} onSave={salvarEstoque} onClose={() => setModal(null)} />}
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

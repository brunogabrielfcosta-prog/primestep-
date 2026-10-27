import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Plus, Trash2, Pencil, X, TrendingUp, TrendingDown, Wallet, Check, Clock, Download, Upload, Calendar } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import ControlePessoal from "./ControlePessoal.jsx";

// Conexão com o banco de dados da Prime Step (Supabase).
// A chave abaixo é a chave pública ("anon"), feita para ser usada no navegador.
const SUPABASE_URL = "https://gwqbzquvjodwtzebbxra.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cWJ6cXV2am9kd3R6ZWJieHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTI4NDAsImV4cCI6MjEwMzc2ODg0MH0.6bUPgnOO0SxmW0ilhZK85KFO2vls5QkCxg-BLRt-vMs";
// O login fica só na memória da página: ao recarregar ou abrir de novo, o sistema pede a senha.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: true },
});
// Apaga o login que versões antigas deixaram guardado no navegador.
try {
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
    .forEach((k) => window.localStorage.removeItem(k));
} catch (e) {
  /* navegador sem acesso ao armazenamento: nada a limpar */
}

// Mostra na tela quando algo não foi salvo (antes, o erro ficava escondido).
let ultimoAvisoErro = 0;
export function avisarErro(acao, error) {
  console.error(acao, error);
  const agora = Date.now();
  if (agora - ultimoAvisoErro < 4000) return; // evita vários avisos seguidos
  ultimoAvisoErro = agora;
  const semPermissao =
    error && (error.code === "42501" || error.status === 401 || /row-level security|permission|jwt/i.test(error.message || ""));
  window.alert(
    semPermissao
      ? `Não foi possível ${acao}: sua sessão expirou ou este usuário não tem acesso. Saia e entre de novo no sistema.`
      : `Não foi possível ${acao}. Confira a internet e tente de novo. Se continuar, recarregue a página antes de lançar outra coisa.`
  );
}

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
    nome: "Colagem de solado",
    valor: 120,
    descricao: "Recolagem do solado que está descolando, com cola própria para calçados e prensagem.",
  },
  {
    nome: "Recuperação de solado",
    valor: 120,
    descricao: "Recuperação do solado desgastado ou danificado para voltar a firmeza e a aparência.",
  },
  {
    nome: "Troca da borracha do solado",
    valor: 120,
    descricao: "Substituição da borracha gasta do solado por uma nova.",
  },
  {
    nome: "Pintura",
    valor: 50,
    descricao: "Pintura ou retoque de cor no tênis.",
  },
  {
    nome: "Tingir roupa",
    valor: 50,
    descricao: "Tingimento de peça de roupa (camiseta, moletom, calça). Não conta como par de tênis.",
  },
  {
    nome: "Taxa de Entrega",
    valor: 15,
    descricao: "Busca e/ou entrega do par na casa do cliente. Valor base — ajuste conforme a distância.",
  },
];

// Conta do entregador: entregas a partir desta data entram no "a pagar". O que veio antes já foi acertado.
const INICIO_CONTA_ENTREGADOR = "2026-10-23";
const ENTREGADOR_PADRAO = "Gabriel";
// Conta do terceirizado: serviços terceirizados a partir desta data entram no "a pagar" da sapataria.
const INICIO_CONTA_TERCEIRIZADO = "2026-10-26";
const TERCEIRIZADOS = ["Sapataria do Futuro", "Sapataria América"];
const CATEGORIAS_DESPESA = ["Produtos e insumos", "Entregas", "Tráfego pago", "Aluguel", "Salários", "Marketing", "Impostos", "Equipamentos", "Outros"];

// De onde o cliente veio. Para mudar as opções, é só editar esta lista.
const ORIGENS_CLIENTE = ["Tráfego", "Instagram", "Facebook", "WhatsApp", "Pessoal", "Indicação"];

// Serviços que não representam um par de tênis (não entram na sugestão de pares).
// ---------- Regras de preço ----------
// Higienização Prime por quantidade de pares (preço total). De 4 pares em diante, cada par sai a R$ 55.
const PRECO_HIGIENIZACAO_POR_QTD = { 1: 65, 2: 120, 3: 170 };
const PRECO_HIGIENIZACAO_4_MAIS = 55;
function precoTabelaHigienizacao(qtd) {
  const q = Math.max(1, parseInt(qtd, 10) || 1);
  return PRECO_HIGIENIZACAO_POR_QTD[q] != null ? PRECO_HIGIENIZACAO_POR_QTD[q] : q * PRECO_HIGIENIZACAO_4_MAIS;
}
// Taxa de entrega por região e a partir de quantos pares o frete é grátis.
const TAXAS_ENTREGA = [{ label: "Perto", valor: 15 }, { label: "Longe", valor: 25 }];
const FRETE_GRATIS_A_PARTIR_DE_PARES = 3;
// Serviço terceirizado: margem mínima (cobrar pelo menos o dobro do que a sapataria cobra).
const MARGEM_MINIMA_TERCEIRIZADO = 0.5;

const SERVICOS_SEM_PAR = ["Taxa de Entrega", "Tingir roupa"];

// Junta no mesmo serviço os nomes digitados de jeitos diferentes ("tingir roupa", "TINGIR moletom"...).
function semAcento(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function nomeServicoPadrao(nome) {
  const n = semAcento(nome);
  if (!n) return "Outro";
  const doCatalogo = CATALOGO_SERVICOS.find((s) => semAcento(s.nome) === n);
  if (doCatalogo) return doCatalogo.nome;
  if (/^ting/.test(n)) return "Tingir roupa";
  if (/^colagem( de)? solado$/.test(n)) return "Colagem de solado";
  if (/^pintura$/.test(n)) return "Pintura";
  return String(nome).trim();
}

// Metas de faturamento por mês (AAAA-MM). As metas salvas pelo próprio sistema
// (botão "Editar meta", tabela "metas" no Supabase) têm prioridade sobre estas.
const METAS_PADRAO = {
  "2026-10": { meta: 4000, superMeta: 5000 },
};

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
// Onde está cada par: aqui na PrimeStep, no terceirizado ou já entregue ao cliente.
const ETAPAS_PEDIDO = [
  { id: "primestep", label: "Aqui na PrimeStep", color: "#5B7A8C" },
  { id: "terceirizado", label: "No terceirizado", color: "#C7A96B" },
  { id: "entregue", label: "Entregue", color: "#4B6552" },
];
function paresDoPedido(p) {
  return p.pares != null ? Number(p.pares) || 0 : 1;
}
function resumoServicos(v) {
  return (v.itens || [])
    .filter((it) => !["Taxa de Entrega"].includes(it.servico))
    .map((it) => (it.quantidade > 1 ? `${it.servico} (x${it.quantidade})` : it.servico))
    .join(", ");
}
function pedidoDaVenda(v, etapa) {
  const hoje = todayStr();
  return {
    id: uid(), vendaId: v.id, cliente: v.cliente, tenis: resumoServicos(v), pares: paresDaVenda(v) || 1,
    dataEntrada: v.data, etapa, observacoes: "",
    dataTerceirizado: etapa === "terceirizado" ? hoje : null,
    dataEntrega: etapa === "entregue" ? hoje : null,
  };
}

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

// ---------- Pares de tênis ----------
// Sugestão de pares a partir dos serviços: a maior quantidade entre os serviços
// que são feitos no tênis (ex.: Higienização x2 + Blindagem x2 = 2 pares).
function estimarPares(itens) {
  const qtds = (itens || [])
    .filter((it) => !SERVICOS_SEM_PAR.includes(it.servico))
    .map((it) => parseInt(it.quantidade, 10) || 1);
  return qtds.length ? Math.max(...qtds) : 0;
}

// Pares de uma venda: usa o número informado no lançamento. Vendas antigas,
// lançadas antes desse campo existir, usam a sugestão calculada pelos serviços.
function paresDaVenda(v) {
  if (v.pares != null) return Number(v.pares) || 0;
  if (v.assinaturaId) return 0;
  const itens = v.itens?.length ? v.itens : v.servico ? [{ servico: v.servico }] : [];
  return estimarPares(itens);
}

function somaPares(lista) {
  return lista.reduce((s, v) => s + paresDaVenda(v), 0);
}

function labelPares(n) {
  return `${n} par${n === 1 ? "" : "es"}`;
}

// ---------- Clientes ----------
// Compara nomes sem diferenciar acento, maiúscula e espaços extras.
function normalizarNome(n) {
  return (n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
function linkWhatsApp(tel) {
  let d = (tel || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}`;
}
function formatTelefone(t) {
  const d = (t || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || "";
}
// Vendas de um cliente: as ligadas à ficha e as antigas com o mesmo nome.
function vendasDoCliente(vendas, c) {
  const n = normalizarNome(c.nome);
  return vendas.filter((v) => v.clienteId === c.id || (!v.clienteId && normalizarNome(v.cliente) === n));
}
function diasDesde(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((hoje.getTime() - new Date(y, m - 1, d).getTime()) / 86400000);
}
function resumoCliente(vendas, c) {
  const vs = vendasDoCliente(vendas, c);
  const datas = vs.map((v) => v.data).filter(Boolean).sort();
  const total = vs.reduce((s, v) => s + Number(v.valor || 0), 0);
  const ultima = datas.length ? datas[datas.length - 1] : null;
  return {
    vendas: vs, qtd: vs.length, total, pares: somaPares(vs),
    ticket: vs.length ? total / vs.length : 0,
    primeira: datas.length ? datas[0] : null, ultima, dias: diasDesde(ultima),
  };
}
const porNome = (a, b) => normalizarNome(a.nome).localeCompare(normalizarNome(b.nome));
const DIAS_SUMIDO = 60;

// ---------- Custos e lucro ----------
// Lê valores digitados como "70", "70,50" ou "1.234,56".
function parseValor(txt) {
  const t = String(txt ?? "").trim();
  if (!t) return 0;
  const limpo = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : 0;
}
// Valor que o cliente pagou de fato (vendas antigas: o total da venda).
function valorRecebido(v) {
  return v.valorPago != null ? Number(v.valorPago) : Number(v.valor || 0);
}
// Lucro real = valor pago pelo cliente − custo do serviço − custo da entrega.
// Quanto ainda falta o cliente pagar: tudo, se pendente; o restante, se pagou só uma parte (sinal).
function faltaReceber(v) {
  if (v.status === "pendente") return valorRecebido(v);
  if (v.status === "parcial") return Math.max(0, valorRecebido(v) - Number(v.entrada || 0));
  return 0;
}
function somaFalta(lista) {
  return lista.reduce((s, v) => s + faltaReceber(v), 0);
}
function labelStatus(v) {
  if (v.status === "pago") return "Pago";
  if (v.status === "parcial") return `Pagou ${formatBRL(Number(v.entrada || 0))} · falta ${formatBRL(faltaReceber(v))}`;
  return "Pendente";
}
function lucroDaVenda(v) {
  return valorRecebido(v) - Number(v.custo || 0) - Number(v.custoEntrega || 0);
}
// Custos lançados nas vendas (terceirização/produto e entrega). Entram nas despesas do mês.
function custosDasVendas(lista) {
  const terceirizacao = lista.reduce((s, v) => s + Number(v.custo || 0), 0);
  const entregas = lista.reduce((s, v) => s + Number(v.custoEntrega || 0), 0);
  return { terceirizacao, entregas, total: terceirizacao + entregas };
}
// ---------- Conta do entregador ----------
// Entregas que cada entregador fez (lançadas nas vendas ou em Despesas › Entregas) menos o que já foi pago.
// O pagamento abate as entregas mais antigas primeiro; o que sobra é o que falta pagar.
function chaveEntregador(nome) {
  return String(nome || "").trim().toLowerCase();
}
function contaDosEntregadores(vendas, despesas, pagamentos) {
  const contas = {};
  const conta = (nome) => {
    const k = chaveEntregador(nome);
    if (!contas[k]) contas[k] = { nome: String(nome).trim(), entregas: [], pagamentos: [] };
    return contas[k];
  };
  vendas.forEach((v) => {
    if (v.entregador && Number(v.custoEntrega || 0) > 0 && v.data >= INICIO_CONTA_ENTREGADOR)
      conta(v.entregador).entregas.push({ id: `v-${v.id}`, data: v.data, descricao: v.cliente, valor: Number(v.custoEntrega), venda: v });
  });
  despesas.forEach((d) => {
    if (d.entregador && d.categoria === "Entregas" && Number(d.valor || 0) > 0 && d.data >= INICIO_CONTA_ENTREGADOR)
      conta(d.entregador).entregas.push({ id: `d-${d.id}`, data: d.data, descricao: d.descricao, valor: Number(d.valor), despesa: d });
  });
  (pagamentos || []).forEach((p) => conta(p.entregador).pagamentos.push(p));
  return fecharContas(contas);
}
// Serviços feitos por cada sapataria (custo lançado na venda) menos o que já foi pago a ela.
function contaDosTerceirizados(vendas, pagamentos) {
  const contas = {};
  const conta = (nome) => {
    const k = chaveEntregador(nome);
    if (!contas[k]) contas[k] = { nome: String(nome).trim(), entregas: [], pagamentos: [] };
    return contas[k];
  };
  vendas.forEach((v) => {
    if (v.terceirizado && Number(v.custo || 0) > 0 && v.data >= INICIO_CONTA_TERCEIRIZADO)
      conta(v.terceirizado).entregas.push({ id: `v-${v.id}`, data: v.data, descricao: v.cliente, valor: Number(v.custo), venda: v });
  });
  (pagamentos || []).forEach((p) => conta(p.terceirizado).pagamentos.push(p));
  return fecharContas(contas);
}
// Abate os pagamentos das entregas/serviços mais antigos primeiro; o que sobra é o que falta pagar.
function fecharContas(contas) {
  return Object.values(contas)
    .map((c) => {
      c.entregas.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
      c.pagamentos.sort((a, b) => (a.data < b.data ? 1 : -1));
      const totalEntregas = c.entregas.reduce((s, e) => s + e.valor, 0);
      const totalPago = c.pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
      let credito = totalPago;
      const pendentes = [];
      c.entregas.forEach((e) => {
        const abate = Math.min(credito, e.valor);
        credito -= abate;
        if (e.valor - abate > 0.009) pendentes.push({ ...e, falta: e.valor - abate });
      });
      return { ...c, totalEntregas, totalPago, falta: totalEntregas - totalPago, pendentes };
    })
    .sort((a, b) => b.falta - a.falta);
}
function rowToPagamentoEntregador(r) {
  return { id: r.id, data: r.data, entregador: r.entregador, valor: Number(r.valor), observacao: r.observacao || "" };
}
// Sem a tabela no banco, devolve null e a conta do entregador avisa o que falta.
async function loadPagamentosEntregador() {
  const { data, error } = await supabase.from("pagamentos_entregador").select("*").order("data", { ascending: false });
  if (error) {
    console.warn("Tabela de pagamentos do entregador indisponível.", error);
    return null;
  }
  return (data || []).map(rowToPagamentoEntregador);
}
async function insertPagamentoEntregador(p) {
  const { error } = await supabase.from("pagamentos_entregador").upsert({
    id: p.id, data: p.data, entregador: p.entregador, valor: p.valor, observacao: p.observacao || null,
  });
  if (error) avisarErro("registrar o pagamento do entregador", error);
  return !error;
}
function rowToPagamentoTerceirizado(r) {
  return { id: r.id, data: r.data, terceirizado: r.terceirizado, valor: Number(r.valor), observacao: r.observacao || "" };
}
async function loadPagamentosTerceirizado() {
  const { data, error } = await supabase.from("pagamentos_terceirizado").select("*").order("data", { ascending: false });
  if (error) {
    console.warn("Tabela de pagamentos do terceirizado indisponível.", error);
    return null;
  }
  return (data || []).map(rowToPagamentoTerceirizado);
}
async function insertPagamentoTerceirizado(p) {
  const { error } = await supabase.from("pagamentos_terceirizado").upsert({
    id: p.id, data: p.data, terceirizado: p.terceirizado, valor: p.valor, observacao: p.observacao || null,
  });
  if (error) avisarErro("registrar o pagamento da sapataria", error);
  return !error;
}
async function deletePagamentoTerceirizadoRow(id) {
  const { error } = await supabase.from("pagamentos_terceirizado").delete().eq("id", id);
  if (error) avisarErro("desfazer o pagamento da sapataria", error);
}
async function deletePagamentoEntregadorRow(id) {
  const { error } = await supabase.from("pagamentos_entregador").delete().eq("id", id);
  if (error) avisarErro("desfazer o pagamento do entregador", error);
}

// Despesas de uma categoria (ex.: "Entregas", "Tráfego pago").
function somaCategoria(despesasLista, categoria) {
  return despesasLista.filter((d) => d.categoria === categoria).reduce((s, d) => s + Number(d.valor || 0), 0);
}
// Tráfego pago no mês: quanto foi investido e o que as vendas com origem Tráfego trouxeram.
function analiseTrafego(vendasMes, despesasMes) {
  const investido = somaCategoria(despesasMes, "Tráfego pago");
  const vs = vendasMes.filter((v) => v.origem === "Tráfego" && !v.assinaturaId);
  const clientes = contarClientes(vs);
  const faturado = vs.reduce((s, v) => s + valorRecebido(v), 0);
  const lucroVendas = somaLucro(vs);
  return {
    investido, vendas: vs.length, clientes, faturado, lucroVendas,
    resultado: lucroVendas - investido,
    custoPorCliente: clientes ? investido / clientes : null,
    retorno: investido > 0 ? faturado / investido : null,
  };
}
function somaLucro(lista) {
  return lista.reduce((s, v) => s + lucroDaVenda(v), 0);
}

function contarClientes(lista) {
  return new Set(lista.map((v) => (v.cliente || "").trim().toLowerCase())).size;
}

// ---------- Banco de dados (Supabase) ----------
// Converte uma linha do banco de volta para o formato que o app usa.
function rowToVenda(row) {
  return {
    id: row.id, data: row.data, cliente: row.cliente, status: row.status, itens: row.itens || [], valor: Number(row.valor),
    assinaturaId: row.assinatura_id || null, mesReferencia: row.mes_referencia || null,
    origem: row.origem || null, pares: row.pares != null ? Number(row.pares) : null,
    clienteId: row.cliente_id || null,
    custo: row.custo != null ? Number(row.custo) : null,
    custoEntrega: row.custo_entrega != null ? Number(row.custo_entrega) : null,
    valorPago: row.valor_pago != null ? Number(row.valor_pago) : null,
    entrada: row.valor_entrada != null ? Number(row.valor_entrada) : null,
    entregador: row.entregador || null,
    terceirizado: row.terceirizado || null,
  };
}
function rowToCliente(r) {
  return {
    id: r.id, nome: r.nome, telefone: r.telefone || "", instagram: r.instagram || "", bairro: r.bairro || "",
    endereco: r.endereco || "", aniversario: r.aniversario || "", origem: r.origem || "",
    observacoes: r.observacoes || "", criadoEm: r.criado_em || null,
  };
}
// Sem a tabela de clientes no banco, devolve null e a aba Clientes avisa o que falta.
async function loadClientes() {
  const { data, error } = await supabase.from("clientes").select("*").order("nome", { ascending: true });
  if (error) {
    console.warn("Tabela de clientes indisponível.", error);
    return null;
  }
  return (data || []).map(rowToCliente);
}
async function upsertCliente(c) {
  const { error } = await supabase.from("clientes").upsert({
    id: c.id, nome: c.nome, telefone: c.telefone || null, instagram: c.instagram || null, bairro: c.bairro || null,
    endereco: c.endereco || null, aniversario: c.aniversario || null, origem: c.origem || null,
    observacoes: c.observacoes || null, criado_em: c.criadoEm || todayStr(),
  });
  if (error) avisarErro("salvar o cliente", error);
}
async function deleteClienteRow(id) {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) avisarErro("excluir o cliente", error);
}
function rowToDespesa(row) {
  return { id: row.id, data: row.data, descricao: row.descricao, categoria: row.categoria, valor: Number(row.valor), entregador: row.entregador || null };
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
    vendaId: row.venda_id || null, pares: row.pares != null ? Number(row.pares) : null,
    dataTerceirizado: row.data_terceirizado || null,
  };
}

async function loadVendas() {
  const { data, error } = await supabase.from("vendas").select("*").order("data", { ascending: false });
  if (error) {
    avisarErro("carregar as vendas", error);
    return [];
  }
  return (data || []).map(rowToVenda);
}
async function loadDespesas() {
  const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false });
  if (error) {
    avisarErro("carregar as despesas", error);
    return [];
  }
  return (data || []).map(rowToDespesa);
}
async function loadAssinaturas() {
  const { data, error } = await supabase.from("assinaturas").select("*").order("cliente", { ascending: true });
  if (error) {
    avisarErro("carregar as assinaturas", error);
    return [];
  }
  return (data || []).map(rowToAssinatura);
}
async function loadPedidos() {
  const { data, error } = await supabase.from("pedidos").select("*").order("data_entrada", { ascending: false });
  if (error) {
    avisarErro("carregar os pares em processo", error);
    return [];
  }
  return (data || []).map(rowToPedido);
}

async function loadMetas() {
  const { data, error } = await supabase.from("metas").select("*");
  if (error) {
    // Sem a tabela de metas, o sistema usa as metas definidas no código.
    console.warn("Tabela de metas indisponível; usando as metas definidas no código.", error);
    return {};
  }
  const out = {};
  (data || []).forEach((r) => {
    out[r.mes] = { meta: Number(r.meta), superMeta: Number(r.super_meta) };
  });
  return out;
}
async function upsertMeta(mes, m) {
  const { error } = await supabase.from("metas").upsert({ mes, meta: m.meta, super_meta: m.superMeta });
  if (error) avisarErro("salvar a meta", error);
}

let avisoColunasMostrado = false;
async function upsertVenda(v) {
  const base = {
    id: v.id, data: v.data, cliente: v.cliente, status: v.status, itens: v.itens, valor: v.valor,
    assinatura_id: v.assinaturaId || null, mes_referencia: v.mesReferencia || null,
  };
  const comOrigem = { ...base, origem: v.origem || null, pares: v.pares != null ? v.pares : null };
  const comCliente = { ...comOrigem, cliente_id: v.clienteId || null };
  const completo = {
    ...comCliente,
    custo: v.custo != null ? v.custo : null,
    custo_entrega: v.custoEntrega != null ? v.custoEntrega : null,
    valor_pago: v.valorPago != null ? v.valorPago : null,
  };
  const comEntrada = { ...completo, valor_entrada: v.entrada != null ? v.entrada : null };
  const comEntregador = { ...comEntrada, entregador: v.entregador || null };
  const comTerceirizado = { ...comEntregador, terceirizado: v.terceirizado || null };
  // Tenta salvar tudo. Se alguma coluna nova ainda não existir no banco, salva sem ela
  // (para não perder a venda) e avisa uma vez.
  // Venda com sinal sem a coluna no banco: não salva pela metade, para não perder o valor do sinal.
  const tentativas = v.status === "parcial" ? [comTerceirizado, comEntregador, comEntrada] : [comTerceirizado, comEntregador, comEntrada, completo, comCliente, comOrigem, base];
  for (const payload of tentativas) {
    const { error } = await supabase.from("vendas").upsert(payload);
    if (!error) {
      if (payload !== comTerceirizado && payload !== comEntregador && payload !== comEntrada && payload !== completo && !avisoColunasMostrado) {
        avisoColunasMostrado = true;
        window.alert(
          "A venda foi salva, mas parte das informações novas (custos, ficha do cliente, origem ou pares) não foi gravada: falta rodar o último comando SQL no Supabase."
        );
      }
      return;
    }
    const faltaColuna = error.code === "PGRST204" || /column/i.test(error.message || "");
    if (!faltaColuna) {
      avisarErro("salvar a venda", error);
      return;
    }
  }
  if (v.status === "parcial") {
    window.alert(
      "A venda com sinal não foi salva: falta criar no Supabase a coluna do valor do sinal. Rode no SQL Editor:\n\nalter table vendas add column if not exists valor_entrada numeric;"
    );
    return;
  }
  avisarErro("salvar a venda", { message: "colunas ausentes na tabela de vendas" });
}
async function deleteVendaRow(id) {
  const { error } = await supabase.from("vendas").delete().eq("id", id);
  if (error) avisarErro("excluir a venda", error);
}
async function upsertDespesa(d) {
  const base = { id: d.id, data: d.data, descricao: d.descricao, categoria: d.categoria, valor: d.valor };
  let { error } = await supabase.from("despesas").upsert({ ...base, entregador: d.entregador || null });
  // Sem a coluna do entregador no banco, salva o resto da despesa.
  if (error && (error.code === "PGRST204" || /column/i.test(error.message || ""))) ({ error } = await supabase.from("despesas").upsert(base));
  if (error) avisarErro("salvar a despesa", error);
}
async function deleteDespesaRow(id) {
  const { error } = await supabase.from("despesas").delete().eq("id", id);
  if (error) avisarErro("excluir a despesa", error);
}
async function upsertAssinatura(a) {
  const { error } = await supabase.from("assinaturas").upsert({
    id: a.id, cliente: a.cliente, plano_id: a.planoId, plano_nome: a.planoNome,
    valor_mensal: a.valorMensal, dia_cobranca: a.diaCobranca, data_inicio: a.dataInicio, status: a.status,
  });
  if (error) avisarErro("salvar a assinatura", error);
}
async function deleteAssinaturaRow(id) {
  const { error } = await supabase.from("assinaturas").delete().eq("id", id);
  if (error) avisarErro("excluir a assinatura", error);
}
async function upsertPedido(p) {
  const { error } = await supabase.from("pedidos").upsert({
    id: p.id, cliente: p.cliente, tenis: p.tenis, data_entrada: p.dataEntrada,
    etapa: p.etapa, observacoes: p.observacoes, data_entrega: p.dataEntrega || null,
    venda_id: p.vendaId || null, pares: p.pares != null ? p.pares : null, data_terceirizado: p.dataTerceirizado || null,
  });
  if (error) avisarErro("salvar o par em processo", error);
}
async function deletePedidoRow(id) {
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) avisarErro("excluir o par em processo", error);
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
  return { itemId: uid(), sel: CATALOGO_SERVICOS[0].nome, servico: CATALOGO_SERVICOS[0].nome, precoUnit: String(CATALOGO_SERVICOS[0].valor), quantidade: 1, tabela: CATALOGO_SERVICOS[0].nome === "Higienização Prime" };
}

function EntryModal({ type, initial, onSave, onClose, clientes = [], podeCadastrarCliente = false, entregadores = [] }) {
  const isVenda = type === "venda";
  const [data, setData] = useState(initial?.data || todayStr());
  const [nome, setNome] = useState(isVenda ? initial?.cliente || "" : initial?.descricao || "");
  const [categoria, setCategoria] = useState(initial?.categoria || CATEGORIAS_DESPESA[0]);
  const [status, setStatus] = useState(initial?.status || "pago");
  const [valor, setValor] = useState(initial?.valor != null ? String(initial.valor) : "");
  const [origem, setOrigem] = useState(initial?.origem || "");
  // Cliente da venda: ligado à ficha (pelo id ou, nas vendas antigas, pelo nome igual).
  const [clienteId, setClienteId] = useState(() => {
    if (!isVenda) return null;
    if (initial?.clienteId) return initial.clienteId;
    const n = normalizarNome(initial?.cliente);
    return (n && clientes.find((c) => normalizarNome(c.nome) === n)?.id) || null;
  });
  const dadosDe = (c) => ({
    telefone: c?.telefone || "", instagram: c?.instagram || "", bairro: c?.bairro || "",
    endereco: c?.endereco || "", aniversario: c?.aniversario || "", observacoes: c?.observacoes || "",
  });
  const [dadosCliente, setDadosCliente] = useState(() => dadosDe(clientes.find((c) => c.id === clienteId)));
  const [mostrarDadosCliente, setMostrarDadosCliente] = useState(true);
  const setDado = (campo) => (e) => setDadosCliente((d) => ({ ...d, [campo]: e.target.value }));
  // Pares: enquanto você não mexer no campo, ele acompanha a sugestão calculada pelos serviços.
  const [pares, setPares] = useState(initial?.pares != null ? Number(initial.pares) : 0);
  const [paresManual, setParesManual] = useState(initial?.pares != null);
  // Custos e lucro da venda. O valor pago acompanha o total até você mudar (ex.: desconto).
  const fmtCampo = (n) => (n != null && n !== "" ? String(n).replace(".", ",") : "");
  const [custo, setCusto] = useState(fmtCampo(initial?.custo));
  const [custoEntrega, setCustoEntrega] = useState(fmtCampo(initial?.custoEntrega));
  const [valorPago, setValorPago] = useState(fmtCampo(initial?.valorPago));
  const [valorPagoManual, setValorPagoManual] = useState(initial?.valorPago != null);
  const [entrada, setEntrada] = useState(fmtCampo(initial?.entrada));
  // Entregador: na venda nova já vem o de sempre; na despesa só preenche se for entrega feita por ele.
  const [entregador, setEntregador] = useState(initial?.entregador || (isVenda && !initial?.id ? ENTREGADOR_PADRAO : ""));
  const nomesEntregadores = [...new Set([ENTREGADOR_PADRAO, ...entregadores].filter(Boolean))];
  // Venda nova: onde o tênis está agora (entra no controle do Operacional).
  const [ondeEsta, setOndeEsta] = useState("primestep");
  // Quem fez o serviço terceirizado (o custo vira "a pagar" para a sapataria).
  const [terceirizado, setTerceirizado] = useState(initial?.terceirizado || "");
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
    if (it.tabela && it.sel === "Higienização Prime") return precoTabelaHigienizacao(it.quantidade);
    const preco = parseFloat(String(it.precoUnit).replace(",", ".")) || 0;
    const qtd = parseInt(it.quantidade, 10) || 0;
    return preco * qtd;
  }
  const total = itens.reduce((s, it) => s + itemSubtotal(it), 0);

  const sugestaoPares = initial?.assinaturaId ? 0 : estimarPares(itens);
  const paresValor = paresManual ? pares : sugestaoPares;
  function definirPares(n) {
    setPares(Math.max(0, n));
    setParesManual(true);
  }
  const opcoesOrigem = origem && !ORIGENS_CLIENTE.includes(origem) ? [...ORIGENS_CLIENTE, origem] : ORIGENS_CLIENTE;

  // Busca de cliente cadastrado enquanto digita o nome.
  const clienteSelecionado = clienteId ? clientes.find((c) => c.id === clienteId) : null;
  const termoBusca = normalizarNome(nome);
  const sugestoesCliente =
    isVenda && !clienteId && termoBusca ? clientes.filter((c) => normalizarNome(c.nome).includes(termoBusca)).slice(0, 5) : [];
  function escolherCliente(c) {
    setNome(c.nome);
    setClienteId(c.id);
    setDadosCliente(dadosDe(c));
    if (!origem && c.origem) setOrigem(c.origem);
  }
  function digitarNomeCliente(valor) {
    setNome(valor);
    // Nome igual ao de um cliente cadastrado: já liga à ficha dele.
    const igual = clientes.find((c) => normalizarNome(c.nome) === normalizarNome(valor));
    if (igual) {
      escolherCliente({ ...igual, nome: valor });
    } else if (clienteId) {
      setClienteId(null);
      setDadosCliente(dadosDe(null));
    }
  }

  function updateItem(itemId, patch) {
    setItens((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, ...patch } : it)));
  }
  function handleItemServicoChange(itemId, nomeSel) {
    if (nomeSel === "custom") {
      updateItem(itemId, { sel: "custom", servico: "" });
    } else {
      const item = CATALOGO_SERVICOS.find((s) => s.nome === nomeSel);
      updateItem(itemId, { sel: nomeSel, servico: item.nome, precoUnit: String(item.valor), tabela: item.nome === "Higienização Prime" });
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
      // Em venda nova a origem é obrigatória; ao editar uma venda antiga, é opcional.
      if (!initial?.id && !origem) {
        setError("Informe de onde veio o cliente.");
        return;
      }
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
      const valorFinal = valorPagoManual && valorPago.trim() ? parseValor(valorPago) : totalClean;
      const entradaNum = parseValor(entrada);
      if (status === "parcial") {
        if (entradaNum <= 0) {
          setError("Informe quanto o cliente já pagou.");
          return;
        }
        if (entradaNum >= valorFinal) {
          setError("O valor já pago cobre a venda toda. Marque como Pago.");
          return;
        }
      }
      onSave({
        id: initial?.id || uid(), data, cliente: nome.trim(), status, itens: itensClean, valor: totalClean,
        origem: origem || null, pares: paresValor,
        clienteId: clienteId || null, dadosCliente,
        custo: custo.trim() ? parseValor(custo) : null,
        custoEntrega: custoEntrega.trim() ? parseValor(custoEntrega) : null,
        valorPago: valorFinal,
        entrada: status === "parcial" ? entradaNum : null,
        entregador: parseValor(custoEntrega) > 0 && entregador.trim() ? entregador.trim() : null,
        terceirizado: parseValor(custo) > 0 && terceirizado ? terceirizado : null,
        ondeEsta: !initial?.id && !initial?.assinaturaId && ondeEsta !== "nenhum" ? ondeEsta : null,
        assinaturaId: initial?.assinaturaId || null, mesReferencia: initial?.mesReferencia || null,
      });
    } else {
      const v = parseFloat(String(valor).replace(",", "."));
      if (!v || v <= 0) {
        setError("Informe um valor válido.");
        return;
      }
      onSave({
        id: initial?.id || uid(), data, valor: v, descricao: nome.trim(), categoria,
        entregador: categoria === "Entregas" && entregador.trim() ? entregador.trim() : null,
      });
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
              {initial?.id ? "Editar" : "Novo"} {isVenda ? "registro de venda" : "registro de despesa"}
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
                onChange={(e) => (isVenda ? digitarNomeCliente(e.target.value) : setNome(e.target.value))}
                placeholder={isVenda ? "Digite o nome para buscar ou cadastrar" : "Ex.: Conta de energia"}
                style={inputStyle}
              />
            </Field>
            {sugestoesCliente.length > 0 && (
              <div style={{ marginTop: -6, border: "1px solid var(--paper-line)", borderRadius: 5, overflow: "hidden" }}>
                {sugestoesCliente.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => escolherCliente(c)}
                    style={{
                      display: "flex", justifyContent: "space-between", gap: 8, width: "100%", textAlign: "left",
                      padding: "8px 10px", border: "none", borderBottom: "1px solid var(--paper-line)", background: "#FFFDF8",
                      cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{c.nome}</span>
                    <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{formatTelefone(c.telefone) || c.bairro || "cadastrado"}</span>
                  </button>
                ))}
              </div>
            )}
            {isVenda && podeCadastrarCliente && nome.trim() && (
              <div style={{ border: "1px solid var(--paper-line)", borderRadius: 5, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setMostrarDadosCliente((v) => !v)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left" }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: clienteSelecionado ? "var(--green)" : "var(--ink)" }}>
                    {clienteSelecionado ? "✓ Ficha do cliente (atualiza ao salvar)" : "Cadastro do cliente novo"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{mostrarDadosCliente ? "ocultar ▴" : "mostrar ▾"}</span>
                </button>
                {mostrarDadosCliente && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                      <Field label="WhatsApp">
                        <input id="venda-cli-telefone" type="tel" inputMode="tel" value={dadosCliente.telefone} onChange={setDado("telefone")} placeholder="(65) 99999-9999" style={inputStyle} />
                      </Field>
                      <Field label="Instagram">
                        <input id="venda-cli-instagram" type="text" value={dadosCliente.instagram} onChange={setDado("instagram")} placeholder="@usuario" style={inputStyle} />
                      </Field>
                      <Field label="Bairro">
                        <input id="venda-cli-bairro" type="text" value={dadosCliente.bairro} onChange={setDado("bairro")} placeholder="Bairro" style={inputStyle} />
                      </Field>
                      <Field label="Aniversário">
                        <input id="venda-cli-aniversario" type="date" value={dadosCliente.aniversario} onChange={setDado("aniversario")} style={inputStyle} />
                      </Field>
                    </div>
                    <Field label="Endereço (para busca e entrega)">
                      <input id="venda-cli-endereco" type="text" value={dadosCliente.endereco} onChange={setDado("endereco")} placeholder="Rua, número, complemento" style={inputStyle} />
                    </Field>
                    <Field label="Observações do cliente">
                      <input id="venda-cli-observacoes" type="text" value={dadosCliente.observacoes} onChange={setDado("observacoes")} placeholder="Preferências, combinados…" style={inputStyle} />
                    </Field>
                  </>
                )}
              </div>
            )}

            {isVenda && (
              <Field label="De onde veio o cliente?">
                <select value={origem} onChange={(e) => setOrigem(e.target.value)} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {opcoesOrigem.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
            )}

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
                        {it.sel === "Higienização Prime" && (
                          <span style={{ fontSize: 11.5, color: "var(--ink)", lineHeight: 1.4 }}>
                            Tabela: 1 par {formatBRL(precoTabelaHigienizacao(1))} · 2 por {formatBRL(precoTabelaHigienizacao(2))} · 3 por {formatBRL(precoTabelaHigienizacao(3))} · 4 ou mais {formatBRL(PRECO_HIGIENIZACAO_4_MAIS)} cada
                            {!it.tabela && (
                              <button type="button" onClick={() => updateItem(it.itemId, { tabela: true })} style={{ marginLeft: 6, border: "1px solid var(--paper-line)", background: "#FFFDF8", borderRadius: 4, padding: "1px 8px", fontSize: 11.5, cursor: "pointer", color: "var(--ink)" }}>
                                usar tabela
                              </button>
                            )}
                            {!it.tabela && itemSubtotal(it) < precoTabelaHigienizacao(it.quantidade) - 0.009 && (
                              <span style={{ display: "block", color: "var(--rust)", fontWeight: 600 }}>
                                Abaixo da tabela ({formatBRL(precoTabelaHigienizacao(it.quantidade) - itemSubtotal(it))} de desconto).
                              </span>
                            )}
                          </span>
                        )}
                        {it.sel === "Taxa de Entrega" && (
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 11.5, color: "var(--muted)" }}>
                            {TAXAS_ENTREGA.map((t) => (
                              <button key={t.label} type="button" onClick={() => updateItem(it.itemId, { precoUnit: String(t.valor) })} style={{ border: "1px solid var(--paper-line)", background: Number(String(it.precoUnit).replace(",", ".")) === t.valor ? "var(--ink)" : "#FFFDF8", color: Number(String(it.precoUnit).replace(",", ".")) === t.valor ? "var(--paper)" : "var(--ink)", borderRadius: 4, padding: "3px 10px", fontSize: 12, cursor: "pointer" }}>
                                {t.label} {formatBRL(t.valor)}
                              </button>
                            ))}
                            <span>Frete grátis a partir de {FRETE_GRATIS_A_PARTIR_DE_PARES} pares.</span>
                          </span>
                        )}
                        {it.sel !== "custom" && it.sel !== "Higienização Prime" && it.sel !== "Taxa de Entrega" ? (
                          <span style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>
                            {CATALOGO_SERVICOS.find((s) => s.nome === it.sel)?.descricao}
                          </span>
                        ) : it.sel !== "custom" ? null : (
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
                              value={it.tabela && it.sel === "Higienização Prime" ? String(Math.round((itemSubtotal(it) / (parseInt(it.quantidade, 10) || 1)) * 100) / 100).replace(".", ",") : it.precoUnit}
                              onChange={(e) => updateItem(it.itemId, { precoUnit: e.target.value, tabela: false })}
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

                {/* Quantidade de pares dessa venda */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, fontFamily: "Inter, sans-serif" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)" }}>
                    Quantos pares nessa venda?
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--paper-line)", borderRadius: 5, overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => definirPares(paresValor - 1)}
                        style={{ border: "none", background: "#FFFDF8", width: 32, height: 36, cursor: "pointer", color: "var(--ink)", fontWeight: 700 }}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={paresValor}
                        onChange={(e) => definirPares(parseInt(e.target.value, 10) || 0)}
                        style={{ ...inputStyle, border: "none", borderLeft: "1px solid var(--paper-line)", borderRight: "1px solid var(--paper-line)", borderRadius: 0, width: 54, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}
                      />
                      <button
                        type="button"
                        onClick={() => definirPares(paresValor + 1)}
                        style={{ border: "none", background: "#FFFDF8", width: 32, height: 36, cursor: "pointer", color: "var(--ink)", fontWeight: 700 }}
                      >
                        +
                      </button>
                    </div>
                    <span style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4, flex: 1 }}>
                      {paresManual ? "Ajustado por você." : "Sugerido pelos serviços — ajuste se for diferente."}
                    </span>
                  </div>
                </div>

                {!initial?.id && !initial?.assinaturaId && paresValor > 0 && (
                  <Field label="Onde está o tênis agora?">
                    <select value={ondeEsta} onChange={(e) => setOndeEsta(e.target.value)} style={inputStyle}>
                      <option value="primestep">Aqui na PrimeStep</option>
                      <option value="terceirizado">No terceirizado</option>
                      <option value="entregue">Já entregue ao cliente</option>
                    </select>
                  </Field>
                )}

                <Field label="Status do pagamento">
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                    <option value="pago">Pago</option>
                    <option value="parcial">Pagou uma parte (sinal)</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </Field>

                {status === "parcial" && (() => {
                  const combinado = valorPagoManual ? parseValor(valorPago) : total;
                  const falta = Math.max(0, combinado - parseValor(entrada));
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
                      <Field label="Quanto já pagou">
                        <input id="venda-entrada" type="text" inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
                      </Field>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8 }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Falta receber na entrega</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: "var(--rust)" }}>{formatBRL(falta)}</span>
                      </div>
                      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => setEntrada(fmtCampo(Math.round(combinado * 50) / 100))} style={{ border: "1px solid var(--paper-line)", background: "#FFFDF8", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "var(--ink)" }}>
                          Metade ({formatBRL(Math.round(combinado * 50) / 100)})
                        </button>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", alignSelf: "center" }}>
                          Quando ela pagar o resto, edite a venda e mude para Pago.
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: "1px solid var(--paper-line)" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Total da venda
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: "var(--green)" }}>
                    {formatBRL(total)}
                  </span>
                </div>

                {/* Custos e lucro real */}
                {(() => {
                  const pago = valorPagoManual ? parseValor(valorPago) : total;
                  const lucro = pago - parseValor(custo) - parseValor(custoEntrega);
                  const margem = pago > 0 ? (lucro / pago) * 100 : 0;
                  const desconto = total - pago;
                  return (
                    <div style={{ border: "1px solid var(--paper-line)", borderRadius: 5, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink)" }}>
                        Custos e lucro
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                        <Field label="Custo (terceirizado, produto)">
                          <input id="venda-custo" type="text" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
                        </Field>
                        <Field label="Entrega (custo)">
                          <input id="venda-entrega" type="text" inputMode="decimal" value={custoEntrega} onChange={(e) => setCustoEntrega(e.target.value)} placeholder="0,00" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
                        </Field>
                        <Field label={status === "pago" ? "Valor pago pelo cliente" : "Valor total combinado"}>
                          <input
                            id="venda-valor-pago"
                            type="text"
                            inputMode="decimal"
                            value={valorPagoManual ? valorPago : fmtCampo(Math.round(total * 100) / 100)}
                            onChange={(e) => {
                              setValorPago(e.target.value);
                              setValorPagoManual(true);
                            }}
                            style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                          />
                        </Field>
                      </div>
                      {(() => {
                        // Alertas de margem: entrega paga sem cobrar taxa e serviço terceirizado barato demais.
                        const avisos = [];
                        const temTaxa = itens.some((x) => x.sel === "Taxa de Entrega" || /taxa de entrega/i.test(x.servico || ""));
                        const ent = parseValor(custoEntrega);
                        if (ent > 0 && !temTaxa && paresValor < FRETE_GRATIS_A_PARTIR_DE_PARES) {
                          avisos.push(
                            <span key="ent">
                              Você vai pagar {formatBRL(ent)} de entrega e não está cobrando taxa. Frete grátis só a partir de {FRETE_GRATIS_A_PARTIR_DE_PARES} pares.{" "}
                              {TAXAS_ENTREGA.map((t) => (
                                <button key={t.label} type="button" onClick={() => setItens((prev) => [...prev, { itemId: uid(), sel: "Taxa de Entrega", servico: "Taxa de Entrega", precoUnit: String(t.valor), quantidade: 1 }])} style={{ marginLeft: 4, border: "1px solid var(--rust)", background: "#FFFDF8", color: "var(--rust)", borderRadius: 4, padding: "1px 8px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>
                                  + taxa {t.label.toLowerCase()} {formatBRL(t.valor)}
                                </button>
                              ))}
                            </span>
                          );
                        }
                        const cst = parseValor(custo);
                        const pagoCliente = valorPagoManual ? parseValor(valorPago) : total;
                        if (cst > 0 && terceirizado && pagoCliente > 0) {
                          const margemServ = (pagoCliente - cst - ent) / pagoCliente;
                          if (margemServ < MARGEM_MINIMA_TERCEIRIZADO) {
                            avisos.push(
                              <span key="marg">
                                Margem de {fmtPct(margemServ * 100)} neste serviço terceirizado. Pela regra de cobrar no mínimo o dobro do que a sapataria cobra, o preço deveria ser pelo menos {formatBRL(cst * 2 + ent)}.
                              </span>
                            );
                          }
                        }
                        return avisos.length ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid var(--rust)", borderRadius: 5, padding: "8px 10px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--rust)", lineHeight: 1.45 }}>
                            {avisos}
                          </div>
                        ) : null;
                      })()}
                      {parseValor(custo) > 0 && (
                        <Field label="Quem fez o serviço (terceirizado)">
                          <select id="venda-terceirizado" value={terceirizado} onChange={(e) => setTerceirizado(e.target.value)} style={inputStyle}>
                            <option value="">Ninguém — é custo de produto ou insumo</option>
                            {[...new Set([...TERCEIRIZADOS, ...(terceirizado ? [terceirizado] : [])])].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>
                            {terceirizado ? `O custo entra no "a pagar" da ${terceirizado}.` : "Sem sapataria: o custo entra no lucro, mas não na conta de ninguém."}
                          </span>
                        </Field>
                      )}
                      {parseValor(custoEntrega) > 0 && (
                        <Field label="Quem entregou">
                          <input id="venda-entregador" list="lista-entregadores" value={entregador} onChange={(e) => setEntregador(e.target.value)} placeholder="Nome do entregador (vazio se foi você)" style={inputStyle} />
                          <datalist id="lista-entregadores">
                            {nomesEntregadores.map((n) => <option key={n} value={n} />)}
                          </datalist>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>
                            {entregador.trim() ? `Entra no "a pagar" de ${entregador.trim()}.` : "Sem entregador: o custo entra no lucro, mas não na conta de ninguém."}
                          </span>
                        </Field>
                      )}
                      {desconto > 0.009 && (
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>
                          Desconto de {formatBRL(desconto)} sobre o total.
                        </span>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--paper-line)" }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Lucro real
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: lucro >= 0 ? "var(--green)" : "var(--rust)" }}>
                          {formatBRL(lucro)}
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginLeft: 6 }}>{fmtPct(margem)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
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
                {categoria === "Entregas" && (
                  <Field label="Entregador (se foi uma entrega feita por ele)">
                    <input list="lista-entregadores-desp" value={entregador} onChange={(e) => setEntregador(e.target.value)} placeholder="Ex.: Gabriel — deixe vazio se não for" style={inputStyle} />
                    <datalist id="lista-entregadores-desp">
                      {nomesEntregadores.map((n) => <option key={n} value={n} />)}
                    </datalist>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>
                      Use para entrega que não é de uma venda (buscar material, levar na terceirizada). Para registrar que você <strong>pagou</strong> o entregador, use o botão "Paguei" na conta do entregador, não lance aqui.
                    </span>
                  </Field>
                )}
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
  const [pares, setPares] = useState(initial?.pares != null ? String(initial.pares) : "1");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!cliente.trim()) {
      setError("Informe o cliente.");
      return;
    }
    if (!tenis.trim()) {
      setError("Informe o tênis ou o serviço.");
      return;
    }
    onSave({
      id: initial?.id || uid(),
      cliente: cliente.trim(),
      tenis: tenis.trim(),
      dataEntrada,
      etapa,
      observacoes: observacoes.trim(),
      pares: Math.max(1, parseInt(pares, 10) || 1),
      vendaId: initial?.vendaId || null,
      dataTerceirizado: etapa === "terceirizado" ? (initial?.dataTerceirizado || todayStr()) : etapa === "primestep" ? null : initial?.dataTerceirizado || null,
      dataEntrega: etapa === "entregue" ? (initial?.dataEntrega || todayStr()) : null,
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
              {initial ? "Editar pedido" : "Novo pedido"}
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Cliente">
              <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" style={inputStyle} />
            </Field>
            <Field label="Tênis / serviço">
              <input type="text" value={tenis} onChange={(e) => setTenis(e.target.value)} placeholder="Ex.: Air Force branco · Higienização" style={inputStyle} />
            </Field>
            <Field label="Quantos pares">
              <input type="number" min="1" value={pares} onChange={(e) => setPares(e.target.value)} style={{ ...inputStyle, width: 100 }} />
            </Field>
            <Field label="Data de entrada">
              <input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Onde está">
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
  const clientesDia = contarClientes(vendasDoDia);
  const paresDia = somaPares(vendasDoDia);

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
                {clientesDia} cliente{clientesDia > 1 ? "s" : ""} · <strong style={{ color: "var(--ink)" }}>{labelPares(paresDia)}</strong> · lucro {formatBRL(somaLucro(vendasDoDia))}
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
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--ink)", marginTop: 3 }}>
                      {labelPares(paresDaVenda(v))}
                      {v.origem ? ` · ${v.origem}` : ""}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 11, fontWeight: 600, color: v.status === "pago" ? "var(--green)" : "var(--rust)" }}>
                      {v.status === "pago" ? <Check size={11} /> : <Clock size={11} />}
                      {labelStatus(v)}
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

// ---------- Meta do mês ----------
function fmtPct(v) {
  const n = Number.isFinite(v) ? v : 0;
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}
function fmtVar(v) {
  return `${v >= 0 ? "+" : ""}${fmtPct(v)}`;
}
function temServico(v, termo) {
  return (v.itens || []).some((it) => (it.servico || "").toLowerCase().includes(termo));
}
function somaValor(lista) {
  return lista.reduce((s, v) => s + Number(v.valor || 0), 0);
}

// Calcula tudo sobre a meta de um mês: quanto foi feito, quanto falta, ritmo e pontos a melhorar.
function analisarMeta(vendas, mesKey, alvo, hoje) {
  const [y, m] = mesKey.split("-").map(Number);
  const diasNoMes = new Date(y, m, 0).getDate();
  const mesAtualKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const situacao = mesKey === mesAtualKey ? "atual" : mesKey < mesAtualKey ? "passado" : "futuro";
  const diasDecorridos = situacao === "atual" ? hoje.getDate() : situacao === "passado" ? diasNoMes : 0;
  // Dias que ainda dá para vender, contando hoje.
  const diasRestantes = situacao === "atual" ? diasNoMes - hoje.getDate() + 1 : situacao === "futuro" ? diasNoMes : 0;

  const doMes = vendas.filter((v) => v.data?.startsWith(mesKey));
  const faturado = somaValor(doMes);
  const pendente = somaFalta(doMes);
  const avulsas = doMes.filter((v) => !v.assinaturaId);
  const receitaAvulsa = somaValor(avulsas);
  const paresAvulsa = somaPares(avulsas);
  const ticket = avulsas.length ? receitaAvulsa / avulsas.length : 0;
  const porPar = paresAvulsa ? receitaAvulsa / paresAvulsa : 0;
  const mediaDia = diasDecorridos ? faturado / diasDecorridos : 0;
  const projecao = situacao === "atual" ? mediaDia * diasNoMes : faturado;

  function alvoInfo(valor) {
    const falta = Math.max(0, valor - faturado);
    return {
      valor,
      falta,
      batida: faturado >= valor,
      acima: Math.max(0, faturado - valor),
      pctFeito: valor ? (faturado / valor) * 100 : 0,
      pctFalta: valor ? (falta / valor) * 100 : 0,
      porDia: diasRestantes ? falta / diasRestantes : 0,
      vendas: ticket ? Math.ceil(falta / ticket) : null,
      pares: porPar ? Math.ceil(falta / porPar) : null,
    };
  }
  const meta = alvoInfo(alvo.meta);
  const superMeta = alvoInfo(alvo.superMeta);

  // Mês anterior, até o mesmo dia, para comparar.
  const prev = new Date(y, m - 2, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const diasPrev = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
  const limite = Math.min(diasDecorridos, diasPrev);
  const prevVendas = vendas.filter((v) => v.data?.startsWith(prevKey));
  const prevAteDia = somaValor(prevVendas.filter((v) => Number(v.data.slice(8, 10)) <= limite));
  const prevAvulsas = prevVendas.filter((v) => !v.assinaturaId);
  const prevTicket = prevAvulsas.length ? somaValor(prevAvulsas) / prevAvulsas.length : 0;

  const pontos = [];

  // 1. Ritmo
  if (situacao === "atual" && diasDecorridos > 0 && faturado > 0) {
    if (projecao < alvo.meta) {
      const aumento = mediaDia ? (meta.porDia / mediaDia - 1) * 100 : 0;
      pontos.push({
        tom: "atencao",
        texto: `No ritmo atual (${formatBRL(mediaDia)} por dia), o mês fecha em cerca de ${formatBRL(projecao)}, ou ${fmtPct((projecao / alvo.meta) * 100)} da meta. Para bater a meta, a média precisa subir para ${formatBRL(meta.porDia)} por dia (${fmtVar(aumento)}).`,
      });
    } else if (projecao < alvo.superMeta) {
      pontos.push({
        tom: "ok",
        texto: `No ritmo atual o mês fecha em cerca de ${formatBRL(projecao)}: a meta sai. Para a super meta, a média precisa ir de ${formatBRL(mediaDia)} para ${formatBRL(superMeta.porDia)} por dia.`,
      });
    } else {
      pontos.push({
        tom: "ok",
        texto: `No ritmo atual o mês fecha em cerca de ${formatBRL(projecao)}, acima da super meta. É manter a média de ${formatBRL(mediaDia)} por dia.`,
      });
    }
  }

  // 2. Comparação com o mês anterior até o mesmo dia
  if (diasDecorridos > 0 && prevAteDia > 0) {
    const variacao = (faturado / prevAteDia - 1) * 100;
    pontos.push({
      tom: variacao >= 0 ? "ok" : "atencao",
      texto: `Até o dia ${limite}, o mês passado tinha ${formatBRL(prevAteDia)}. Este mês, no mesmo período: ${formatBRL(faturado)} (${fmtVar(variacao)}).`,
    });
  }

  // 3. Ticket médio
  if (ticket && prevTicket) {
    const vt = (ticket / prevTicket - 1) * 100;
    if (vt <= -5) {
      pontos.push({
        tom: "atencao",
        texto: `O ticket médio caiu de ${formatBRL(prevTicket)} para ${formatBRL(ticket)} por venda (${fmtVar(vt)}). Oferecer um serviço a mais em cada atendimento ajuda a recuperar.`,
      });
    } else if (vt >= 5) {
      pontos.push({
        tom: "ok",
        texto: `O ticket médio subiu de ${formatBRL(prevTicket)} para ${formatBRL(ticket)} por venda (${fmtVar(vt)}).`,
      });
    }
  }

  // 4. Blindagem junto da higienização
  const comHig = avulsas.filter((v) => temServico(v, "higieniza"));
  const semBlind = comHig.filter((v) => !temServico(v, "blindagem"));
  if (comHig.length >= 3 && semBlind.length > 0) {
    const precoBlind = CATALOGO_SERVICOS.find((s) => s.nome.toLowerCase().includes("blindagem"))?.valor || 25;
    const paresSem = semBlind.reduce((s, v) => s + (paresDaVenda(v) || 1), 0);
    const ganho = Math.ceil(paresSem / 2) * precoBlind;
    const taxa = ((comHig.length - semBlind.length) / comHig.length) * 100;
    pontos.push({
      tom: "atencao",
      texto: `Só ${fmtPct(taxa)} das vendas com Higienização levaram Blindagem. Se metade dos ${paresSem} pares que ficaram sem ela tivesse levado, seriam ${formatBRL(ganho)} a mais (${fmtPct((ganho / alvo.meta) * 100)} da meta).`,
    });
  }

  // 5. Valores pendentes
  if (pendente > 0) {
    pontos.push({
      tom: "atencao",
      texto: `${formatBRL(pendente)} ainda está pendente (${fmtPct((pendente / faturado) * 100)} do faturado). Cobrar garante que esse valor entre no caixa.`,
    });
  }

  // 6. Canal que mais vende
  const porOrigem = {};
  avulsas.forEach((v) => {
    if (!v.origem) return;
    porOrigem[v.origem] = (porOrigem[v.origem] || 0) + Number(v.valor || 0);
  });
  const origens = Object.entries(porOrigem).sort((a, b) => b[1] - a[1]);
  if (origens.length && receitaAvulsa) {
    const [nome, valor] = origens[0];
    pontos.push({
      tom: "info",
      texto: `${nome} é o canal que mais trouxe dinheiro: ${formatBRL(valor)} (${fmtPct((valor / receitaAvulsa) * 100)} das vendas avulsas). Vale reforçar a divulgação por ali.`,
    });
  }

  return {
    situacao, diasNoMes, diasDecorridos, diasRestantes,
    faturado, pendente, ticket, porPar, mediaDia, projecao,
    qtdVendas: avulsas.length, pares: paresAvulsa,
    meta, superMeta, pontos,
  };
}

function BarraMeta({ faturado, meta, superMeta, altura = 14 }) {
  const escala = Math.max(superMeta, faturado) || 1;
  const largura = Math.min(100, (faturado / escala) * 100);
  const posMeta = (meta / escala) * 100;
  const posSuper = (superMeta / escala) * 100;
  return (
    <div style={{ position: "relative", height: altura, background: "#EFEBE1", borderRadius: 4 }}>
      <div style={{ width: `${largura}%`, height: "100%", background: "var(--green)", borderRadius: 4 }} />
      <div title="Meta" style={{ position: "absolute", top: -3, bottom: -3, left: `calc(${posMeta}% - 1px)`, width: 2, background: "var(--ink)" }} />
      <div title="Super meta" style={{ position: "absolute", top: -3, bottom: -3, left: `calc(${posSuper}% - 2px)`, width: 2, background: "#C7A96B" }} />
    </div>
  );
}

function MetaResumoTopo({ analise, onAbrir }) {
  const { faturado, meta, superMeta } = analise;
  const texto = superMeta.batida
    ? `Super meta batida! ${formatBRL(superMeta.acima)} acima`
    : meta.batida
    ? `Meta batida · faltam ${formatBRL(superMeta.falta)} para a super meta`
    : `Faltam ${formatBRL(meta.falta)} (${fmtPct(meta.pctFalta)}) para a meta`;
  return (
    <button
      onClick={onAbrir}
      style={{
        display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 18,
        background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 4, padding: "14px 16px",
        fontFamily: "Inter, sans-serif", color: "var(--ink)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
          Meta do mês
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
          {formatBRL(faturado)} <span style={{ color: "var(--muted)", fontWeight: 500 }}>de {formatBRL(meta.valor)} · {fmtPct(meta.pctFeito)}</span>
        </span>
      </div>
      <BarraMeta faturado={faturado} meta={meta.valor} superMeta={superMeta.valor} />
      <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: meta.batida ? "var(--green)" : "var(--ink)" }}>
        {texto} <span style={{ color: "var(--muted)", fontWeight: 500 }}>· ver análise →</span>
      </div>
    </button>
  );
}

function MetaAlvoCard({ titulo, info, faturado, analise, cor }) {
  const linha = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid var(--paper-line)" };
  const valorStyle = { fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--ink)", textAlign: "right" };
  return (
    <LedgerCard style={{ padding: "14px 16px", flex: "1 1 260px", borderTop: `3px solid ${cor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
          {titulo}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{formatBRL(info.valor)}</span>
      </div>
      <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 28, fontWeight: 800, color: info.batida ? "var(--green)" : "var(--ink)", lineHeight: 1.1 }}>
        {fmtPct(info.pctFeito)}
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginLeft: 6 }}>feito</span>
      </div>
      <div style={{ margin: "10px 0 6px", height: 8, background: "#EFEBE1", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, info.pctFeito)}%`, height: "100%", background: info.batida ? "var(--green)" : cor, borderRadius: 4 }} />
      </div>
      <div style={{ fontFamily: "Inter, sans-serif" }}>
        <div style={linha}>
          <span style={{ color: "var(--muted)" }}>Feito</span>
          <span style={valorStyle}>{formatBRL(faturado)} ({fmtPct(info.pctFeito)})</span>
        </div>
        {info.batida ? (
          <div style={linha}>
            <span style={{ color: "var(--muted)" }}>Acima do alvo</span>
            <span style={{ ...valorStyle, color: "var(--green)" }}>+{formatBRL(info.acima)}</span>
          </div>
        ) : (
          <>
            <div style={linha}>
              <span style={{ color: "var(--muted)" }}>Falta</span>
              <span style={{ ...valorStyle, color: "var(--rust)" }}>{formatBRL(info.falta)} ({fmtPct(info.pctFalta)})</span>
            </div>
            {analise.diasRestantes > 0 && (
              <div style={linha}>
                <span style={{ color: "var(--muted)" }}>Por dia ({analise.diasRestantes} dias, contando hoje)</span>
                <span style={valorStyle}>{formatBRL(info.porDia)}</span>
              </div>
            )}
            {info.vendas != null && (
              <div style={{ ...linha, borderBottom: "none" }}>
                <span style={{ color: "var(--muted)" }}>No ticket atual, equivale a</span>
                <span style={valorStyle}>
                  {info.vendas} venda{info.vendas === 1 ? "" : "s"}
                  {info.pares != null ? ` · ${labelPares(info.pares)}` : ""}
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {info.batida && (
        <div style={{ marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, color: "var(--green)" }}>✅ Batida!</div>
      )}
    </LedgerCard>
  );
}

function MetaPainel({ analise, alvo, mesLabel, onEditar }) {
  if (!alvo) {
    return (
      <LedgerCard style={{ padding: "26px 18px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 14 }}>Ainda não há meta definida para {mesLabel}.</div>
        <button
          onClick={onEditar}
          style={{ padding: "10px 16px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontWeight: 600, fontSize: 13 }}
        >
          Definir meta de {mesLabel}
        </button>
      </LedgerCard>
    );
  }
  const corPonto = { atencao: "var(--rust)", ok: "var(--green)", info: "var(--ink)" };
  const iconePonto = { atencao: "⚠️", ok: "✅", info: "💡" };
  const ritmo = [
    ["Média por dia", formatBRL(analise.mediaDia)],
    [analise.situacao === "atual" ? "Projeção do mês" : "Fechamento", formatBRL(analise.projecao)],
    ["Ticket médio", formatBRL(analise.ticket)],
    ["Valor médio por par", formatBRL(analise.porPar)],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LedgerCard style={{ padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
            Meta de {mesLabel}
          </span>
          <button
            onClick={onEditar}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 4, border: "1px solid var(--paper-line)", background: "transparent", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer" }}
          >
            <Pencil size={12} /> Editar meta
          </button>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
          {formatBRL(analise.faturado)}
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginLeft: 8 }}>
            faturado · {analise.qtdVendas} venda{analise.qtdVendas === 1 ? "" : "s"} · {labelPares(analise.pares)}
          </span>
        </div>
        <BarraMeta faturado={analise.faturado} meta={alvo.meta} superMeta={alvo.superMeta} altura={16} />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 3, background: "var(--ink)", verticalAlign: "middle", marginRight: 5 }} />Meta {formatBRL(alvo.meta)}</span>
          <span><span style={{ display: "inline-block", width: 10, height: 3, background: "#C7A96B", verticalAlign: "middle", marginRight: 5 }} />Super meta {formatBRL(alvo.superMeta)}</span>
          {analise.situacao === "atual" && (
            <span>Dia {analise.diasDecorridos} de {analise.diasNoMes}</span>
          )}
        </div>
      </LedgerCard>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetaAlvoCard titulo="Meta" info={analise.meta} faturado={analise.faturado} analise={analise} cor="var(--ink)" />
        <MetaAlvoCard titulo="Super meta" info={analise.superMeta} faturado={analise.faturado} analise={analise} cor="#C7A96B" />
      </div>

      <LedgerCard style={{ padding: "14px 16px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>
          Ritmo
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {ritmo.map(([label, valor]) => (
            <div key={label}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{valor}</div>
            </div>
          ))}
        </div>
      </LedgerCard>

      <LedgerCard style={{ padding: "14px 16px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>
          Pontos a melhorar
        </div>
        {analise.pontos.length === 0 ? (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)" }}>
            Ainda não há vendas suficientes neste mês para analisar.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analise.pontos.map((pt, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "Inter, sans-serif", fontSize: 13, lineHeight: 1.5, color: "var(--ink)", paddingLeft: 10, borderLeft: `3px solid ${corPonto[pt.tom]}` }}>
                <span>{iconePonto[pt.tom]}</span>
                <span>{pt.texto}</span>
              </div>
            ))}
          </div>
        )}
      </LedgerCard>
    </div>
  );
}

function MetaModal({ mesLabel, initial, onSave, onClose }) {
  const [meta, setMeta] = useState(initial?.meta != null ? String(initial.meta) : "");
  const [superMeta, setSuperMeta] = useState(initial?.superMeta != null ? String(initial.superMeta) : "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const m = parseFloat(String(meta).replace(/\./g, "").replace(",", "."));
    const sm = parseFloat(String(superMeta).replace(/\./g, "").replace(",", "."));
    if (!m || m <= 0) {
      setError("Informe uma meta válida.");
      return;
    }
    if (!sm || sm < m) {
      setError("A super meta precisa ser maior ou igual à meta.");
      return;
    }
    onSave({ meta: m, superMeta: sm });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>Meta de {mesLabel}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Meta (R$)">
              <input type="text" inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="4000" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>
            <Field label="Super meta (R$)">
              <input type="text" inputMode="decimal" value={superMeta} onChange={(e) => setSuperMeta(e.target.value)} placeholder="5000" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
            </Field>
            {error && <div style={{ color: "var(--rust)", fontSize: 12.5, fontFamily: "Inter, sans-serif" }}>{error}</div>}
            <button
              type="submit"
              style={{ marginTop: 6, padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5 }}
            >
              Salvar meta
            </button>
          </form>
        </LedgerCard>
      </div>
    </div>
  );
}

// ---------- Ficha do cliente ----------
function ClienteModal({ initial, vendas, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    nome: initial?.nome || "", telefone: initial?.telefone || "", instagram: initial?.instagram || "",
    bairro: initial?.bairro || "", endereco: initial?.endereco || "", aniversario: initial?.aniversario || "",
    origem: initial?.origem || "", observacoes: initial?.observacoes || "",
  }));
  const [error, setError] = useState("");
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const resumo = initial?.id ? resumoCliente(vendas, initial) : null;
  const wa = linkWhatsApp(form.telefone);
  const opcoesOrigem = form.origem && !ORIGENS_CLIENTE.includes(form.origem) ? [...ORIGENS_CLIENTE, form.origem] : ORIGENS_CLIENTE;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    onSave({
      id: initial?.id || uid(),
      criadoEm: initial?.criadoEm || todayStr(),
      ...form,
      nome: form.nome.trim().replace(/\s+/g, " "),
      instagram: form.instagram.trim().replace(/^@/, ""),
    });
  }

  const linhaResumo = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "4px 0" };
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              {initial?.id ? "Ficha do cliente" : "Novo cliente"}
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {resumo && (
            <div style={{ border: "1px solid var(--paper-line)", borderRadius: 5, padding: "10px 12px", marginBottom: 14, fontFamily: "Inter, sans-serif" }}>
              <div style={linhaResumo}><span style={{ color: "var(--muted)" }}>Total gasto</span><strong style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--green)" }}>{formatBRL(resumo.total)}</strong></div>
              <div style={linhaResumo}><span style={{ color: "var(--muted)" }}>Vendas · pares</span><span>{resumo.qtd} venda{resumo.qtd === 1 ? "" : "s"} · {labelPares(resumo.pares)}</span></div>
              <div style={linhaResumo}><span style={{ color: "var(--muted)" }}>Ticket médio</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatBRL(resumo.ticket)}</span></div>
              <div style={linhaResumo}>
                <span style={{ color: "var(--muted)" }}>Última visita</span>
                <span style={{ color: resumo.dias != null && resumo.dias >= DIAS_SUMIDO ? "var(--rust)" : "var(--ink)", fontWeight: 600 }}>
                  {resumo.ultima ? `${formatDateBR(resumo.ultima)} (há ${resumo.dias} dia${resumo.dias === 1 ? "" : "s"})` : "—"}
                </span>
              </div>
              {resumo.primeira && <div style={linhaResumo}><span style={{ color: "var(--muted)" }}>Cliente desde</span><span>{formatDateBR(resumo.primeira)}</span></div>}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Nome">
              <input id="cliente-nome" type="text" value={form.nome} onChange={set("nome")} placeholder="Nome do cliente" style={inputStyle} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              <Field label="WhatsApp">
                <input id="cliente-telefone" type="tel" inputMode="tel" value={form.telefone} onChange={set("telefone")} placeholder="(65) 99999-9999" style={inputStyle} />
              </Field>
              <Field label="Instagram">
                <input id="cliente-instagram" type="text" value={form.instagram} onChange={set("instagram")} placeholder="@usuario" style={inputStyle} />
              </Field>
              <Field label="Bairro">
                <input id="cliente-bairro" type="text" value={form.bairro} onChange={set("bairro")} placeholder="Ex.: Parque das Nações" style={inputStyle} />
              </Field>
              <Field label="Aniversário">
                <input id="cliente-aniversario" type="date" value={form.aniversario} onChange={set("aniversario")} style={inputStyle} />
              </Field>
            </div>
            <Field label="Endereço (para busca e entrega)">
              <input id="cliente-endereco" type="text" value={form.endereco} onChange={set("endereco")} placeholder="Rua, número, complemento" style={inputStyle} />
            </Field>
            <Field label="Como conheceu a PrimeStep">
              <select id="cliente-origem" value={form.origem} onChange={set("origem")} style={inputStyle}>
                <option value="">Selecione…</option>
                {opcoesOrigem.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Observações">
              <textarea
                id="cliente-observacoes"
                value={form.observacoes}
                onChange={set("observacoes")}
                rows={3}
                placeholder="Tênis que costuma trazer, preferências, combinados…"
                style={{ ...inputStyle, resize: "vertical", fontFamily: "Inter, sans-serif" }}
              />
            </Field>
            {error && <div style={{ color: "var(--rust)", fontSize: 12.5, fontFamily: "Inter, sans-serif" }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <button
                type="submit"
                style={{ flex: "1 1 160px", padding: "11px 14px", borderRadius: 5, border: "none", cursor: "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5 }}
              >
                Salvar ficha
              </button>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: "1 1 160px", textAlign: "center", padding: "11px 14px", borderRadius: 5, border: "1px solid var(--green)", color: "var(--green)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, textDecoration: "none" }}
                >
                  Chamar no WhatsApp
                </a>
              )}
            </div>
          </form>

          {resumo && resumo.vendas.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>
                Histórico
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {resumo.vendas
                  .slice()
                  .sort((a, b) => (a.data < b.data ? 1 : -1))
                  .map((v) => (
                    <div key={v.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, borderBottom: "1px solid var(--paper-line)", paddingBottom: 6 }}>
                      <span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", marginRight: 8 }}>{formatDateBR(v.data)}</span>
                        {(v.itens || []).map((i) => (i.quantidade > 1 ? `${i.servico} (x${i.quantidade})` : i.servico)).join(", ")}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--green)", whiteSpace: "nowrap" }}>{formatBRL(v.valor)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </LedgerCard>
      </div>
    </div>
  );
}

function ClientesTab({ clientes, clientesOk, vendas, onAbrir, onExcluir, onImportar }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos"); // todos | sumidos | aniversario
  const mesAtual = new Date().getMonth() + 1;

  const linhas = useMemo(
    () => clientes.map((c) => ({ c, r: resumoCliente(vendas, c) })),
    [clientes, vendas]
  );
  const nomesSemFicha = useMemo(() => {
    const comFicha = new Set(clientes.map((c) => normalizarNome(c.nome)));
    const ids = new Set(clientes.map((c) => c.id));
    const set = new Set();
    vendas.forEach((v) => {
      if (v.assinaturaId || (v.clienteId && ids.has(v.clienteId))) return;
      const n = normalizarNome(v.cliente);
      if (n && !comFicha.has(n)) set.add(n);
    });
    return set.size;
  }, [clientes, vendas]);

  const sumidos = linhas.filter((l) => l.r.dias != null && l.r.dias >= DIAS_SUMIDO);
  const aniversariantes = linhas.filter((l) => l.c.aniversario && Number(l.c.aniversario.slice(5, 7)) === mesAtual);
  const termo = normalizarNome(busca);
  let lista = filtro === "sumidos" ? sumidos : filtro === "aniversario" ? aniversariantes : linhas;
  if (termo) {
    lista = lista.filter((l) => normalizarNome(l.c.nome).includes(termo) || (l.c.telefone || "").replace(/\D/g, "").includes(busca.replace(/\D/g, "") || "#") || normalizarNome(l.c.bairro).includes(termo));
  }
  lista = lista.slice().sort((a, b) =>
    filtro === "sumidos" ? (b.r.dias || 0) - (a.r.dias || 0) : (b.r.ultima || "").localeCompare(a.r.ultima || "") || porNome(a.c, b.c)
  );

  const chip = (key, label) => (
    <button
      key={key}
      onClick={() => setFiltro(key)}
      style={{
        padding: "6px 11px", borderRadius: 4, border: "1px solid var(--paper-line)",
        background: filtro === key ? "var(--ink)" : "transparent", color: filtro === key ? "var(--paper)" : "var(--muted)",
        fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  if (!clientesOk) {
    return (
      <LedgerCard style={{ padding: "22px 18px", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
        A ficha de clientes ainda não está ativa: falta rodar no Supabase o comando que cria a tabela de clientes.
      </LedgerCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {nomesSemFicha > 0 && (
        <LedgerCard style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)" }}>
            <strong>{nomesSemFicha}</strong> cliente{nomesSemFicha === 1 ? "" : "s"} das vendas ainda não {nomesSemFicha === 1 ? "tem" : "têm"} ficha.
          </span>
          <button
            onClick={onImportar}
            style={{ padding: "8px 12px", borderRadius: 5, border: "none", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}
          >
            Criar fichas a partir das vendas
          </button>
        </LedgerCard>
      )}

      <LedgerCard style={{ padding: "12px 14px 4px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input
            id="clientes-busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou bairro"
            style={{ ...inputStyle, flex: "1 1 220px", minWidth: 0 }}
          />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {chip("todos", `Todos (${linhas.length})`)}
            {chip("sumidos", `Sumidos há ${DIAS_SUMIDO}+ dias (${sumidos.length})`)}
            {chip("aniversario", `Aniversariantes do mês (${aniversariantes.length})`)}
          </div>
        </div>

        {lista.length === 0 ? (
          <div style={{ padding: "22px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
            {linhas.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}
          </div>
        ) : (
          lista.map(({ c, r }) => {
            const wa = linkWhatsApp(c.telefone);
            const sumido = r.dias != null && r.dias >= DIAS_SUMIDO;
            return (
              <div key={c.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "12px 4px", borderTop: "1px solid var(--paper-line)", fontFamily: "Inter, sans-serif" }}>
                <button onClick={() => onAbrir(c)} style={{ flex: "1 1 200px", minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ink)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                    {[formatTelefone(c.telefone), c.bairro, c.origem].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                  </div>
                </button>
                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13.5, color: "var(--green)" }}>{formatBRL(r.total)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.qtd} venda{r.qtd === 1 ? "" : "s"} · {labelPares(r.pares)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: sumido ? "var(--rust)" : "var(--muted)" }}>
                    {r.ultima ? `última há ${r.dias} dia${r.dias === 1 ? "" : "s"}` : "sem vendas"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" title="Chamar no WhatsApp" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green)", textDecoration: "none", border: "1px solid var(--green)", borderRadius: 4, padding: "4px 8px" }}>
                      WhatsApp
                    </a>
                  )}
                  <button onClick={() => onAbrir(c)} title="Abrir ficha" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onExcluir(c.id)} title="Excluir ficha" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </LedgerCard>
    </div>
  );
}

// ---------- Recado do dia ----------
// Junta o que pede atenção hoje: ritmo da meta, ontem, cobranças, pares em processo,
// aniversariantes e clientes para chamar de volta. Recalculado sempre com os dados atuais.
function montarRecadoDoDia({ vendas, pedidos, clientes, alvo, hoje, melhorDiaSemana, contasEntregador = [], contasTerceirizado = [] }) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hojeIso = iso(hoje);
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const ontemIso = iso(ontem);
  const mesKey = hojeIso.slice(0, 7);
  const itens = [];

  const vendasHoje = vendas.filter((v) => v.data === hojeIso);
  const totalHoje = somaValor(vendasHoje);

  // 1. Meta: quanto o dia de hoje precisa
  if (alvo) {
    const a = analisarMeta(vendas, mesKey, alvo, hoje);
    if (a.superMeta.batida) {
      itens.push({ tom: "ok", texto: `Super meta do mês batida: ${formatBRL(a.faturado)}, ${formatBRL(a.superMeta.acima)} acima. Hoje: ${formatBRL(totalHoje)}.` });
    } else {
      const alvoAtual = a.meta.batida ? a.superMeta : a.meta;
      const nome = a.meta.batida ? "a super meta" : "a meta";
      const faltaAntesDeHoje = Math.max(0, alvoAtual.valor - (a.faturado - totalHoje));
      const precisaHoje = a.diasRestantes ? faltaAntesDeHoje / a.diasRestantes : 0;
      if (totalHoje >= precisaHoje && totalHoje > 0) {
        itens.push({ tom: "ok", texto: `Hoje: ${formatBRL(totalHoje)}. Já passou dos ${formatBRL(precisaHoje)} que o dia precisa para ${nome}.` });
      } else {
        itens.push({
          tom: "atencao",
          texto: `Hoje: ${formatBRL(totalHoje)} de ${formatBRL(precisaHoje)} que o dia precisa para ${nome}. Faltam ${formatBRL(precisaHoje - totalHoje)}${a.ticket ? (() => { const n = Math.max(1, Math.ceil((precisaHoje - totalHoje) / a.ticket)); return `, cerca de ${n} venda${n === 1 ? "" : "s"} no seu ticket médio`; })() : ""}.`,
        });
      }
    }
  }

  // 2. Ontem
  if (ontemIso.slice(0, 7) === mesKey) {
    const vOntem = vendas.filter((v) => v.data === ontemIso);
    const tOntem = somaValor(vOntem);
    itens.push({
      tom: tOntem > 0 ? "info" : "atencao",
      texto: tOntem > 0
        ? `Ontem: ${formatBRL(tOntem)} em ${vOntem.length} venda${vOntem.length === 1 ? "" : "s"} (${labelPares(somaPares(vOntem))}).`
        : "Ontem não teve venda lançada. Se teve, lance para os números ficarem certos.",
    });
  }

  // 3. Cobranças pendentes
  const pendentes = vendas.filter((v) => faltaReceber(v) > 0).sort((x, y) => faltaReceber(y) - faltaReceber(x));
  if (pendentes.length) {
    const nomes = pendentes.slice(0, 3).map((v) => `${v.cliente} (${formatBRL(faltaReceber(v))})`).join(", ");
    itens.push({
      tom: "atencao",
      texto: `${formatBRL(somaFalta(pendentes))} para receber em ${pendentes.length} venda${pendentes.length === 1 ? "" : "s"}. Cobrar: ${nomes}${pendentes.length > 3 ? " e outros" : ""}.`,
    });
  }

  // 4. Onde estão os pares que ainda não foram entregues
  const aqui = pedidos.filter((p) => p.etapa === "primestep");
  const fora = pedidos.filter((p) => p.etapa === "terceirizado");
  const foraHaMuito = fora.filter((p) => p.dataTerceirizado && diasDesde(p.dataTerceirizado) > 7);
  if (aqui.length || fora.length) {
    const somaP = (l) => l.reduce((s, p) => s + paresDoPedido(p), 0);
    const partes = [];
    if (aqui.length) partes.push(`${labelPares(somaP(aqui))} aqui na PrimeStep`);
    if (fora.length) partes.push(`${labelPares(somaP(fora))} no terceirizado`);
    if (foraHaMuito.length) partes.push(`${foraHaMuito.length} pedido${foraHaMuito.length === 1 ? "" : "s"} no terceirizado há mais de 7 dias (${foraHaMuito.slice(0, 3).map((p) => p.cliente).join(", ")})`);
    itens.push({ tom: foraHaMuito.length ? "atencao" : "info", texto: `Ainda não entregues: ${partes.join(" · ")}.` });
  }

  // 5. Aniversariantes
  const mmdd = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const proximos = [];
  for (let i = 0; i < 7; i++) proximos.push(mmdd(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i)));
  const aniv = clientes
    .filter((c) => c.aniversario && proximos.includes(c.aniversario.slice(5)))
    .sort((x, y) => proximos.indexOf(x.aniversario.slice(5)) - proximos.indexOf(y.aniversario.slice(5)));
  if (aniv.length) {
    const hojeAniv = aniv.filter((c) => c.aniversario.slice(5) === proximos[0]);
    itens.push({
      tom: "info",
      texto: hojeAniv.length
        ? `Hoje é aniversário de ${hojeAniv.map((c) => c.nome).join(", ")}. Mande uma mensagem com um mimo ou desconto.`
        : `Aniversários nesta semana: ${aniv.slice(0, 3).map((c) => `${c.nome} (${c.aniversario.slice(8, 10)}/${c.aniversario.slice(5, 7)})`).join(", ")}.`,
    });
  }

  // 6. Clientes para chamar de volta (os que mais gastaram entre os sumidos)
  const sumidos = clientes
    .map((c) => ({ c, r: resumoCliente(vendas, c) }))
    .filter((x) => x.r.dias != null && x.r.dias >= DIAS_SUMIDO)
    .sort((x, y) => y.r.total - x.r.total);
  if (sumidos.length) {
    itens.push({
      tom: "atencao",
      texto: `${sumidos.length} cliente${sumidos.length === 1 ? "" : "s"} sem voltar há ${DIAS_SUMIDO}+ dias. Comece por: ${sumidos.slice(0, 3).map((x) => `${x.c.nome} (há ${x.r.dias} dias)`).join(", ")}.`,
    });
  }

  // 7. Melhor dia da semana
  if (melhorDiaSemana && melhorDiaSemana.total > 0 && DIAS_SEMANA[hoje.getDay()] === melhorDiaSemana.label) {
    itens.push({ tom: "info", texto: `Hoje é ${DIAS_SEMANA_EXT[hoje.getDay()].toLowerCase()}, o dia da semana que mais vende. Bom dia para postar e responder rápido.` });
  }

  // Conta do entregador
  contasEntregador
    .filter((c) => c.falta > 0.009)
    .forEach((c) => {
      itens.push({
        tom: "info",
        texto: `Falta pagar ${formatBRL(c.falta)} ao ${c.nome} (${c.pendentes.length} entrega${c.pendentes.length === 1 ? "" : "s"}). Acerte em Despesas › Conta do entregador.`,
      });
    });
  // Conta das sapatarias
  contasTerceirizado
    .filter((c) => c.falta > 0.009)
    .forEach((c) => {
      itens.push({
        tom: "info",
        texto: `Falta pagar ${formatBRL(c.falta)} à ${c.nome} (${c.pendentes.length} serviço${c.pendentes.length === 1 ? "" : "s"}). Acerte em Despesas › Conta das sapatarias.`,
      });
    });
  return itens;
}

function RecadoDoDia({ itens, hoje }) {
  const [aberto, setAberto] = useState(true);
  if (!itens.length) return null;
  const cor = { atencao: "var(--rust)", ok: "var(--green)", info: "var(--ink)" };
  const icone = { atencao: "⚠️", ok: "✅", info: "💡" };
  return (
    <LedgerCard style={{ padding: "14px 16px", marginBottom: 18 }}>
      <button
        onClick={() => setAberto((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "100%", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
          Recado do dia · {DIAS_SEMANA_EXT[hoje.getDay()]}, {formatDateBR(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`)}
        </span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)" }}>{aberto ? "ocultar ▴" : `mostrar (${itens.length}) ▾`}</span>
      </button>
      {aberto && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {itens.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontFamily: "Inter, sans-serif", fontSize: 13, lineHeight: 1.5, color: "var(--ink)", paddingLeft: 10, borderLeft: `3px solid ${cor[it.tom]}` }}>
              <span>{icone[it.tom]}</span>
              <span>{it.texto}</span>
            </div>
          ))}
        </div>
      )}
    </LedgerCard>
  );
}

// ---------- Resumo do mês ----------
function ResumoDoMes({ vendas, despesas, clientes, mesKey, mesLabel, alvo }) {
  const doMes = (lista, k) => lista.filter((x) => x.data?.startsWith(k));
  const [y, m] = mesKey.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  function calcular(k) {
    const vs = doMes(vendas, k);
    const ds = doMes(despesas, k);
    const receitas = somaValor(vs);
    const recebido = vs.reduce((s, v) => s + valorRecebido(v), 0);
    const descontos = Math.max(0, receitas - recebido);
    const cv = custosDasVendas(vs);
    const todasDespesas = ds.reduce((s, d) => s + Number(d.valor || 0), 0);
    const entregasDesp = somaCategoria(ds, "Entregas");
    const trafego = somaCategoria(ds, "Tráfego pago");
    const outras = todasDespesas - entregasDesp - trafego;
    const lucro = recebido - cv.total - todasDespesas;
    return { vs, receitas, recebido, descontos, cv, entregas: cv.entregas + entregasDesp, trafego, outras, lucro, margem: recebido > 0 ? (lucro / recebido) * 100 : 0 };
  }
  const atual = calcular(mesKey);
  const anterior = calcular(prevKey);
  const vs = atual.vs;
  const avulsas = vs.filter((v) => !v.assinaturaId);

  // Clientes novos x que voltaram (pela ficha, ou pelo nome nas vendas antigas).
  const chave = (v) => v.clienteId || `n:${normalizarNome(v.cliente)}`;
  const primeiraCompra = {};
  vendas.forEach((v) => {
    if (v.assinaturaId || !v.data) return;
    const k = chave(v);
    if (!primeiraCompra[k] || v.data < primeiraCompra[k]) primeiraCompra[k] = v.data;
  });
  const clientesMes = [...new Set(avulsas.map(chave))];
  const novos = clientesMes.filter((k) => (primeiraCompra[k] || "").startsWith(mesKey)).length;
  const voltaram = clientesMes.length - novos;

  const somaPor = (campo) => {
    const t = {};
    avulsas.forEach((v) => {
      const k = campo(v);
      if (k) t[k] = (t[k] || 0) + Number(v.valor || 0);
    });
    return Object.entries(t).sort((a, b) => b[1] - a[1]);
  };
  const origens = somaPor((v) => v.origem);
  const servicos = {};
  avulsas.forEach((v) => (v.itens || []).forEach((it) => { const k = nomeServicoPadrao(it.servico); servicos[k] = (servicos[k] || 0) + Number(it.valor || 0); }));
  const topServico = Object.entries(servicos).sort((a, b) => b[1] - a[1])[0];
  const semCusto = avulsas.filter((v) => v.custo == null && v.custoEntrega == null).length;
  const pendente = somaFalta(vs);
  const varPct = (a, b) => (b ? (a / b - 1) * 100 : null);

  const linhas = [
    ["Faturamento", formatBRL(atual.receitas), "var(--ink)"],
    ...(atual.descontos > 0.009 ? [["(−) Descontos", formatBRL(atual.descontos), "var(--rust)"]] : []),
    ["(−) Terceirização e produtos", formatBRL(atual.cv.terceirizacao), "var(--rust)"],
    ["(−) Entregas", formatBRL(atual.entregas), "var(--rust)"],
    ...(atual.trafego > 0 ? [["(−) Tráfego pago", formatBRL(atual.trafego), "var(--rust)"]] : []),
    ["(−) Outras despesas", formatBRL(atual.outras), "var(--rust)"],
  ];

  const destaques = [];
  if (anterior.receitas > 0) {
    const vr = varPct(atual.receitas, anterior.receitas);
    const vl = anterior.lucro !== 0 ? varPct(atual.lucro, anterior.lucro) : null;
    destaques.push({ tom: vr >= 0 ? "ok" : "atencao", texto: `Faturamento ${fmtVar(vr)} em relação ao mês anterior (${formatBRL(anterior.receitas)})${vl !== null && anterior.lucro > 0 ? `; lucro ${fmtVar(vl)}` : ""}.` });
  }
  if (alvo) {
    const pct = (atual.receitas / alvo.meta) * 100;
    destaques.push({
      tom: atual.receitas >= alvo.meta ? "ok" : "atencao",
      texto: atual.receitas >= alvo.superMeta
        ? `Super meta batida: ${fmtPct((atual.receitas / alvo.superMeta) * 100)} de ${formatBRL(alvo.superMeta)}.`
        : `Meta: ${fmtPct(pct)} de ${formatBRL(alvo.meta)}${atual.receitas >= alvo.meta ? " — batida!" : `, faltando ${formatBRL(alvo.meta - atual.receitas)}`}.`,
    });
  }
  if (clientesMes.length) destaques.push({ tom: "info", texto: `${clientesMes.length} cliente${clientesMes.length === 1 ? "" : "s"} atendido${clientesMes.length === 1 ? "" : "s"}: ${novos} novo${novos === 1 ? "" : "s"} e ${voltaram} que já ${voltaram === 1 ? "era cliente" : "eram clientes"}.` });
  if (origens.length) destaques.push({ tom: "info", texto: `Canal que mais faturou: ${origens[0][0]} (${formatBRL(origens[0][1])}, ${fmtPct((origens[0][1] / Math.max(1, somaValor(avulsas))) * 100)} das vendas avulsas).` });
  if (topServico) destaques.push({ tom: "info", texto: `Serviço que mais faturou: ${topServico[0]} (${formatBRL(topServico[1])}).` });
  if (pendente > 0) destaques.push({ tom: "atencao", texto: `${formatBRL(pendente)} ainda pendente de receber.` });
  if (semCusto > 0) destaques.push({ tom: "atencao", texto: `${semCusto} venda${semCusto === 1 ? "" : "s"} sem custo lançado: o lucro real pode estar maior do que é.` });

  const cor = { atencao: "var(--rust)", ok: "var(--green)", info: "var(--ink)" };
  const icone = { atencao: "⚠️", ok: "✅", info: "💡" };
  const rotulo = { fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 };
  const kpis = [
    ["Vendas", String(vs.length)],
    ["Pares", String(somaPares(vs))],
    ["Ticket médio", formatBRL(avulsas.length ? somaValor(avulsas) / avulsas.length : 0)],
    ["Margem", fmtPct(atual.margem)],
  ];

  return (
    <LedgerCard style={{ padding: "16px 16px 14px" }}>
      <div style={{ ...rotulo, marginBottom: 12 }}>Resumo do mês — {mesLabel}</div>
      {vs.length === 0 && atual.outras + atual.trafego + atual.entregas === 0 ? (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)" }}>Nenhum lançamento neste mês.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: "Inter, sans-serif" }}>
            {linhas.map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--paper-line)" }}>
                <span style={{ color: "var(--muted)" }}>{l}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: c }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0 0", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Lucro líquido</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: atual.lucro >= 0 ? "var(--green)" : "var(--rust)" }}>
                {formatBRL(atual.lucro)}
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            {kpis.map(([l, v]) => (
              <div key={l}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>{l}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{v}</div>
              </div>
            ))}
          </div>
          {destaques.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {destaques.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontFamily: "Inter, sans-serif", fontSize: 13, lineHeight: 1.5, color: "var(--ink)", paddingLeft: 10, borderLeft: `3px solid ${cor[d.tom]}` }}>
                  <span>{icone[d.tom]}</span>
                  <span>{d.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </LedgerCard>
  );
}

// ---------- Operacional: onde estão os pares ----------
function OperacionalTab({ pedidos, vendas, onMover, onEditar, onExcluir, onAdicionarVenda }) {
  const [verEntregues, setVerEntregues] = useState(false);
  const rotulo = { fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 };
  const btn = (primario) => ({
    padding: "6px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
    border: primario ? "none" : "1px solid var(--paper-line)", background: primario ? "var(--ink)" : "#FFFDF8", color: primario ? "var(--paper)" : "var(--ink)",
  });
  const somaP = (l) => l.reduce((s, p) => s + paresDoPedido(p), 0);
  const porEntrada = (a, b) => (a.dataEntrada < b.dataEntrada ? -1 : 1);
  const aqui = pedidos.filter((p) => p.etapa === "primestep").sort(porEntrada);
  const fora = pedidos.filter((p) => p.etapa === "terceirizado").sort((a, b) => ((a.dataTerceirizado || a.dataEntrada) < (b.dataTerceirizado || b.dataEntrada) ? -1 : 1));
  const entregues = pedidos.filter((p) => p.etapa === "entregue").sort((a, b) => ((a.dataEntrega || "") < (b.dataEntrega || "") ? 1 : -1));
  // Etapas antigas (do quadro anterior) contam como "aqui".
  const antigos = pedidos.filter((p) => !ETAPAS_PEDIDO.some((e) => e.id === p.etapa));
  const mesAtual = todayStr().slice(0, 7);
  const entreguesMes = entregues.filter((p) => (p.dataEntrega || "").startsWith(mesAtual));
  const vendaPorId = Object.fromEntries(vendas.map((v) => [v.id, v]));
  // Vendas dos últimos 21 dias com pares que ainda não estão no controle.
  const limite = new Date(); limite.setDate(limite.getDate() - 21);
  const limiteIso = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;
  const noControle = new Set(pedidos.map((p) => p.vendaId).filter(Boolean));
  const foraDoControle = vendas
    .filter((v) => !v.assinaturaId && v.data >= limiteIso && paresDaVenda(v) > 0 && !noControle.has(v.id))
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  function Cartao({ p, cor }) {
    const venda = p.vendaId ? vendaPorId[p.vendaId] : null;
    const falta = venda ? faltaReceber(venda) : 0;
    const dias = p.etapa === "terceirizado" && p.dataTerceirizado ? diasDesde(p.dataTerceirizado) : diasDesde(p.dataEntrada);
    const alerta = p.etapa === "terceirizado" ? dias > 7 : p.etapa === "primestep" ? dias > 5 : false;
    return (
      <div style={{ border: "1px solid var(--paper-line)", borderLeft: `3px solid ${cor}`, borderRadius: 5, padding: "10px 12px", background: "#FFFDF8", display: "flex", flexDirection: "column", gap: 6, fontFamily: "Inter, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <div>
            <strong style={{ fontSize: 14, color: "var(--ink)" }}>{p.cliente}</strong>
            <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600, marginLeft: 8 }}>{labelPares(paresDoPedido(p))}</span>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.tenis}</div>
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <button onClick={() => onEditar(p)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}><Pencil size={13} /></button>
            <button onClick={() => onExcluir(p.id)} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 2 }}><Trash2 size={13} /></button>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: alerta ? "var(--rust)" : "var(--muted)", fontWeight: alerta ? 600 : 400 }}>
          {p.etapa === "entregue"
            ? `Entregue em ${formatDateBR(p.dataEntrega)}`
            : p.etapa === "terceirizado"
            ? `No terceirizado há ${dias} dia${dias === 1 ? "" : "s"}${p.dataTerceirizado ? ` (desde ${formatDateBR(p.dataTerceirizado)})` : ""}`
            : `Chegou em ${formatDateBR(p.dataEntrada)} · há ${dias} dia${dias === 1 ? "" : "s"}`}
        </div>
        {p.observacoes && <div style={{ fontSize: 11.5, color: "var(--ink)", fontStyle: "italic" }}>{p.observacoes}</div>}
        {p.etapa !== "entregue" && falta > 0.009 && (
          <div style={{ fontSize: 12, color: "var(--rust)", fontWeight: 600 }}>Cobrar {formatBRL(falta)} na entrega</div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          {p.etapa === "primestep" && <button style={btn(false)} onClick={() => onMover(p, "terceirizado")}>Mandei pro terceirizado</button>}
          {p.etapa === "terceirizado" && <button style={btn(false)} onClick={() => onMover(p, "primestep")}>Voltou pra PrimeStep</button>}
          {p.etapa !== "entregue" && <button style={btn(true)} onClick={() => onMover(p, "entregue")}>Entreguei ✓</button>}
          {p.etapa === "entregue" && <button style={btn(false)} onClick={() => onMover(p, "primestep")}>Desfazer entrega</button>}
        </div>
      </div>
    );
  }

  const Secao = ({ titulo, lista, cor, vazio }) => (
    <LedgerCard style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: cor }} />
        <span style={rotulo}>{titulo}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ink)", fontWeight: 700 }}>{labelPares(somaP(lista))}</span>
      </div>
      {lista.length === 0 ? (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--muted)" }}>{vazio}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {lista.map((p) => <Cartao key={p.id} p={p} cor={cor} />)}
        </div>
      )}
    </LedgerCard>
  );

  const resumo = [
    ["Aqui na PrimeStep", somaP(aqui) + somaP(antigos), ETAPAS_PEDIDO[0].color],
    ["No terceirizado", somaP(fora), ETAPAS_PEDIDO[1].color],
    ["Entregues no mês", somaP(entreguesMes), ETAPAS_PEDIDO[2].color],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {resumo.map(([l, n, c]) => (
          <LedgerCard key={l} style={{ padding: "12px 12px", borderTop: `3px solid ${c}` }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>{l}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{n}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)" }}>par{n === 1 ? "" : "es"}</div>
          </LedgerCard>
        ))}
      </div>

      {foraDoControle.length > 0 && (
        <LedgerCard style={{ padding: "14px 16px", border: "1px solid var(--rust)" }}>
          <div style={{ ...rotulo, color: "var(--rust)", marginBottom: 4 }}>Vendas recentes fora do controle ({foraDoControle.length})</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
            Diga onde está cada par para ele entrar no controle. Vendas novas já entram sozinhas.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {foraDoControle.map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", borderBottom: "1px solid var(--paper-line)", paddingBottom: 8, fontFamily: "Inter, sans-serif" }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "var(--muted)", marginRight: 8 }}>{formatDateBR(v.data)}</span>
                  <strong>{v.cliente}</strong> · {labelPares(paresDaVenda(v))}
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{resumoServicos(v)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={btn(false)} onClick={() => onAdicionarVenda(v, "primestep")}>Está aqui</button>
                  <button style={btn(false)} onClick={() => onAdicionarVenda(v, "terceirizado")}>No terceirizado</button>
                  <button style={btn(false)} onClick={() => onAdicionarVenda(v, "entregue")}>Já entregue</button>
                </div>
              </div>
            ))}
          </div>
        </LedgerCard>
      )}

      <Secao titulo="Aqui na PrimeStep" lista={[...antigos, ...aqui]} cor={ETAPAS_PEDIDO[0].color} vazio="Nenhum par aqui agora." />
      <Secao titulo="No terceirizado" lista={fora} cor={ETAPAS_PEDIDO[1].color} vazio="Nenhum par no terceirizado." />

      <LedgerCard style={{ padding: "14px 16px" }}>
        <button onClick={() => setVerEntregues((x) => !x)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: ETAPAS_PEDIDO[2].color }} />
          <span style={rotulo}>Entregues ({entregues.length})</span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", textDecoration: "underline" }}>{verEntregues ? "esconder" : "ver"}</span>
        </button>
        {verEntregues && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, marginTop: 10 }}>
            {entregues.slice(0, 30).map((p) => <Cartao key={p.id} p={p} cor={ETAPAS_PEDIDO[2].color} />)}
          </div>
        )}
      </LedgerCard>
    </div>
  );
}

// ---------- Conta do entregador (card) ----------
function ContaEntregadorCard({
  contas, ok, onPagar, onDesfazer, onAbrirVenda, onAbrirDespesa,
  titulo = "Conta do entregador", prep = "ao", prefixoVenda = "Entrega",
  vazio = 'Nenhuma entrega na conta ainda. Ao lançar uma venda com custo de entrega, diga quem entregou: o valor entra aqui como "a pagar".',
  semTabela = "A tabela de pagamentos do entregador ainda não existe no banco. Fale com o Claude para criar.",
  rodape = "O custo de cada entrega já entra nas despesas do mês. O pagamento só acerta a conta com o entregador, não conta como despesa de novo.",
}) {
  const [outroValor, setOutroValor] = useState({});
  const [aberto, setAberto] = useState({});
  const rotulo = { fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 };
  const botao = (primario) => ({
    border: primario ? "none" : "1px solid var(--paper-line)", background: primario ? "var(--ink)" : "#FFFDF8",
    color: primario ? "var(--paper)" : "var(--ink)", borderRadius: 5, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  });
  const fmtDia = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

  return (
    <LedgerCard style={{ padding: "14px 16px", marginBottom: 10, fontFamily: "Inter, sans-serif" }}>
      <div style={{ ...rotulo, marginBottom: 8 }}>{titulo}</div>
      {!ok ? (
        <div style={{ fontSize: 13, color: "var(--rust)" }}>{semTabela}</div>
      ) : contas.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          {vazio}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {contas.map((c) => {
            const k = chaveEntregador(c.nome);
            const valorOutro = parseValor(outroValor[k]);
            return (
              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--ink)" }}>
                    {c.falta > 0.009 ? `Falta pagar ${prep} ` : c.falta < -0.009 ? `Pago a mais ${prep} ` : `Tudo pago ${prep} `}
                    <strong>{c.nome}</strong>
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: c.falta > 0.009 ? "var(--rust)" : "var(--green)" }}>
                    {formatBRL(Math.abs(c.falta))}
                  </span>
                </div>
                {c.falta < -0.009 && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Esse valor vai abater das próximas entregas dele.</span>
                )}
                {c.pendentes.length > 0 && (
                  <div style={{ border: "1px solid var(--paper-line)", borderRadius: 5 }}>
                    {c.pendentes.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => (e.venda ? onAbrirVenda(e.venda) : onAbrirDespesa(e.despesa))}
                        title="Abrir para conferir ou corrigir"
                        style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8, padding: "7px 10px", border: "none", borderBottom: "1px solid var(--paper-line)", background: "none", cursor: "pointer", fontSize: 12.5, color: "var(--ink)", textAlign: "left", fontFamily: "Inter, sans-serif" }}
                      >
                        <span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)", marginRight: 8 }}>{fmtDia(e.data)}</span>
                          {e.venda ? `${prefixoVenda} · ${e.descricao}` : e.descricao}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {formatBRL(e.falta)}
                          {e.falta < e.valor - 0.009 && <span style={{ color: "var(--muted)", fontWeight: 400 }}> de {formatBRL(e.valor)}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {c.falta > 0.009 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      style={botao(true)}
                      onClick={() => {
                        if (window.confirm(`Registrar pagamento de ${formatBRL(c.falta)} ${prep} ${c.nome} hoje?`)) onPagar(c.nome, c.falta);
                      }}
                    >
                      Paguei tudo ({formatBRL(c.falta)})
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Outro valor"
                      value={outroValor[k] || ""}
                      onChange={(ev) => setOutroValor((o) => ({ ...o, [k]: ev.target.value }))}
                      style={{ ...inputStyle, width: 110, fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    <button
                      style={botao(false)}
                      disabled={valorOutro <= 0}
                      onClick={() => {
                        if (valorOutro > 0 && window.confirm(`Registrar pagamento de ${formatBRL(valorOutro)} ${prep} ${c.nome} hoje?`)) {
                          onPagar(c.nome, valorOutro);
                          setOutroValor((o) => ({ ...o, [k]: "" }));
                        }
                      }}
                    >
                      Paguei este valor
                    </button>
                  </div>
                )}
                {c.pagamentos.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    <button onClick={() => setAberto((a) => ({ ...a, [k]: !a[k] }))} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--muted)", fontSize: 12, textDecoration: "underline", fontFamily: "Inter, sans-serif" }}>
                      {aberto[k] ? "Esconder pagamentos" : `Ver pagamentos (${c.pagamentos.length})`}
                    </button>
                    {aberto[k] && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                        {c.pagamentos.map((p) => (
                          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtDia(p.data)}</span> · pago {formatBRL(p.valor)}</span>
                            <button onClick={() => onDesfazer(p.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--rust)", fontSize: 12, fontFamily: "Inter, sans-serif" }}>desfazer</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45 }}>
            {rodape}
          </div>
        </div>
      )}
    </LedgerCard>
  );
}

// ---------- Tráfego pago do mês ----------
function TrafegoDoMes({ vendas, despesas, mesKey, mesLabel }) {
  const doMes = (lista, k) => lista.filter((x) => x.data?.startsWith(k));
  const [y, m] = mesKey.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const t = analiseTrafego(doMes(vendas, mesKey), doMes(despesas, mesKey));
  const a = analiseTrafego(doMes(vendas, prevKey), doMes(despesas, prevKey));
  const rotulo = { fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 };
  const fmtX = (n) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}x`);

  const kpis = [
    ["Investido", formatBRL(t.investido), "var(--rust)"],
    ["Clientes fechados", String(t.clientes), "var(--ink)"],
    ["Custo por cliente", t.custoPorCliente == null ? "—" : formatBRL(t.custoPorCliente), "var(--ink)"],
    ["Faturou", formatBRL(t.faturado), "var(--green)"],
    ["Retorno por R$ 1", fmtX(t.retorno), t.retorno == null ? "var(--ink)" : t.retorno >= 1 ? "var(--green)" : "var(--rust)"],
    ["Resultado", formatBRL(t.resultado), t.resultado >= 0 ? "var(--green)" : "var(--rust)"],
  ];

  const leitura = [];
  if (t.investido === 0 && t.vendas === 0) {
    leitura.push({ tom: "info", texto: "Nenhum investimento nem venda de tráfego neste mês. Lance o valor dos anúncios em Despesas, na categoria Tráfego pago, e marque a origem Tráfego nas vendas que vierem dos anúncios." });
  } else {
    if (t.investido === 0) leitura.push({ tom: "atencao", texto: `${t.vendas} venda${t.vendas === 1 ? "" : "s"} de tráfego, mas nenhum investimento lançado. Lance o valor dos anúncios em Despesas (categoria Tráfego pago) para calcular o retorno.` });
    if (t.investido > 0 && t.clientes === 0) leitura.push({ tom: "atencao", texto: `${formatBRL(t.investido)} investidos e nenhuma venda com origem Tráfego. Se algum cliente veio do anúncio, marque a origem Tráfego na venda.` });
    if (t.investido > 0 && t.clientes > 0) {
      leitura.push({
        tom: t.resultado >= 0 ? "ok" : "atencao",
        texto: t.resultado >= 0
          ? `O tráfego se pagou: as vendas deram ${formatBRL(t.lucroVendas)} de lucro, ${formatBRL(t.resultado)} a mais que o investido. Cada R$ 1 em anúncio virou ${formatBRL(t.retorno)} em vendas.`
          : `O tráfego ainda não se pagou: as vendas deram ${formatBRL(t.lucroVendas)} de lucro contra ${formatBRL(t.investido)} investidos (faltam ${formatBRL(-t.resultado)}). Lembre que cliente que volta paga o anúncio de novo nos próximos meses.`,
      });
    }
    if (a.custoPorCliente != null && t.custoPorCliente != null) {
      const v = (t.custoPorCliente / a.custoPorCliente - 1) * 100;
      leitura.push({ tom: v <= 0 ? "ok" : "atencao", texto: `Custo por cliente ${v <= 0 ? "caiu" : "subiu"} ${fmtPct(Math.abs(v))} em relação ao mês anterior (${formatBRL(a.custoPorCliente)}).` });
    }
  }
  const cor = { atencao: "var(--rust)", ok: "var(--green)", info: "var(--ink)" };
  const icone = { atencao: "⚠️", ok: "✅", info: "💡" };

  return (
    <LedgerCard style={{ padding: "16px 16px 14px" }}>
      <div style={{ ...rotulo, marginBottom: 12 }}>Tráfego pago — {mesLabel}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: leitura.length ? 14 : 0 }}>
        {kpis.map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>{l}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      {leitura.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {leitura.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontFamily: "Inter, sans-serif", fontSize: 13, lineHeight: 1.5, color: "var(--ink)", paddingLeft: 10, borderLeft: `3px solid ${cor[d.tom]}` }}>
              <span>{icone[d.tom]}</span>
              <span>{d.texto}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.45 }}>
        Resultado = lucro das vendas que vieram do tráfego (já sem custos e entregas) − o que foi investido em anúncios.
      </div>
    </LedgerCard>
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
        {onDelete && (
          <button onClick={onDelete} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rust)", padding: 4 }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function PrimeStepApp() {
  const [vendas, setVendas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [assinaturas, setAssinaturas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [metas, setMetas] = useState({}); // metas salvas no banco, por mês (AAAA-MM)
  const [clientes, setClientes] = useState([]);
  const [clientesOk, setClientesOk] = useState(true); // false = tabela de clientes ainda não existe
  const [pagamentosEntregador, setPagamentosEntregador] = useState([]);
  const [pagamentosEntregadorOk, setPagamentosEntregadorOk] = useState(true);
  const [pagamentosTerceirizado, setPagamentosTerceirizado] = useState([]);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  useEffect(() => {
    supabase.functions.invoke("usuarios", { body: { acao: "eu" } }).then(({ data }) => setEhAdmin(data?.admin === true)).catch(() => {});
  }, []);
  const [pagamentosTerceirizadoOk, setPagamentosTerceirizadoOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null); // {type: 'venda'|'despesa'|'assinatura'|'pedido', initial?}
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  useEffect(() => {
    (async () => {
      const [v, d, a, p, mt, cl, pe] = await Promise.all([loadVendas(), loadDespesas(), loadAssinaturas(), loadPedidos(), loadMetas(), loadClientes(), loadPagamentosEntregador()]);
      const pt = await loadPagamentosTerceirizado();
      setPagamentosTerceirizado(pt || []);
      setPagamentosTerceirizadoOk(pt !== null);
      setPagamentosEntregador(pe || []);
      setPagamentosEntregadorOk(pe !== null);
      setVendas(v);
      setDespesas(d);
      setAssinaturas(a);
      setPedidos(p);
      setMetas(mt);
      setClientes(cl || []);
      setClientesOk(cl !== null);
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
  const persistClientes = useCallback((list, changed) => {
    setClientes(list);
    if (changed?.type === "upsert") upsertCliente(changed.item);
    if (changed?.type === "delete") deleteClienteRow(changed.id);
  }, []);
  const persistPedidos = useCallback((list, changed) => {
    setPedidos(list);
    if (changed?.type === "upsert") upsertPedido(changed.item);
    if (changed?.type === "delete") deletePedidoRow(changed.id);
  }, []);

  const [importMsg, setImportMsg] = useState("");

  function handleExport() {
    const payload = { app: "primestep-controle-financeiro", exportadoEm: new Date().toISOString(), vendas, despesas, assinaturas, pedidos, metas, clientes };
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
        // Backups antigos não têm pares em processo nem metas: nesse caso, eles ficam como estão.
        const pd = Array.isArray(parsed.pedidos) ? parsed.pedidos : null;
        const mt = parsed.metas && typeof parsed.metas === "object" && !Array.isArray(parsed.metas) ? parsed.metas : null;
        const cl = Array.isArray(parsed.clientes) ? parsed.clientes : null;
        if (!v || !d) throw new Error("formato inválido");
        const ok = window.confirm(
          `Este backup tem ${v.length} venda(s), ${d.length} despesa(s), ${a.length} assinatura(s)${pd ? ` e ${pd.length} par(es) em processo` : ""}.\nIsso vai SUBSTITUIR os dados atuais (${vendas.length} venda(s), ${despesas.length} despesa(s), ${assinaturas.length} assinatura(s)${pd ? `, ${pedidos.length} par(es) em processo` : ""}). Continuar?`
        );
        if (!ok) return;
        // Apaga tudo que existe hoje e grava o backup inteiro no banco.
        await Promise.all(vendas.map((old) => deleteVendaRow(old.id)));
        await Promise.all(despesas.map((old) => deleteDespesaRow(old.id)));
        await Promise.all(assinaturas.map((old) => deleteAssinaturaRow(old.id)));
        await Promise.all(v.map((item) => upsertVenda(item)));
        await Promise.all(d.map((item) => upsertDespesa(item)));
        await Promise.all(a.map((item) => upsertAssinatura(item)));
        if (pd) {
          await Promise.all(pedidos.map((old) => deletePedidoRow(old.id)));
          await Promise.all(pd.map((item) => upsertPedido(item)));
          setPedidos(pd);
        }
        if (mt) {
          await Promise.all(Object.entries(mt).map(([mes, m]) => upsertMeta(mes, m)));
          setMetas(mt);
        }
        if (cl && clientesOk) {
          await Promise.all(clientes.map((old) => deleteClienteRow(old.id)));
          await Promise.all(cl.map((item) => upsertCliente(item)));
          setClientes(cl.slice().sort(porNome));
        }
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

  function handleSaveEntry(entrada) {
    let entry = entrada;
    if (modal.type === "venda") {
      // Liga a venda à ficha do cliente; se for um cliente novo, cria a ficha na hora.
      const { dadosCliente, ...venda } = entrada;
      if (clientesOk && !venda.assinaturaId) {
        const dados = dadosCliente
          ? { ...dadosCliente, instagram: (dadosCliente.instagram || "").trim().replace(/^@/, "") }
          : null;
        const existente =
          clientes.find((c) => c.id === venda.clienteId) ||
          clientes.find((c) => normalizarNome(c.nome) === normalizarNome(venda.cliente));
        if (existente) {
          venda.clienteId = existente.id;
          const atualizado = { ...existente, ...(dados || {}), origem: existente.origem || venda.origem || "" };
          const mudou = Object.keys(atualizado).some((k) => (atualizado[k] || "") !== (existente[k] || ""));
          if (mudou) {
            persistClientes(clientes.map((c) => (c.id === existente.id ? atualizado : c)), { type: "upsert", item: atualizado });
          }
        } else {
          const novo = {
            id: uid(), nome: venda.cliente, telefone: "", instagram: "", bairro: "", endereco: "",
            aniversario: "", observacoes: "", ...(dados || {}), origem: venda.origem || "", criadoEm: venda.data,
          };
          persistClientes([...clientes, novo].sort(porNome), { type: "upsert", item: novo });
          venda.clienteId = novo.id;
        }
      }
      const { ondeEsta, ...vendaLimpa } = venda;
      entry = vendaLimpa;
      const exists = vendas.some((v) => v.id === entry.id);
      persistVendas(exists ? vendas.map((v) => (v.id === entry.id ? entry : v)) : [entry, ...vendas], { type: "upsert", item: entry });
      // Venda nova com pares: entra no controle do Operacional, no lugar onde o tênis está.
      if (!exists && ondeEsta && !entry.assinaturaId && paresDaVenda(entry) > 0) {
        const novo = pedidoDaVenda(entry, ondeEsta);
        persistPedidos([novo, ...pedidos], { type: "upsert", item: novo });
      }
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
    // Pedidos ligados à venda saem junto do controle de pares.
    const ligados = pedidos.filter((p) => p.vendaId === id);
    if (ligados.length) {
      let resto = pedidos;
      ligados.forEach((p) => {
        resto = resto.filter((x) => x.id !== p.id);
        persistPedidos(resto, { type: "delete", id: p.id });
      });
    }
  }
  function adicionarVendaAoControle(v, etapa) {
    const novo = pedidoDaVenda(v, etapa);
    persistPedidos([novo, ...pedidos], { type: "upsert", item: novo });
  }
  async function registrarPagamentoEntregador(nome, valor) {
    const p = { id: uid(), data: todayStr(), entregador: nome, valor: Math.round(valor * 100) / 100 };
    setPagamentosEntregador((prev) => [p, ...prev]);
    const ok = await insertPagamentoEntregador(p);
    if (!ok) setPagamentosEntregador((prev) => prev.filter((x) => x.id !== p.id));
  }
  async function registrarPagamentoTerceirizado(nome, valor) {
    const p = { id: uid(), data: todayStr(), terceirizado: nome, valor: Math.round(valor * 100) / 100 };
    setPagamentosTerceirizado((prev) => [p, ...prev]);
    const ok = await insertPagamentoTerceirizado(p);
    if (!ok) setPagamentosTerceirizado((prev) => prev.filter((x) => x.id !== p.id));
  }
  function desfazerPagamentoTerceirizado(id) {
    if (!window.confirm("Desfazer este pagamento? O valor volta para o \"falta pagar\".")) return;
    setPagamentosTerceirizado((prev) => prev.filter((x) => x.id !== id));
    deletePagamentoTerceirizadoRow(id);
  }
  function desfazerPagamentoEntregador(id) {
    if (!window.confirm("Desfazer este pagamento? O valor volta para o \"falta pagar\".")) return;
    setPagamentosEntregador((prev) => prev.filter((x) => x.id !== id));
    deletePagamentoEntregadorRow(id);
  }
  function deleteDespesa(id) {
    persistDespesas(despesas.filter((d) => d.id !== id), { type: "delete", id });
  }
  function deleteAssinatura(id) {
    persistAssinaturas(assinaturas.filter((a) => a.id !== id), { type: "delete", id });
  }
  function salvarCliente(c) {
    const anterior = clientes.find((x) => x.id === c.id);
    const exists = !!anterior;
    persistClientes((exists ? clientes.map((x) => (x.id === c.id ? c : x)) : [...clientes, c]).sort(porNome), { type: "upsert", item: c });
    // Se o nome mudou, leva junto as vendas antigas desse cliente (que estavam ligadas só pelo nome).
    if (anterior && normalizarNome(anterior.nome) !== normalizarNome(c.nome)) {
      const nomeAntigo = normalizarNome(anterior.nome);
      const atualizadas = [];
      const novaLista = vendas.map((v) => {
        if (v.clienteId === c.id || (!v.clienteId && normalizarNome(v.cliente) === nomeAntigo)) {
          const nv = { ...v, clienteId: c.id, cliente: c.nome };
          atualizadas.push(nv);
          return nv;
        }
        return v;
      });
      setVendas(novaLista);
      atualizadas.forEach((v) => upsertVenda(v));
    }
    setModal(null);
  }
  function deleteCliente(id) {
    persistClientes(clientes.filter((c) => c.id !== id), { type: "delete", id });
  }
  // Cria uma ficha para cada nome das vendas antigas que ainda não tem cadastro.
  async function importarClientesDasVendas() {
    const conhecidos = new Set(clientes.map((c) => normalizarNome(c.nome)));
    const novos = {};
    vendas
      .slice()
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .forEach((v) => {
        if (v.assinaturaId) return;
        const n = normalizarNome(v.cliente);
        if (!n || conhecidos.has(n)) return;
        if (!novos[n]) {
          novos[n] = {
            id: uid(), nome: (v.cliente || "").trim().replace(/\s+/g, " "), telefone: "", instagram: "", bairro: "",
            endereco: "", aniversario: "", origem: v.origem || "", observacoes: "", criadoEm: v.data || todayStr(),
          };
        } else if (v.origem) {
          novos[n].origem = v.origem; // fica com a origem da venda mais recente
        }
      });
    const lista = Object.values(novos);
    if (!lista.length) return;
    setClientes([...clientes, ...lista].sort(porNome));
    await Promise.all(lista.map((c) => upsertCliente(c)));
  }
  function deletePedido(id) {
    persistPedidos(pedidos.filter((p) => p.id !== id), { type: "delete", id });
  }
  function moverEtapaPedido(pedido, novaEtapaId) {
    const atualizado = {
      ...pedido, etapa: novaEtapaId,
      dataEntrega: novaEtapaId === "entregue" ? todayStr() : null,
      dataTerceirizado: novaEtapaId === "terceirizado" ? pedido.dataTerceirizado || todayStr() : novaEtapaId === "primestep" ? null : pedido.dataTerceirizado,
    };
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
      origem: null,
      pares: 0, // a cobrança da mensalidade não é um par feito
    };
    persistVendas([entry, ...vendas], { type: "upsert", item: entry });
  }

  const vendasMes = useMemo(() => vendas.filter((v) => v.data?.startsWith(monthFilter)), [vendas, monthFilter]);
  const despesasMes = useMemo(() => despesas.filter((d) => d.data?.startsWith(monthFilter)), [despesas, monthFilter]);

  const totalReceitas = vendasMes.reduce((s, v) => s + Number(v.valor || 0), 0);
  const custosVendasMes = custosDasVendas(vendasMes).total;
  // Despesas do mês = despesas lançadas na aba Despesas + custos lançados nas vendas.
  const totalDespesas = despesasMes.reduce((s, d) => s + Number(d.valor || 0), 0) + custosVendasMes;
  // Saldo = o que entrou de fato (já com descontos) − despesas e custos das vendas.
  const saldo = vendasMes.reduce((s, v) => s + valorRecebido(v), 0) - totalDespesas;
  const pendentes = somaFalta(vendasMes);
  const paresMes = somaPares(vendasMes);
  const lucroVendasMes = somaLucro(vendasMes);

  const alvoMes = metas[monthFilter] || METAS_PADRAO[monthFilter] || null;
  const analiseMeta = useMemo(
    () => (alvoMes ? analisarMeta(vendas, monthFilter, alvoMes, new Date()) : null),
    [vendas, monthFilter, alvoMes]
  );
  function salvarMeta(m) {
    setMetas((prev) => ({ ...prev, [monthFilter]: m }));
    upsertMeta(monthFilter, m);
    setModal(null);
  }

  const chartData = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const receita = vendas.filter((v) => v.data?.startsWith(key)).reduce((s, v) => s + Number(v.valor || 0), 0);
      const despesa =
        despesas.filter((v) => v.data?.startsWith(key)).reduce((s, v) => s + Number(v.valor || 0), 0) +
        custosDasVendas(vendas.filter((v) => v.data?.startsWith(key))).total;
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
  const [despesaScope, setDespesaScope] = useState("mes"); // 'mes' | 'todos'
  const [origemScope, setOrigemScope] = useState("mes"); // 'mes' | 'todos'
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
        const nome = nomeServicoPadrao(it.servico);
        totals[nome] = (totals[nome] || 0) + Number(it.valor || 0);
      });
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [vendas, vendasMes, pieScope]);

  // De onde vieram os clientes: vendas, pares e receita por origem.
  // As cobranças de mensalidade de assinatura ficam de fora (não são cliente chegando).
  const origemData = useMemo(() => {
    const source = (origemScope === "mes" ? vendasMes : vendas).filter((v) => !v.assinaturaId);
    const mapa = {};
    source.forEach((v) => {
      const nome = v.origem || "Não informado";
      if (!mapa[nome]) mapa[nome] = { name: nome, vendas: 0, pares: 0, receita: 0 };
      mapa[nome].vendas += 1;
      mapa[nome].pares += paresDaVenda(v);
      mapa[nome].receita += Number(v.valor || 0);
    });
    return Object.values(mapa).sort((a, b) => b.vendas - a.vendas || b.receita - a.receita);
  }, [vendas, vendasMes, origemScope]);
  const totalVendasOrigem = origemData.reduce((s, o) => s + o.vendas, 0);
  const maxVendasOrigem = Math.max(1, ...origemData.map((o) => o.vendas));
  const melhorOrigem = origemData.find((o) => o.name !== "Não informado") || null;

  // Despesas agrupadas por categoria, pra ver no que mais se gastou.
  const despesaPieData = useMemo(() => {
    const source = despesaScope === "mes" ? despesasMes : despesas;
    const totals = {};
    source.forEach((d) => {
      const cat = d.categoria || "Outros";
      totals[cat] = (totals[cat] || 0) + Number(d.valor || 0);
    });
    const cv = custosDasVendas(despesaScope === "mes" ? vendasMes : vendas);
    if (cv.terceirizacao) totals["Terceirização e produtos (vendas)"] = (totals["Terceirização e produtos (vendas)"] || 0) + cv.terceirizacao;
    // Entrega lançada na venda soma junto com as despesas da categoria Entregas.
    if (cv.entregas) totals["Entregas"] = (totals["Entregas"] || 0) + cv.entregas;
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [despesas, despesasMes, despesaScope, vendas, vendasMes]);
  const maiorCategoriaGasto = despesaPieData.length ? despesaPieData[0] : null;
  const totalDespesaPie = despesaPieData.reduce((s, x) => s + x.value, 0);

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
        const despesa = ds.reduce((s, d) => s + Number(d.valor || 0), 0) + custosDasVendas(vs).total;
        const qtdServicos = vs.reduce((s, v) => s + getItens(v).length, 0);
        return { key, label: monthLabel(key), receita, despesa, saldo: receita - despesa, qtdServicos, qtdVendas: vs.length, qtdPares: somaPares(vs) };
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

  // Recado do dia: sempre sobre o mês de hoje, independente do mês escolhido no filtro.
  const contasEntregador = useMemo(
    () => contaDosEntregadores(vendas, despesas, pagamentosEntregador),
    [vendas, despesas, pagamentosEntregador]
  );
  const contasTerceirizado = useMemo(() => contaDosTerceirizados(vendas, pagamentosTerceirizado), [vendas, pagamentosTerceirizado]);
  const recadoDoDia = useMemo(() => {
    const hoje = new Date();
    const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const alvo = metas[mesHoje] || METAS_PADRAO[mesHoje] || null;
    return montarRecadoDoDia({ vendas, pedidos, clientes, alvo, hoje, melhorDiaSemana, contasEntregador, contasTerceirizado });
  }, [vendas, pedidos, clientes, metas, melhorDiaSemana, contasEntregador, contasTerceirizado]);

  // Grade de calendário do mês selecionado, com o total vendido e os pares de cada dia.
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
      // Lucro real do dia = o que as vendas deixaram (já sem terceirização e entrega) − outras despesas lançadas no dia.
      const lucroVendas = somaLucro(vendasDoDia);
      const gastos = despesas.filter((d) => d.data === iso).reduce((s, d) => s + Number(d.valor || 0), 0);
      const semCusto = vendasDoDia.filter((v) => !v.assinaturaId && v.custo == null && v.custoEntrega == null).length;
      celulas.push({ dia, iso, total, qtd: vendasDoDia.length, pares: somaPares(vendasDoDia), lucroVendas, gastos, lucro: lucroVendas - gastos, semCusto });
    }
    while (celulas.length % 7 !== 0) celulas.push(null);
    const semanas = [];
    for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
    return semanas;
  }, [vendas, despesas, monthFilter]);

  // Resumo de cada semana do mês (semanas de domingo a sábado, como no calendário).
  const resumoSemanas = useMemo(() => {
    const [y, m] = monthFilter.split("-").map(Number);
    const diasNoMes = new Date(y, m, 0).getDate();
    return calendarioSemanas.map((semana, idx) => {
      const dias = semana.filter(Boolean);
      const total = dias.reduce((s, c) => s + c.total, 0);
      return {
        numero: idx + 1,
        inicio: dias.length ? dias[0].dia : null,
        fim: dias.length ? dias[dias.length - 1].dia : null,
        qtdDias: dias.length,
        total,
        qtd: dias.reduce((s, c) => s + c.qtd, 0),
        pares: dias.reduce((s, c) => s + c.pares, 0),
        lucroVendas: dias.reduce((s, c) => s + c.lucroVendas, 0),
        gastos: dias.reduce((s, c) => s + c.gastos, 0),
        lucro: dias.reduce((s, c) => s + c.lucro, 0),
        semCusto: dias.reduce((s, c) => s + c.semCusto, 0),
        // Parte da meta do mês que cabe nesta semana, proporcional aos dias dela.
        metaSemana: alvoMes ? (alvoMes.meta * dias.length) / diasNoMes : null,
      };
    });
  }, [calendarioSemanas, monthFilter, alvoMes]);
  const melhorSemanaMes = resumoSemanas.length ? resumoSemanas.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const [calModo, setCalModo] = useState("lucro"); // 'lucro' | 'faturamento'
  const valorCal = (c) => (calModo === "lucro" ? c.lucro : c.total);
  const maxDiaValor = Math.max(1, ...calendarioSemanas.flat().filter(Boolean).map((c) => Math.abs(valorCal(c))));

  // Histórico completo: todos os meses que já tiveram movimento, do primeiro ao mais recente.
  const historicoCompleto = useMemo(() => {
    const set = new Set();
    [...vendas, ...despesas].forEach((e) => e.data && set.add(e.data.slice(0, 7)));
    const meses = Array.from(set).sort(); // ordem cronológica
    const linhas = meses.map((key) => {
      const receita = vendas.filter((v) => v.data?.startsWith(key)).reduce((s, v) => s + Number(v.valor || 0), 0);
      const despesa =
        despesas.filter((d) => d.data?.startsWith(key)).reduce((s, d) => s + Number(d.valor || 0), 0) +
        custosDasVendas(vendas.filter((v) => v.data?.startsWith(key))).total;
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
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
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
            <button
              onClick={() => setMostrarUsuarios(true)}
              title={ehAdmin ? "Criar usuários e trocar sua senha" : "Trocar sua senha"}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 4, marginLeft: "auto",
                border: "1px solid var(--paper-line)", background: "transparent", color: "var(--muted)",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              {ehAdmin ? "Usuários" : "Minha senha"}
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Sair do sistema"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 4,
                border: "1px solid var(--paper-line)", background: "transparent", color: "var(--muted)",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              Sair
            </button>
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
              <StatCard label="Despesas do mês (com custos das vendas)" value={formatBRL(totalDespesas)} icon={TrendingDown} tone="down" />
              <StatCard label="Lucro real do mês (saldo)" value={formatBRL(saldo)} icon={Wallet} tone={saldo >= 0 ? "up" : "down"} />
              <StatCard label="A receber (pendente)" value={formatBRL(pendentes)} icon={Clock} />
              <StatCard label="Pares feitos no mês" value={String(paresMes)} icon={Check} />
              <StatCard label="Lucro das vendas (antes das outras despesas)" value={formatBRL(lucroVendasMes)} icon={TrendingUp} tone={lucroVendasMes >= 0 ? "up" : "down"} />
              <StatCard label="Custos das vendas" value={formatBRL(custosVendasMes)} icon={TrendingDown} tone="down" />
            </div>

            {/* Meta do mês */}
            {analiseMeta && <MetaResumoTopo analise={analiseMeta} onAbrir={() => setTab("meta")} />}
            <RecadoDoDia itens={recadoDoDia} hoje={new Date()} />

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
                ["operacional", `Operacional (${pedidos.filter((p) => p.etapa !== "entregue").reduce((s, p) => s + paresDoPedido(p), 0)})`],
                ["vendas", `Vendas (${vendasMes.length})`],
                ["clientes", `Clientes (${clientes.length})`],
                ["meta", "Meta"],
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
              {tab !== "analises" && tab !== "historico" && tab !== "calendario" && tab !== "meta" && (
                <button
                  onClick={() => setModal({ type: tab === "despesas" ? "despesa" : tab === "assinaturas" ? "assinatura" : tab === "operacional" ? "pedido" : tab === "clientes" ? "cliente" : "venda" })}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "none",
                    background: "var(--gold)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  <Plus size={15} /> {tab === "assinaturas" ? "Nova assinatura" : tab === "operacional" ? "Novo par" : tab === "clientes" ? "Novo cliente" : `Novo ${tab === "despesas" ? "gasto" : "registro"}`}
                </button>
              )}
            </div>

            {tab === "clientes" && (
              <ClientesTab
                clientes={clientes}
                clientesOk={clientesOk}
                vendas={vendas}
                onAbrir={(c) => setModal({ type: "cliente", initial: c })}
                onExcluir={deleteCliente}
                onImportar={importarClientesDasVendas}
              />
            )}

            {tab === "meta" && (
              <MetaPainel
                analise={analiseMeta}
                alvo={alvoMes}
                mesLabel={monthLabel(monthFilter)}
                onEditar={() => setModal({ type: "meta" })}
              />
            )}

            {tab === "analises" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 4 }}>
                <ResumoDoMes
                  vendas={vendas}
                  despesas={despesas}
                  clientes={clientes}
                  mesKey={monthFilter}
                  mesLabel={monthLabel(monthFilter)}
                  alvo={alvoMes}
                />
                <TrafegoDoMes vendas={vendas} despesas={despesas} mesKey={monthFilter} mesLabel={monthLabel(monthFilter)} />
                {/* De onde vêm os clientes */}
                <LedgerCard style={{ padding: "16px 16px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                      De onde vêm os clientes
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[["mes", monthLabel(monthFilter)], ["todos", "Todo período"]].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setOrigemScope(key)}
                          style={{
                            padding: "5px 10px", borderRadius: 4, border: "1px solid var(--paper-line)",
                            background: origemScope === key ? "var(--ink)" : "transparent",
                            color: origemScope === key ? "var(--paper)" : "var(--muted)",
                            fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {origemData.length === 0 ? (
                    <div style={{ padding: "26px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                      Nenhuma venda registrada {origemScope === "mes" ? "neste mês" : "ainda"}.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                        {origemData.map((o) => {
                          const pct = totalVendasOrigem ? ((o.vendas / totalVendasOrigem) * 100).toFixed(0) : 0;
                          const semInfo = o.name === "Não informado";
                          return (
                            <div key={o.name} style={{ fontFamily: "Inter, sans-serif" }}>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: semInfo ? "var(--muted)" : "var(--ink)" }}>{o.name}</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "var(--muted)" }}>
                                  {o.vendas} venda{o.vendas > 1 ? "s" : ""} ({pct}%) · {labelPares(o.pares)} · <span style={{ color: "var(--ink)", fontWeight: 600 }}>{formatBRL(o.receita)}</span>
                                </span>
                              </div>
                              <div style={{ height: 12, background: "#EFEBE1", borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ width: `${(o.vendas / maxVendasOrigem) * 100}%`, height: "100%", background: semInfo ? "var(--muted)" : "var(--green)", borderRadius: 4 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {melhorOrigem && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--paper-line)", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--green)", fontWeight: 600 }}>
                          🏆 Canal que mais trouxe cliente: {melhorOrigem.name} — {melhorOrigem.vendas} venda{melhorOrigem.vendas > 1 ? "s" : ""}, {formatBRL(melhorOrigem.receita)}
                        </div>
                      )}
                    </>
                  )}
                </LedgerCard>

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

                {/* Pie chart: no que mais se gastou */}
                <LedgerCard style={{ padding: "16px 16px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                      No que mais se gastou (por categoria)
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[["mes", monthLabel(monthFilter)], ["todos", "Todo período"]].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setDespesaScope(key)}
                          style={{
                            padding: "5px 10px", borderRadius: 4, border: "1px solid var(--paper-line)",
                            background: despesaScope === key ? "var(--ink)" : "transparent",
                            color: despesaScope === key ? "var(--paper)" : "var(--muted)",
                            fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {despesaPieData.length === 0 ? (
                    <div style={{ padding: "26px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                      Nenhuma despesa registrada {despesaScope === "mes" ? "neste mês" : "ainda"}.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <ResponsiveContainer width={220} height={220}>
                          <PieChart>
                            <Pie data={despesaPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}>
                              {despesaPieData.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12.5 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 180, padding: "6px 4px" }}>
                          {despesaPieData.map((p, i) => {
                            const pct = totalDespesaPie ? ((p.value / totalDespesaPie) * 100).toFixed(0) : 0;
                            return (
                              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5 }}>
                                <span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                <span style={{ color: "var(--ink)", flex: 1 }}>{p.name}</span>
                                <span style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>{pct}%</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--rust)" }}>{formatBRL(p.value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {maiorCategoriaGasto && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--paper-line)", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--rust)", fontWeight: 600 }}>
                          🔎 Categoria que mais pesa: {maiorCategoriaGasto.name} — {formatBRL(maiorCategoriaGasto.value)}
                          {totalDespesaPie ? ` (${((maiorCategoriaGasto.value / totalDespesaPie) * 100).toFixed(0)}% do total)` : ""}
                        </div>
                      )}
                    </>
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
                              {["Mês", "Vendas", "Pares", "Serviços", "Receita", "Despesa", "Saldo"].map((h) => (
                                <th key={h} style={{ textAlign: h === "Mês" ? "left" : "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {compareData.map((row) => (
                              <tr key={row.key} style={{ borderBottom: "1px solid var(--paper-line)" }}>
                                <td style={{ padding: "7px 8px", fontFamily: "'JetBrains Mono', monospace" }}>{row.label}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right" }}>{row.qtdVendas}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{row.qtdPares}</td>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Calendar size={15} color="var(--ink)" />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                        {calModo === "lucro" ? "Lucro real" : "Vendas"} em {monthLabel(monthFilter)} — {labelPares(paresMes)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[["lucro", "Lucro real"], ["faturamento", "Faturamento"]].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setCalModo(k)}
                          style={{
                            padding: "4px 10px", borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
                            border: "1px solid var(--paper-line)", background: calModo === k ? "var(--ink)" : "transparent", color: calModo === k ? "var(--paper)" : "var(--muted)",
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
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
                          const valorDia = valorCal(cel);
                          const temMovimento = cel.total > 0 || cel.gastos > 0;
                          const intensidade = valorDia !== 0 ? Math.max(0.12, Math.abs(valorDia) / maxDiaValor) : 0;
                          const fundo = !temMovimento || valorDia === 0 ? "#FFFDF8" : valorDia > 0 ? `rgba(75,101,82,${intensidade})` : `rgba(162,70,50,${intensidade * 0.6})`;
                          return (
                            <div
                              key={ci}
                              onClick={() => setSelectedDia(cel.iso)}
                              title={temMovimento ? `${formatDateBR(cel.iso)}: faturou ${formatBRL(cel.total)} · lucro real ${formatBRL(cel.lucro)}${cel.gastos ? ` (já tirando ${formatBRL(cel.gastos)} de despesas do dia)` : ""} · ${cel.qtd} venda${cel.qtd === 1 ? "" : "s"}, ${labelPares(cel.pares)}${cel.semCusto ? ` · ${cel.semCusto} sem custo lançado` : ""} — toque para ver` : `${formatDateBR(cel.iso)} — toque para registrar`}
                              style={{
                                aspectRatio: "1", borderRadius: 5, padding: "4px 3px", cursor: "pointer",
                                background: fundo,
                                border: "1px solid var(--paper-line)",
                                display: "flex", flexDirection: "column", justifyContent: "space-between",
                                transition: "transform 0.1s",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--muted)" }}>{cel.dia}</span>
                                {cel.pares > 0 && (
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: "var(--ink)" }}>{cel.pares}p</span>
                                )}
                              </div>
                              {temMovimento && (
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: valorDia < 0 ? "var(--rust)" : "var(--ink)", lineHeight: 1.1 }}>
                                  {Math.abs(valorDia) >= 1000 ? `${(valorDia / 1000).toFixed(1)}k` : valorDia.toFixed(0)}
                                  {cel.semCusto > 0 && calModo === "lucro" ? "*" : ""}
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
                      🏆 Melhor semana do mês: semana {melhorSemanaMes.numero} — {formatBRL(melhorSemanaMes.total)} faturados, {formatBRL(melhorSemanaMes.lucro)} de lucro real
                    </div>
                  )}
                  {calModo === "lucro" && (
                    <div style={{ marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
                      Lucro real do dia = vendas − terceirização − entrega − outras despesas lançadas no dia. Vermelho = dia com mais gasto que lucro. * = tem venda sem custo lançado, então o lucro pode estar maior do que é.
                    </div>
                  )}
                </LedgerCard>

                {/* Faturamento semana a semana */}
                <LedgerCard style={{ padding: "16px 16px 14px" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                    Faturamento e lucro real por semana — {monthLabel(monthFilter)}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    {resumoSemanas.map((sem, i) => {
                      const maxSemana = Math.max(1, ...resumoSemanas.map((x) => x.total));
                      const totalMesSemanas = resumoSemanas.reduce((s, x) => s + x.total, 0);
                      const anterior = i > 0 ? resumoSemanas[i - 1] : null;
                      const variacao = anterior && anterior.total > 0 ? (sem.total / anterior.total - 1) * 100 : null;
                      const isMelhor = melhorSemanaMes && sem.numero === melhorSemanaMes.numero && sem.total > 0;
                      const pctMeta = sem.metaSemana ? (sem.total / sem.metaSemana) * 100 : null;
                      const mm = monthFilter.slice(5, 7);
                      const ehMesAtual = monthFilter === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                      const futura = ehMesAtual && sem.inicio > now.getDate();
                      const emAndamento = ehMesAtual && !futura && sem.fim >= now.getDate();
                      return (
                        <div key={sem.numero} style={{ fontFamily: "Inter, sans-serif", paddingBottom: 10, borderBottom: i < resumoSemanas.length - 1 ? "1px solid var(--paper-line)" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                              Semana {sem.numero} {isMelhor ? "🏆" : ""}
                              {emAndamento && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", marginLeft: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>em andamento</span>}
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 500, color: "var(--muted)", marginLeft: 8 }}>
                                {String(sem.inicio).padStart(2, "0")}/{mm} a {String(sem.fim).padStart(2, "0")}/{mm}
                              </span>
                            </span>
                            <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                                faturou {formatBRL(sem.total)}
                              </span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: sem.lucro > 0 ? "var(--green)" : sem.lucro < 0 ? "var(--rust)" : "var(--muted)" }}>
                                lucro {formatBRL(sem.lucro)}
                              </span>
                            </span>
                          </div>
                          {/* Barra: o tamanho é o faturamento; a parte verde é o que sobrou de lucro real. */}
                          <div style={{ height: 10, background: "#EFEBE1", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{ width: `${(sem.total / maxSemana) * 100}%`, height: "100%", background: "var(--ink)", opacity: 0.25, borderRadius: 4, position: "relative" }} />
                            <div style={{ width: `${(Math.max(0, sem.lucro) / maxSemana) * 100}%`, height: "100%", background: "var(--green)", borderRadius: 4, marginTop: -10 }} />
                          </div>
                          {futura ? (
                            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                              Ainda não começou{sem.metaSemana ? ` · meta da semana: ${formatBRL(sem.metaSemana)}` : ""}
                            </div>
                          ) : (
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "var(--muted)" }}>
                            <span>{sem.qtd} venda{sem.qtd === 1 ? "" : "s"} · {labelPares(sem.pares)}</span>
                            {sem.total > 0 && (
                              <span>
                                margem {fmtPct((sem.lucro / sem.total) * 100)} · custos das vendas {formatBRL(sem.total - sem.lucroVendas)}{sem.gastos ? ` · outras despesas ${formatBRL(sem.gastos)}` : ""}
                              </span>
                            )}
                            {sem.semCusto > 0 && (
                              <span style={{ color: "var(--rust)", fontWeight: 600 }}>
                                {sem.semCusto} venda{sem.semCusto === 1 ? "" : "s"} sem custo lançado
                              </span>
                            )}
                            <span>{totalMesSemanas ? fmtPct((sem.total / totalMesSemanas) * 100) : "0%"} do mês</span>
                            {variacao !== null && (
                              <span style={{ color: variacao >= 0 ? "var(--green)" : "var(--rust)", fontWeight: 600 }}>
                                {fmtVar(variacao)} vs semana {sem.numero - 1}
                              </span>
                            )}
                            {pctMeta !== null && (
                              <span style={{ color: pctMeta >= 100 ? "var(--green)" : "var(--ink)", fontWeight: 600 }}>
                                {fmtPct(pctMeta)} da meta da semana ({formatBRL(sem.metaSemana)})
                              </span>
                            )}
                          </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
                    Lucro real = faturamento − descontos − terceirização − entregas − outras despesas lançadas na semana. A barra cinza é o faturamento; a parte verde é o que sobrou.
                    {alvoMes ? " Meta da semana = meta do mês dividida pelos dias, proporcional aos dias de cada semana." : ""}
                  </div>
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
              <OperacionalTab
                pedidos={pedidos}
                vendas={vendas}
                onMover={moverEtapaPedido}
                onEditar={(p) => setModal({ type: "pedido", initial: p })}
                onExcluir={deletePedido}
                onAdicionarVenda={adicionarVendaAoControle}
              />
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
            {tab !== "analises" && tab !== "historico" && tab !== "assinaturas" && tab !== "operacional" && tab !== "calendario" && tab !== "meta" && tab !== "clientes" && (
            <>
            {tab === "despesas" && (
              <ContaEntregadorCard
                contas={contasEntregador}
                ok={pagamentosEntregadorOk}
                onPagar={registrarPagamentoEntregador}
                onDesfazer={desfazerPagamentoEntregador}
                onAbrirVenda={(v) => setModal({ type: "venda", initial: v })}
                onAbrirDespesa={(d) => setModal({ type: "despesa", initial: d })}
              />
            )}
            {tab === "despesas" && (
              <ContaEntregadorCard
                titulo="Conta das sapatarias (terceirizado)"
                prep="à"
                prefixoVenda="Serviço"
                vazio='Nenhum serviço terceirizado na conta ainda. Ao lançar uma venda com custo, escolha em "Quem fez o serviço" a sapataria: o valor entra aqui como "a pagar".'
                semTabela="A tabela de pagamentos das sapatarias ainda não existe no banco. Fale com o Claude para criar."
                rodape="O custo de cada serviço já entra nas despesas do mês (terceirização). O pagamento só acerta a conta com a sapataria, não conta como despesa de novo."
                contas={contasTerceirizado}
                ok={pagamentosTerceirizadoOk}
                onPagar={registrarPagamentoTerceirizado}
                onDesfazer={desfazerPagamentoTerceirizado}
                onAbrirVenda={(v) => setModal({ type: "venda", initial: v })}
                onAbrirDespesa={() => {}}
              />
            )}
            {tab === "despesas" && (() => {
              const cv = custosDasVendas(vendasMes);
              const entregasAqui = despesasMes.filter((d) => d.categoria === "Entregas").reduce((s, d) => s + Number(d.valor || 0), 0);
              return (
                <LedgerCard style={{ padding: "12px 14px", marginBottom: 10, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5 }}>
                  <strong>Entregas em {monthLabel(monthFilter)}: {formatBRL(cv.entregas + entregasAqui)}</strong>
                  <span style={{ color: "var(--muted)" }}> ({formatBRL(cv.entregas)} lançadas nas vendas · {formatBRL(entregasAqui)} lançadas aqui)</span>
                  <div style={{ marginTop: 4 }}>
                    <strong>Terceirização e produtos das vendas: {formatBRL(cv.terceirizacao)}</strong>
                  </div>
                  <div style={{ color: "var(--muted)", marginTop: 2 }}>
                    A entrega lançada na venda aparece sozinha na lista abaixo, na categoria Entregas, e já entra no total do mês. Não lance de novo aqui, senão conta duas vezes. Use a categoria Entregas aqui só para entrega que não é de uma venda (ex.: diária do entregador, gasolina).
                  </div>
                </LedgerCard>
              );
            })()}
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
                          <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{labelPares(paresDaVenda(v))}</span>
                            {v.origem ? ` · ${v.origem}` : ""}
                            {" · "}
                            <span style={{ color: lucroDaVenda(v) >= 0 ? "var(--green)" : "var(--rust)", fontWeight: 600 }}>
                              lucro {formatBRL(lucroDaVenda(v))}
                            </span>
                            {v.custo == null && v.custoEntrega == null && !v.assinaturaId ? " (sem custo lançado)" : ""}
                          </span>
                        </span>
                        <span
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                            color: v.status === "pago" ? "var(--green)" : "var(--rust)",
                          }}
                        >
                          {v.status === "pago" ? <Check size={12} /> : <Clock size={12} />}
                          {labelStatus(v)}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--green)", textAlign: "right" }}>
                          {formatBRL(v.valor)}
                        </span>
                      </LedgerRow>
                    ))
                )
              ) : despesasMes.length === 0 && !vendasMes.some((v) => Number(v.custoEntrega || 0) > 0) ? (
                <div style={{ padding: "26px 6px", textAlign: "center", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                  Nenhuma despesa registrada neste mês.
                </div>
              ) : (
                [
                  ...despesasMes,
                  // Entregas lançadas nas vendas entram na lista como despesa da categoria Entregas.
                  ...vendasMes
                    .filter((v) => Number(v.custoEntrega || 0) > 0)
                    .map((v) => ({
                      id: `entrega-${v.id}`, data: v.data, descricao: `Entrega · ${v.cliente}`, categoria: "Entregas",
                      valor: Number(v.custoEntrega), vendaOrigem: v,
                    })),
                ]
                  .sort((a, b) => (a.data < b.data ? 1 : -1))
                  .map((d) => (
                    <LedgerRow
                      key={d.id}
                      onEdit={() => (d.vendaOrigem ? setModal({ type: "venda", initial: d.vendaOrigem }) : setModal({ type: "despesa", initial: d }))}
                      onDelete={d.vendaOrigem ? null : () => deleteDespesa(d.id)}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--muted)" }}>{formatDateBR(d.data)}</span>
                      <span style={{ color: "var(--ink)" }}>
                        {d.descricao}
                        {d.vendaOrigem && <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>lançada na venda · para mudar, edite a venda</span>}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>{d.categoria}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--rust)", textAlign: "right" }}>
                        {formatBRL(d.valor)}
                      </span>
                    </LedgerRow>
                  ))
              )}
            </LedgerCard>
            </>
            )}
          </>
        )}
      </div>

      {modal && modal.type === "meta" && (
        <MetaModal
          mesLabel={monthLabel(monthFilter)}
          initial={alvoMes}
          onSave={salvarMeta}
          onClose={() => setModal(null)}
        />
      )}
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
      {mostrarUsuarios && <UsuariosModal admin={ehAdmin} onClose={() => setMostrarUsuarios(false)} />}
      {modal && modal.type === "cliente" && (
        <ClienteModal
          initial={modal.initial}
          vendas={vendas}
          onSave={salvarCliente}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal.type !== "assinatura" && modal.type !== "pedido" && modal.type !== "meta" && modal.type !== "cliente" && (
        <EntryModal
          type={modal.type}
          initial={modal.initial}
          clientes={clientes}
          podeCadastrarCliente={clientesOk}
          entregadores={contasEntregador.map((c) => c.nome)}
          onSave={handleSaveEntry}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ---------- Login ----------
const ESTILO_LOGIN = `
  ${FONT_IMPORT}
  :root { --bg: #E7E3DB; --paper: #FBFAF7; --paper-line: #D6D1C4; --ink: #17140F; --rust: #A24632; --muted: #8A8375; }
  * { box-sizing: border-box; }
  body { background: var(--bg); }
  input:focus-visible, button:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
`;

function TelaCarregando() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "var(--muted)" }}>
      <style>{ESTILO_LOGIN}</style>
      Carregando…
    </div>
  );
}

// Login por nome: "andressa" vira o e-mail interno andressa@primestep.app. E-mail completo também funciona.
const DOMINIO_LOGIN = "primestep.app";
function emailDoLogin(usuario) {
  const u = String(usuario || "").trim();
  if (u.includes("@")) return u;
  return `${u.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, ".")}@${DOMINIO_LOGIN}`;
}

// ---------- Usuários: criar acesso por nome + senha e trocar a própria senha ----------
function UsuariosModal({ admin, onClose }) {
  const [usuarios, setUsuarios] = useState(null);
  const [novoAdmin, setNovoAdmin] = useState(false);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [minha, setMinha] = useState("");
  const [minha2, setMinha2] = useState("");
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function chamar(corpo) {
    const { data, error } = await supabase.functions.invoke("usuarios", { body: corpo });
    if (error) {
      let texto = "Não foi possível falar com o servidor. Confira a internet.";
      try { const j = await error.context.json(); if (j?.erro) texto = j.erro; } catch (e) { /* sem detalhes */ }
      throw new Error(texto);
    }
    return data;
  }
  async function carregar() {
    try { setUsuarios((await chamar({ acao: "listar" })).usuarios || []); } catch (e) { setMsg({ tom: "erro", texto: e.message }); }
  }
  useEffect(() => { if (admin) carregar(); }, [admin]);

  async function criar(e) {
    e.preventDefault();
    setMsg(null);
    if (senha !== senha2) return setMsg({ tom: "erro", texto: "As duas senhas não são iguais." });
    setOcupado(true);
    try {
      const r = await chamar({ acao: "criar", nome, senha, admin: novoAdmin });
      setMsg({ tom: "ok", texto: `Usuário "${r.nome}" criado. Para entrar, é só digitar ${r.nome} e a senha.` });
      setNome(""); setSenha(""); setSenha2(""); setNovoAdmin(false);
      carregar();
    } catch (err) {
      setMsg({ tom: "erro", texto: err.message });
    }
    setOcupado(false);
  }
  async function trocarSenha(e) {
    e.preventDefault();
    setMsg(null);
    if (minha.length < 6) return setMsg({ tom: "erro", texto: "A senha precisa ter pelo menos 6 caracteres." });
    if (minha !== minha2) return setMsg({ tom: "erro", texto: "As duas senhas não são iguais." });
    setOcupado(true);
    const { error } = await supabase.auth.updateUser({ password: minha });
    setOcupado(false);
    if (error) return setMsg({ tom: "erro", texto: /different|same/i.test(error.message || "") ? "A senha nova precisa ser diferente da atual." : "Não foi possível trocar a senha." });
    setMinha(""); setMinha2("");
    setMsg({ tom: "ok", texto: "Senha trocada. Use a nova na próxima vez que entrar." });
  }

  const rotulo = { fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 };
  const botao = { padding: "10px 14px", borderRadius: 5, border: "none", cursor: ocupado ? "default" : "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, opacity: ocupado ? 0.7 : 1 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,20,15,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
        <LedgerCard style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{admin ? "Usuários" : "Minha senha"}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><X size={18} /></button>
          </div>

          {admin && (<>
          <div>
            <div style={{ ...rotulo, marginBottom: 6 }}>Quem tem acesso</div>
            {usuarios === null ? (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--muted)" }}>Carregando…</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {usuarios.map((u) => (
                  <span key={u.nome} style={{ border: "1px solid var(--paper-line)", borderRadius: 4, padding: "3px 9px", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--ink)" }}>
                    {u.nome}{u.admin ? " · administrador" : ""}{u.voce ? " (você)" : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={criar} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--paper-line)", paddingTop: 14 }}>
            <div style={rotulo}>Criar usuário</div>
            <Field label="Nome de usuário">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: andressa" autoCapitalize="none" autoCorrect="off" autoComplete="off" style={inputStyle} />
            </Field>
            <Field label="Senha (mínimo 6 caracteres)">
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" style={inputStyle} />
            </Field>
            <Field label="Repita a senha">
              <input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} autoComplete="new-password" style={inputStyle} />
            </Field>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--ink)" }}>
              <input type="checkbox" checked={novoAdmin} onChange={(e) => setNovoAdmin(e.target.checked)} />
              Administrador (pode criar usuários)
            </label>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>
              Deixe a própria pessoa digitar a senha dela. Depois, ela pode trocar quando quiser em "Minha senha".
            </span>
            <button type="submit" disabled={ocupado} style={botao}>Criar usuário</button>
          </form>
          </>)}

          <form onSubmit={trocarSenha} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--paper-line)", paddingTop: 14 }}>
            <div style={rotulo}>Trocar a minha senha</div>
            <Field label="Senha nova">
              <input type="password" value={minha} onChange={(e) => setMinha(e.target.value)} autoComplete="new-password" style={inputStyle} />
            </Field>
            <Field label="Repita a senha nova">
              <input type="password" value={minha2} onChange={(e) => setMinha2(e.target.value)} autoComplete="new-password" style={inputStyle} />
            </Field>
            <button type="submit" disabled={ocupado} style={botao}>Trocar senha</button>
          </form>

          {msg && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: msg.tom === "ok" ? "var(--green)" : "var(--rust)", fontWeight: 600 }}>{msg.texto}</div>
          )}
        </LedgerCard>
      </div>
    </div>
  );
}

function TelaLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    if (!email.trim() || !senha) {
      setErro("Informe o usuário e a senha.");
      return;
    }
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailDoLogin(email), password: senha });
    setEntrando(false);
    if (error) {
      setErro(/invalid/i.test(error.message || "") ? "Usuário ou senha incorretos." : "Não foi possível entrar. Confira a internet e tente de novo.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{ESTILO_LOGIN}</style>
      <form onSubmit={entrar} style={{ width: "100%", maxWidth: 360, background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            prime<span style={{ fontWeight: 500 }}>step</span>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, letterSpacing: "0.22em", color: "var(--muted)", fontWeight: 600, marginTop: 6 }}>
            CONTROLE FINANCEIRO
          </div>
        </div>
        <Field label="Usuário">
          <input id="login-email" type="text" autoCapitalize="none" autoCorrect="off" placeholder="Seu nome de usuário" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Senha">
          <input id="login-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} style={inputStyle} />
        </Field>
        {erro && <div style={{ color: "var(--rust)", fontSize: 12.5, fontFamily: "Inter, sans-serif" }}>{erro}</div>}
        <button
          type="submit"
          disabled={entrando}
          style={{ padding: "11px 14px", borderRadius: 5, border: "none", cursor: entrando ? "default" : "pointer", background: "var(--ink)", color: "var(--paper)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, opacity: entrando ? 0.7 : 1 }}
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// Decide qual sistema mostrar: o Prime Step normalmente, ou o controle pessoal
// quando o endereço termina em #pessoal (ex.: seusite.vercel.app/#pessoal).
// Os dois só abrem depois do login.
export default function App() {
  const [rota, setRota] = useState(() => window.location.hash);
  const [sessao, setSessao] = useState(undefined); // undefined = ainda verificando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session || null));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s || null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function aoMudarHash() {
      setRota(window.location.hash);
    }
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, []);

  if (sessao === undefined) return <TelaCarregando />;
  if (!sessao) return <TelaLogin />;
  if (rota === "#pessoal") return <ControlePessoal />;
  return <PrimeStepApp />;
}

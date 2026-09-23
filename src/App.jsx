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
    const atualizado = { ...pedido, etapa: novaEtapaId, dataEntrega: novaEtapaId === "entregue" ? todayStr() : null };
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
                ["operacional", `Operacional (${pedidos.filter((p) => p.etapa !== "entregue").length})`],
                ["vendas", `Vendas (${vendasMes.length})`],
                ["despesas", `Despesas (${despesasMes.length})`],
                ["assinaturas", `Assinaturas (${assinaturas.length})`],
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
              {tab !== "analises" && tab !== "historico" && (
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
            {tab !== "analises" && tab !== "historico" && tab !== "assinaturas" && tab !== "operacional" && (
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

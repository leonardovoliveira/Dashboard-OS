import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, TrendingUp, DollarSign, Clock, ChevronLeft, ChevronRight, Info, AlertTriangle, FileDown, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const DashboardCharts = lazy(() => import('@/components/DashboardCharts'))

class DashboardChartsErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.tipo !== this.props.tipo && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="dashboard-analytics-card">
          <CardHeader>
            <CardTitle>{this.props.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[220px] items-center justify-center">
            <p className="text-center text-sm text-muted-foreground">Não foi possível carregar este gráfico agora. Os demais dados do Dashboard continuam disponíveis.</p>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

function ChartLoadingPlaceholder({ tipo }) {
  if (tipo === 'plataforma') {
    return (
      <Card className="dashboard-analytics-card">
        <CardHeader>
          <CardTitle>Faturamento por Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] animate-pulse rounded-md bg-muted" aria-label="Carregando gráfico por plataforma" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {['Faturamento Mensal', 'Evolução do Faturamento Bruto'].map((titulo) => (
        <Card key={titulo} className="dashboard-analytics-card">
          <CardHeader>
            <CardTitle>{titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] animate-pulse rounded-md bg-muted" aria-label={`Carregando ${titulo}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DeferredDashboardCharts({ tipo, faturamentoPorPlataforma, dadosMensais, anoExibicao }) {
  const containerRef = useRef(null)
  const [deveCarregar, setDeveCarregar] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return undefined

    if (!('IntersectionObserver' in window)) {
      setDeveCarregar(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setDeveCarregar(true)
          observer.disconnect()
        }
      },
      { rootMargin: '320px 0px' }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const placeholder = <ChartLoadingPlaceholder tipo={tipo} />

  return (
    <div ref={containerRef}>
      {deveCarregar ? (
        <DashboardChartsErrorBoundary tipo={tipo} titulo={tipo === 'plataforma' ? 'Faturamento por Plataforma' : 'Faturamento Mensal'}>
          <Suspense fallback={placeholder}>
            <DashboardCharts
              tipo={tipo}
              faturamentoPorPlataforma={faturamentoPorPlataforma}
              dadosMensais={dadosMensais}
              anoExibicao={anoExibicao}
            />
          </Suspense>
        </DashboardChartsErrorBoundary>
      ) : placeholder}
    </div>
  )
}

function Dashboard({ atendimentos, onAtualizarAtendimentos }) {
  const [dataExibicao, setDataExibicao] = useState(new Date())
  const [isModalAberto, setIsModalAberto] = useState(false)
  const [isModalAtrasadosAberto, setIsModalAtrasadosAberto] = useState(false)
  const [isModalVencimentosAberto, setIsModalVencimentosAberto] = useState(false)
  const [isModalCalendarioAberto, setIsModalCalendarioAberto] = useState(false)
  const [atendimentosDiaSelecionado, setAtendimentosDiaSelecionado] = useState([])
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [osAtualizandoId, setOsAtualizandoId] = useState(null)
  const [erroAtualizacaoStatus, setErroAtualizacaoStatus] = useState('')

  const calcularHoras = (checkin, checkout) => {
    if (!checkin || !checkout) return 0
    const [hIn, mIn] = checkin.split(':').map(Number)
    const [hOut, mOut] = checkout.split(':').map(Number)
    const totalMinutos = (hOut * 60 + mOut) - (hIn * 60 + mIn)
    return totalMinutos / 60
  }

  const calcularValorBruto = (atendimento) => {
    return (parseFloat(atendimento.valor_chamado) || 0) + (parseFloat(atendimento.ganhos_adicionais) || 0)
  }

  // Saldo líquido a receber: valor bruto menos o adiantamento já recebido.
  const calcularValorLiquido = (atendimento) => {
    const bruto = calcularValorBruto(atendimento)
    const adiantamento = parseFloat(atendimento.adiantamento_recebido) || 0
    return bruto - adiantamento
  }

  // A previsão não compõe horas ou faturamento até que a OS deixe de estar em "Prox Atendimento".
  const osExecutada = (atendimento) => String(atendimento.status || '').trim().toLowerCase() !== 'prox atendimento'

  const formatarData = (data) => data ? new Date(`${data}T03:00:00Z`).toLocaleDateString('pt-BR') : 'Não informada'

  // Uma invoice é derivada automaticamente da combinação plataforma + previsão de pagamento.
  // Registros sem data prevista permanecem isolados, pois não podem compor o mesmo grupo de vencimento.
  const criarInvoices = (listaAtendimentos) => {
    const grupos = listaAtendimentos.reduce((acumulador, atendimento) => {
      const plataforma = atendimento.plataforma || 'Plataforma não informada'
      const data = atendimento.data_prevista_pagamento || ''
      const chave = data ? `${plataforma}__${data}` : `${plataforma}__sem-data__${atendimento.id}`

      if (!acumulador[chave]) {
        acumulador[chave] = {
          id: `invoice-${chave}`,
          plataforma,
          data,
          atendimentos: []
        }
      }
      acumulador[chave].atendimentos.push(atendimento)
      return acumulador
    }, {})

    return Object.values(grupos)
      .map((invoice) => ({
        ...invoice,
        quantidadeOS: invoice.atendimentos.length,
        valor: invoice.atendimentos.reduce((total, atendimento) => total + calcularValorLiquido(atendimento), 0)
      }))
      .sort((a, b) => (a.data || '9999-12-31').localeCompare(b.data || '9999-12-31'))
  }

  const diasComAtendimentos = useMemo(() => {
    const dias = new Set()
    atendimentos.forEach(atendimento => {
      if (atendimento.data_atendimento) {
        dias.add(atendimento.data_atendimento)
      }
    })
    return dias
  }, [atendimentos])

  const dadosMensais = useMemo(() => {
    const anoExibicao = dataExibicao.getFullYear()
    const meses = {}
    for (let i = 1; i <= 12; i++) {
      const mesKey = `${anoExibicao}-${String(i).padStart(2, '0')}`
      meses[mesKey] = {
        mes: new Date(anoExibicao, i - 1).toLocaleString('pt-BR', { month: 'short' }),
        faturamentoBruto: 0,
        despesas: 0,
        faturamentoLiquido: 0
      }
    }
    atendimentos.forEach(atendimento => {
      if (atendimento.data_atendimento && osExecutada(atendimento)) {
        const mesKey = atendimento.data_atendimento.substring(0, 7)
        if (meses[mesKey]) {
          const bruto = calcularValorBruto(atendimento)
          const despesas = parseFloat(atendimento.despesas_os) || 0
          const liquido = calcularValorLiquido(atendimento)
          meses[mesKey].faturamentoBruto += bruto
          meses[mesKey].despesas += despesas
          meses[mesKey].faturamentoLiquido += liquido
        }
      }
    })
    return Object.values(meses)
  }, [atendimentos, dataExibicao])

  const proximoPagamento = useMemo(() => {
    const atendimentosAguardando = atendimentos.filter((atendimento) => atendimento.status === 'Aguardando Pagamento' && atendimento.data_prevista_pagamento)
    if (atendimentosAguardando.length === 0) return null

    const dataMaisProxima = [...new Set(atendimentosAguardando.map((atendimento) => atendimento.data_prevista_pagamento))].sort()[0]
    const invoices = criarInvoices(atendimentosAguardando.filter((atendimento) => atendimento.data_prevista_pagamento === dataMaisProxima))
    const atendimentosDaData = invoices.flatMap((invoice) => invoice.atendimentos)

    return {
      valor: invoices.reduce((total, invoice) => total + invoice.valor, 0),
      data: dataMaisProxima,
      quantidade: invoices.length,
      quantidadeOS: atendimentosDaData.length,
      invoices,
      atendimentos: atendimentosDaData
    }
  }, [atendimentos])

  const pagamentosAtrasados = useMemo(() => {
    const atendimentosAtrasados = atendimentos.filter((atendimento) => atendimento.status === 'Pagamento Atrasado')
    if (atendimentosAtrasados.length === 0) return null

    const invoices = criarInvoices(atendimentosAtrasados)
    return {
      valor: invoices.reduce((total, invoice) => total + invoice.valor, 0),
      quantidade: invoices.length,
      quantidadeOS: atendimentosAtrasados.length,
      invoices,
      atendimentos: atendimentosAtrasados
    }
  }, [atendimentos])

  // Alerta preventivo: somente pagamentos pendentes que vencem hoje ou nos próximos três dias.
  const vencimentosProximos = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const itens = atendimentos
      .filter((atendimento) => atendimento.status === 'Aguardando Pagamento' && atendimento.data_prevista_pagamento)
      .map((atendimento) => {
        const [ano, mes, dia] = atendimento.data_prevista_pagamento.split('-').map(Number)
        const vencimento = new Date(ano, mes - 1, dia)
        vencimento.setHours(0, 0, 0, 0)
        const diasRestantes = Math.round((vencimento - hoje) / 86400000)
        return { ...atendimento, diasRestantes }
      })
      .filter((atendimento) => atendimento.diasRestantes >= 0 && atendimento.diasRestantes <= 3)
      .sort((a, b) => a.diasRestantes - b.diasRestantes)

    if (itens.length === 0) return null

    const invoices = criarInvoices(itens).map((invoice) => ({
      ...invoice,
      diasRestantes: invoice.atendimentos[0].diasRestantes
    }))

    return {
      quantidade: invoices.length,
      quantidadeOS: itens.length,
      valor: invoices.reduce((total, invoice) => total + invoice.valor, 0),
      invoices,
      atendimentos: itens
    }
  }, [atendimentos])

  const relatorioFinanceiro = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const atrasados = atendimentos
      .filter((atendimento) => atendimento.status === 'Pagamento Atrasado')
      .map((atendimento) => {
        if (!atendimento.data_prevista_pagamento) return { ...atendimento, diasAtraso: null }
        const [ano, mes, dia] = atendimento.data_prevista_pagamento.split('-').map(Number)
        const vencimento = new Date(ano, mes - 1, dia)
        vencimento.setHours(0, 0, 0, 0)
        return { ...atendimento, diasAtraso: Math.max(0, Math.round((hoje - vencimento) / 86400000)) }
      })
      .sort((a, b) => (b.diasAtraso ?? -1) - (a.diasAtraso ?? -1))
    const proximos = vencimentosProximos?.atendimentos ?? []
    const totalAtrasado = atrasados.reduce((total, atendimento) => total + calcularValorLiquido(atendimento), 0)
    const totalProximo = proximos.reduce((total, atendimento) => total + calcularValorLiquido(atendimento), 0)

    return {
      atrasados,
      proximos,
      totalAtrasado,
      totalProximo,
      totalGeral: totalAtrasado + totalProximo,
      quantidade: atrasados.length + proximos.length
    }
  }, [atendimentos, vencimentosProximos])

  const atualizarStatusPagamento = async (idsAtendimentos, status, idAtualizacao = idsAtendimentos) => {
    if (!onAtualizarAtendimentos) return false
    const ids = Array.isArray(idsAtendimentos) ? idsAtendimentos : [idsAtendimentos]
    setErroAtualizacaoStatus('')
    setOsAtualizandoId(idAtualizacao)
    try {
      await onAtualizarAtendimentos(atendimentos.map((atendimento) => (
        ids.includes(atendimento.id) ? { ...atendimento, status } : atendimento
      )))
      return true
    } catch {
      setErroAtualizacaoStatus('Não foi possível salvar o novo status. Tente novamente.')
      return false
    } finally {
      setOsAtualizandoId(null)
    }
  }

  const atualizarStatusDaInvoice = (invoice, status) => {
    return atualizarStatusPagamento(invoice.atendimentos.map((atendimento) => atendimento.id), status, invoice.id)
  }

  const confirmarPagamentoAtrasado = async (invoice) => {
    const pagamentoConfirmado = await atualizarStatusDaInvoice(invoice, 'Pago')
    if (pagamentoConfirmado && pagamentosAtrasados?.quantidade === 1) {
      setIsModalAtrasadosAberto(false)
    }
  }

  const registrarPagamentoDaInvoice = async (invoice) => {
    const pagamentoConfirmado = await atualizarStatusDaInvoice(invoice, 'Pago')
    if (pagamentoConfirmado && proximoPagamento?.quantidade === 1) {
      setIsModalAberto(false)
    }
  }

  const exportarRelatorioPDF = () => {
    window.print()
  }

  const estatisticas = useMemo(() => {
    const anoExibicao = dataExibicao.getFullYear()
    const mesExibicao = dataExibicao.getMonth()
    const atendimentosMes = atendimentos.filter(a => {
      if (!a.data_atendimento) return false
      const dataAtendimento = new Date(a.data_atendimento + 'T03:00:00Z')
      return dataAtendimento.getFullYear() === anoExibicao && dataAtendimento.getMonth() === mesExibicao
    })
    const atendimentosExecutadosMes = atendimentosMes.filter(osExecutada)
    const totalBruto = atendimentosExecutadosMes.reduce((acc, a) => acc + calcularValorBruto(a), 0)
    const totalAdiantamentos = atendimentosExecutadosMes.reduce((acc, a) => acc + (parseFloat(a.adiantamento_recebido) || 0), 0)
    const totalLiquido = totalBruto - totalAdiantamentos
    const totalHoras = atendimentosExecutadosMes.reduce((acc, a) => acc + calcularHoras(a.checkin, a.checkout), 0)
    return {
      totalAtendimentos: atendimentosMes.length,
      totalBruto,
      totalAdiantamentos,
      totalLiquido,
      totalHoras
    }
  }, [atendimentos, dataExibicao])

  const faturamentoPorPlataforma = useMemo(() => {
    const plataformas = {}
    const atendimentosMes = atendimentos.filter(a => {
      if (!a.data_atendimento || !osExecutada(a)) return false
      const dataAtendimento = new Date(a.data_atendimento + 'T03:00:00Z')
      return dataAtendimento.getFullYear() === dataExibicao.getFullYear() && dataAtendimento.getMonth() === dataExibicao.getMonth()
    })
    atendimentosMes.forEach(atendimento => {
      if (!plataformas[atendimento.plataforma]) {
        plataformas[atendimento.plataforma] = 0
      }
      plataformas[atendimento.plataforma] += calcularValorBruto(atendimento)
    })
    return Object.entries(plataformas).map(([plataforma, faturamento]) => ({ plataforma, faturamento }))
  }, [atendimentos, dataExibicao])

  const mudarMes = (incremento) => {
    setDataExibicao(prevDate => {
      const novaData = new Date(prevDate)
      novaData.setMonth(novaData.getMonth() + incremento)
      return novaData
    })
  }

  const handleDiaClick = (dataStr) => {
    const atendimentosDoDia = atendimentos.filter(a => a.data_atendimento === dataStr);
    if (atendimentosDoDia.length > 0) {
      setAtendimentosDiaSelecionado(atendimentosDoDia);
      setDataSelecionada(dataStr);
      setIsModalCalendarioAberto(true);
    }
  }

  const renderCalendario = () => {
    const mesAtual = dataExibicao.getMonth()
    const anoAtual = dataExibicao.getFullYear()
    const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay()
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate()
    const dias = []
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    for (let i = 0; i < primeiroDia; i++) {
      dias.push(<div key={`empty-${i}`} className="h-10"></div>)
    }
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      const temAtendimento = diasComAtendimentos.has(dataStr)
      const ehHoje = dia === new Date().getDate() && mesAtual === new Date().getMonth() && anoAtual === new Date().getFullYear()
      dias.push(
        <div
          key={dia}
          onClick={() => handleDiaClick(dataStr)}
          className={`flex h-9 items-center justify-center rounded-md text-sm font-medium transition-all cursor-pointer sm:h-10 sm:rounded-lg ${
            ehHoje
              ? 'bg-primary text-primary-foreground'
              : temAtendimento
              ? 'border-2 border-green-500 hover:bg-green-500/10'
              : 'text-foreground hover:bg-accent'
          }`}
        >
          {dia}
        </div>
      )
    }
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={() => mudarMes(-1)} className="p-2 rounded-md hover:bg-accent"><ChevronLeft className="w-4 h-4" /></button>
          <h3 className="text-base font-semibold capitalize sm:text-lg">{new Date(anoAtual, mesAtual).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => mudarMes(1)} className="p-2 rounded-md hover:bg-accent"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
          {diasSemana.map(dia => (
            <div key={dia} className="text-center text-[10px] font-semibold text-muted-foreground sm:text-xs">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {dias}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span className="text-muted-foreground">Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-500 rounded"></div>
            <span className="text-muted-foreground">Com atendimento</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="surface-label">Visão geral</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Resumo financeiro</h2>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe atendimentos, recebimentos e produtividade em um só lugar.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-xs font-semibold capitalize text-muted-foreground shadow-sm">
          <Calendar className="h-4 w-4 text-primary" />
          {new Date(dataExibicao).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="flex justify-start sm:justify-end">
        <Button type="button" variant="outline" onClick={exportarRelatorioPDF} className="w-full gap-2 border-primary/35 bg-card/70 text-foreground hover:bg-accent sm:w-auto">
          <FileDown className="h-4 w-4" />
          Exportar relatório PDF
        </Button>
      </div>

      {vencimentosProximos && (
        <button
          type="button"
          onClick={() => setIsModalVencimentosAberto(true)}
          className="flex w-full flex-col gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/[0.08] px-4 py-3 text-left shadow-lg shadow-amber-950/10 transition-all hover:border-amber-400/65 hover:bg-amber-500/[0.12] sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3 sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold text-amber-500">Atenção: vencimento próximo</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{vencimentosProximos.quantidade} {vencimentosProximos.quantidade === 1 ? 'invoice vence' : 'invoices vencem'} nos próximos 3 dias ({vencimentosProximos.quantidadeOS} {vencimentosProximos.quantidadeOS === 1 ? 'OS associada' : 'OS associadas'}). Clique para ver os detalhes.</p>
            </div>
          </div>
          <span className="text-lg font-bold text-amber-500">{vencimentosProximos.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {/* Card Pagamento Atrasado */}
        <div onClick={() => pagamentosAtrasados && setIsModalAtrasadosAberto(true)} className="cursor-pointer block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="metric-card h-full border-red-400/35 bg-red-500/[0.035]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Atrasados</CardTitle>
              <span className="metric-icon bg-red-500/12 text-red-500"><AlertTriangle className="h-4 w-4" /></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {pagamentosAtrasados ? pagamentosAtrasados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {pagamentosAtrasados 
                  ? <>{pagamentosAtrasados.quantidade} {pagamentosAtrasados.quantidade === 1 ? 'invoice em atraso' : 'invoices em atraso'} ({pagamentosAtrasados.quantidadeOS} {pagamentosAtrasados.quantidadeOS === 1 ? 'OS' : 'OS'}) <Info className="w-3 h-3" /></>
                  : 'Nenhuma invoice em atraso.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Card Próximo Pagamento */}
        <div onClick={() => proximoPagamento && setIsModalAberto(true)} className="cursor-pointer block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="metric-card h-full border-emerald-400/35 bg-emerald-500/[0.035]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próxima Invoice</CardTitle>
              <span className="metric-icon bg-emerald-500/12 text-emerald-500"><DollarSign className="h-4 w-4" /></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {proximoPagamento ? proximoPagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {proximoPagamento 
                  ? <>Previsto para {formatarData(proximoPagamento.data)} ({proximoPagamento.quantidade} {proximoPagamento.quantidade === 1 ? 'invoice' : 'invoices'} · {proximoPagamento.quantidadeOS} OS) <Info className="w-3 h-3" /></>
                  : 'Nenhuma invoice aguardando pagamento.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Link to="/extrato" className="block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="metric-card h-full border-sky-400/30 bg-sky-500/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
              <span className="metric-icon bg-sky-500/12 text-sky-500"><Calendar className="h-4 w-4" /></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.totalAtendimentos}</div>
              <p className="text-xs text-muted-foreground">no mês</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        <Card className="metric-card border-violet-400/30 bg-violet-500/[0.03]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
            <span className="metric-icon bg-violet-500/12 text-violet-500"><TrendingUp className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estatisticas.totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">OS executadas no mês</p>
          </CardContent>
        </Card>

        <Card className="metric-card border-indigo-400/30 bg-indigo-500/[0.03]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Líquido</CardTitle>
            <span className="metric-icon bg-indigo-500/12 text-indigo-500"><DollarSign className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estatisticas.totalLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">OS executadas no mês</p>
          </CardContent>
        </Card>

        <Card className="metric-card border-amber-400/30 bg-amber-500/[0.03]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <span className="metric-icon bg-amber-500/12 text-amber-500"><Clock className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.totalHoras.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">OS executadas no mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes do Próximo Pagamento */}
      <Dialog open={isModalAberto} onOpenChange={setIsModalAberto}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Detalhes da Próxima Invoice</DialogTitle>
            <DialogDescription>
              Invoices previstas para {proximoPagamento && formatarData(proximoPagamento.data)}. Registre o pagamento para atualizar todas as OS da invoice.
            </DialogDescription>
          </DialogHeader>
          {erroAtualizacaoStatus && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{erroAtualizacaoStatus}</p>}
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {proximoPagamento?.invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Invoice · {invoice.plataforma}</p>
                    <p className="text-xs text-muted-foreground">Vencimento: {formatarData(invoice.data)} · {invoice.quantidadeOS} {invoice.quantidadeOS === 1 ? 'OS incluída' : 'OS incluídas'}</p>
                  </div>
                  <p className="text-left text-sm font-bold text-green-500 sm:text-right">{invoice.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="mt-3 border-t border-emerald-500/15 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">OS da invoice</p>
                  <p className="mt-1 text-xs text-foreground">{invoice.atendimentos.map((att) => att.numero_os || 'OS sem número').join(' · ')}</p>
                </div>
                <div className="mt-3 flex justify-end border-t border-emerald-500/15 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => registrarPagamentoDaInvoice(invoice)}
                    disabled={osAtualizandoId === invoice.id}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {osAtualizandoId === invoice.id ? 'Registrando pagamento...' : 'Registrar pagamento da invoice'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t flex justify-between items-center">
            <span className="font-bold">Total a Receber:</span>
            <span className="text-xl font-bold text-green-500">
              {proximoPagamento?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes de Pagamentos Atrasados */}
      <Dialog open={isModalAtrasadosAberto} onOpenChange={setIsModalAtrasadosAberto}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Pagamentos Atrasados
            </DialogTitle>
            <DialogDescription>
              Invoices com pagamentos em atraso. A confirmação atualiza todas as OS da invoice.
            </DialogDescription>
          </DialogHeader>
          {erroAtualizacaoStatus && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{erroAtualizacaoStatus}</p>}
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {pagamentosAtrasados?.invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Invoice · {invoice.plataforma}</p>
                    <p className="text-xs text-muted-foreground">Vencimento: {formatarData(invoice.data)} · {invoice.quantidadeOS} {invoice.quantidadeOS === 1 ? 'OS incluída' : 'OS incluídas'}</p>
                  </div>
                  <p className="text-left text-sm font-bold text-red-500 sm:text-right">{invoice.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="mt-3 border-t border-red-500/15 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">OS da invoice</p>
                  <p className="mt-1 text-xs text-foreground">{invoice.atendimentos.map((att) => att.numero_os || 'OS sem número').join(' · ')}</p>
                </div>
                <div className="mt-3 flex justify-end border-t border-red-500/15 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => confirmarPagamentoAtrasado(invoice)}
                    disabled={osAtualizandoId === invoice.id}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {osAtualizandoId === invoice.id ? 'Confirmando invoice...' : 'Confirmar pagamento da invoice'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t flex justify-between items-center">
            <span className="font-bold">Total em Atraso:</span>
            <span className="text-xl font-bold text-red-500">
              {pagamentosAtrasados?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes de Vencimentos Próximos */}
      <Dialog open={isModalVencimentosAberto} onOpenChange={setIsModalVencimentosAberto}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Vencimentos Próximos
            </DialogTitle>
            <DialogDescription>
              Invoices com vencimento previsto para hoje ou os próximos 3 dias.
            </DialogDescription>
          </DialogHeader>
          {erroAtualizacaoStatus && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{erroAtualizacaoStatus}</p>}
          <div className="max-h-[60vh] space-y-3 overflow-y-auto py-4">
            {vencimentosProximos?.invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Invoice · {invoice.plataforma}</p>
                    <p className="text-xs text-muted-foreground">Vencimento: {formatarData(invoice.data)} · {invoice.diasRestantes === 0 ? 'vence hoje' : `vence em ${invoice.diasRestantes} ${invoice.diasRestantes === 1 ? 'dia' : 'dias'}`} · {invoice.quantidadeOS} {invoice.quantidadeOS === 1 ? 'OS incluída' : 'OS incluídas'}</p>
                  </div>
                  <p className="text-left text-sm font-bold text-amber-500 sm:text-right">{invoice.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="mt-3 border-t border-amber-500/15 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">OS da invoice</p>
                  <p className="mt-1 text-xs text-foreground">{invoice.atendimentos.map((att) => att.numero_os || 'OS sem número').join(' · ')}</p>
                </div>
                <div className="mt-3 flex flex-col gap-2 border-t border-amber-500/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Atualizar status de toda a invoice</p>
                  <Select value={invoice.atendimentos[0].status} onValueChange={(status) => atualizarStatusDaInvoice(invoice, status)} disabled={osAtualizandoId === invoice.id}>
                    <SelectTrigger className="h-9 w-full bg-card/70 text-xs sm:w-[210px]" aria-label={`Status de pagamento da invoice ${invoice.plataforma} ${formatarData(invoice.data)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aguardando Pagamento">Aguardando Pagamento</SelectItem>
                      <SelectItem value="Pagamento Atrasado">Pagamento Atrasado</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="font-bold">Total das invoices próximas:</span>
            <span className="text-xl font-bold text-amber-500">{vencimentosProximos?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </DialogContent>
      </Dialog>

      {createPortal(<section id="relatorio-financeiro" className="relatorio-financeiro-print">
        <header className="relatorio-financeiro-cabecalho">
          <div>
            <p className="relatorio-financeiro-marca">LVO CONSULTORIA EM TI</p>
            <h1>Relatório de pendências de pagamento</h1>
            <p>OS vencidas e pagamentos previstos para os próximos 3 dias.</p>
          </div>
          <p>Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </header>

        <div className="relatorio-financeiro-resumo">
          <div><span>OS vencidas</span><strong>{relatorioFinanceiro.atrasados.length}</strong><b>{relatorioFinanceiro.totalAtrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></div>
          <div><span>Próximas do vencimento</span><strong>{relatorioFinanceiro.proximos.length}</strong><b>{relatorioFinanceiro.totalProximo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></div>
          <div><span>Total em acompanhamento</span><strong>{relatorioFinanceiro.quantidade}</strong><b>{relatorioFinanceiro.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></div>
        </div>

        {relatorioFinanceiro.atrasados.length > 0 && (
          <section className="relatorio-financeiro-secao">
            <h2>OS vencidas</h2>
            <table>
              <thead><tr><th>OS</th><th>Cliente</th><th>Plataforma</th><th>Vencimento</th><th>Prazo</th><th>Valor líquido</th></tr></thead>
              <tbody>{relatorioFinanceiro.atrasados.map((att) => <tr key={`atrasada-${att.id}`}><td>{att.numero_os || '—'}</td><td>{att.nome_cliente || '—'}</td><td>{att.plataforma || '—'}</td><td>{formatarData(att.data_prevista_pagamento)}</td><td>{att.diasAtraso === null ? 'Não informado' : `${att.diasAtraso} ${att.diasAtraso === 1 ? 'dia em atraso' : 'dias em atraso'}`}</td><td>{calcularValorLiquido(att).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        {relatorioFinanceiro.proximos.length > 0 && (
          <section className="relatorio-financeiro-secao">
            <h2>OS próximas do vencimento</h2>
            <table>
              <thead><tr><th>OS</th><th>Cliente</th><th>Plataforma</th><th>Vencimento</th><th>Prazo</th><th>Valor líquido</th></tr></thead>
              <tbody>{relatorioFinanceiro.proximos.map((att) => <tr key={`proxima-${att.id}`}><td>{att.numero_os || '—'}</td><td>{att.nome_cliente || '—'}</td><td>{att.plataforma || '—'}</td><td>{formatarData(att.data_prevista_pagamento)}</td><td>{att.diasRestantes === 0 ? 'Vence hoje' : `${att.diasRestantes} ${att.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}`}</td><td>{calcularValorLiquido(att).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        <footer>Relatório gerado pelo sistema de gestão de atendimentos LVO TI.</footer>
      </section>, document.body)}

      {/* Modal de Detalhes do Calendário */}
      <Dialog open={isModalCalendarioAberto} onOpenChange={setIsModalCalendarioAberto}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Atendimentos do Dia</DialogTitle>
            <DialogDescription>
              Lista de chamados realizados em {dataSelecionada && new Date(dataSelecionada + 'T03:00:00Z').toLocaleDateString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {atendimentosDiaSelecionado.map((att) => (
              <div key={att.id} className="p-3 rounded-lg border bg-accent/50 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold">OS: {att.numero_os}</p>
                    <p className="text-xs font-medium text-primary">{att.plataforma}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    att.status === 'Pago' ? 'bg-green-500/20 text-green-500' : 
                    att.status === 'Pagamento Atrasado' ? 'bg-red-500/20 text-red-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {att.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{att.checkin} - {att.checkout}</span>
                  </div>
                  <div className="text-right font-bold text-foreground">
                    {calcularValorLiquido(att).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="dashboard-analytics-card overflow-hidden">
          <CardHeader>
            <CardTitle>Calendário de Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {renderCalendario()}
          </CardContent>
        </Card>

        <DeferredDashboardCharts
          tipo="plataforma"
          faturamentoPorPlataforma={faturamentoPorPlataforma}
        />
      </div>

      <DeferredDashboardCharts
        tipo="mensal"
        dadosMensais={dadosMensais}
        anoExibicao={dataExibicao.getFullYear()}
      />
    </div>
  )
}

export default Dashboard

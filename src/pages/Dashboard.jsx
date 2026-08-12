import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, TrendingUp, DollarSign, Clock, ChevronLeft, ChevronRight, Info, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

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

function Dashboard({ atendimentos }) {
  const [dataExibicao, setDataExibicao] = useState(new Date())
  const [isModalAberto, setIsModalAberto] = useState(false)
  const [isModalAtrasadosAberto, setIsModalAtrasadosAberto] = useState(false)
  const [isModalCalendarioAberto, setIsModalCalendarioAberto] = useState(false)
  const [atendimentosDiaSelecionado, setAtendimentosDiaSelecionado] = useState([])
  const [dataSelecionada, setDataSelecionada] = useState('')

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
    const atendimentosAguardando = atendimentos.filter(a => a.status === 'Aguardando Pagamento' && a.data_prevista_pagamento);
    if (atendimentosAguardando.length === 0) return null;
    const datasOrdenadas = [...new Set(atendimentosAguardando.map(a => a.data_prevista_pagamento))].sort();
    const dataMaisProxima = datasOrdenadas[0];
    const atendimentosNaData = atendimentosAguardando.filter(a => a.data_prevista_pagamento === dataMaisProxima);
    const totalAReceber = atendimentosNaData.reduce((acc, a) => acc + calcularValorLiquido(a), 0);
    return {
      valor: totalAReceber,
      data: dataMaisProxima,
      quantidade: atendimentosNaData.length,
      atendimentos: atendimentosNaData
    };
  }, [atendimentos]);

  const pagamentosAtrasados = useMemo(() => {
    const atendimentosAtrasados = atendimentos.filter(a => a.status === 'Pagamento Atrasado');
    if (atendimentosAtrasados.length === 0) return null;
    const totalAtrasado = atendimentosAtrasados.reduce((acc, a) => acc + calcularValorLiquido(a), 0);
    return {
      valor: totalAtrasado,
      quantidade: atendimentosAtrasados.length,
      atendimentos: atendimentosAtrasados
    };
  }, [atendimentos]);

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
                  ? <>{pagamentosAtrasados.quantidade} OS com pagamento pendente <Info className="w-3 h-3" /></>
                  : 'Nenhum pagamento atrasado.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Card Próximo Pagamento */}
        <div onClick={() => proximoPagamento && setIsModalAberto(true)} className="cursor-pointer block hover:shadow-lg transition-shadow rounded-lg">
          <Card className="metric-card h-full border-emerald-400/35 bg-emerald-500/[0.035]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Pagamento</CardTitle>
              <span className="metric-icon bg-emerald-500/12 text-emerald-500"><DollarSign className="h-4 w-4" /></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {proximoPagamento ? proximoPagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {proximoPagamento 
                  ? <>Previsto para {new Date(proximoPagamento.data + 'T03:00:00Z').toLocaleDateString('pt-BR')} ({proximoPagamento.quantidade} OS) <Info className="w-3 h-3" /></>
                  : 'Nenhum pagamento aguardando.'}
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
            <DialogTitle>Detalhes do Próximo Pagamento</DialogTitle>
            <DialogDescription>
              Atendimentos previstos para {proximoPagamento && new Date(proximoPagamento.data + 'T03:00:00Z').toLocaleDateString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {proximoPagamento?.atendimentos.map((att) => (
              <div key={att.id} className="flex flex-col gap-2 rounded-lg border bg-accent/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold">OS: {att.numero_os}</p>
                  <p className="text-xs text-muted-foreground">Realizado em: {new Date(att.data_atendimento + 'T03:00:00Z').toLocaleDateString('pt-BR')}</p>
                  <p className="text-xs font-medium text-primary">{att.plataforma}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-green-500">
                    {calcularValorLiquido(att).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
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
              Lista de atendimentos com status de pagamento atrasado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {pagamentosAtrasados?.atendimentos.map((att) => (
              <div key={att.id} className="flex flex-col gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold">OS: {att.numero_os}</p>
                  <p className="text-xs text-muted-foreground">Vencimento: {att.data_prevista_pagamento ? new Date(att.data_prevista_pagamento + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'Não informada'}</p>
                  <p className="text-xs font-medium text-primary">{att.plataforma}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-red-500">
                    {calcularValorLiquido(att).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
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

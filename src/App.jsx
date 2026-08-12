import { createElement, lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home, FileText, BarChart3, Sun, Moon, Plus, AlertTriangle, X, Menu, ExternalLink, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { getChamados, saveChamados } from './services/api'

import './App.css'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Extrato = lazy(() => import('./pages/Extrato'))
const Relatorios = lazy(() => import('./pages/Relatorios'))

function PageLoadingFallback() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="Carregando página">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-lg bg-muted" />)}
      </div>
    </div>
  )
}

function AnimatedRoutes({ atendimentos, setAtendimentos }) {
  const location = useLocation()

  return (
    <div key={location.pathname} className="page-transition">
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes location={location}>
          <Route path="/" element={<Dashboard atendimentos={atendimentos} />} />
          <Route path="/extrato" element={<Extrato atendimentos={atendimentos} setAtendimentos={setAtendimentos} />} />
          <Route path="/relatorios" element={<Relatorios atendimentos={atendimentos} />} />
        </Routes>
      </Suspense>
    </div>
  )
}

const plataformas = ['FINDUP', 'EUNERD', 'QUALLITY', 'NS SUPORTE', 'ONIX SUPORTE', 'CO&BE', 'LVO TI']
const statusOpcoes = [
  'Prox Atendimento',
  'em atendimento',
  'Gerar NF',
  'NF Gerada',
  'NF enviada',
  'Aguardando Pagamento',
  'Pagamento Atrasado',
  'Pago'
]

function Navigation({ toggleDarkMode, darkMode, onNovoChamado, sidebarRecolhida, onToggleSidebar }) {
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  const itensNavegacao = [
    { path: '/', label: 'Visão geral', icon: Home },
    { path: '/extrato', label: 'Atendimentos', icon: FileText },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 }
  ]

  const isActive = (path) => location.pathname === path

  const LinksNavegacao = ({ onNavigate = () => {}, compacta = false }) => (
    <>
      <p className={`mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-[#69769f] ${compacta ? 'sr-only' : ''}`}>OPERACIONAL</p>
      {itensNavegacao.map(({ path, label, icon }) => (
        <Link
          key={path}
          to={path}
          onClick={onNavigate}
          title={compacta ? label : undefined}
          aria-label={label}
          className={`app-nav-link mb-2 flex h-11 min-h-11 items-center rounded-lg text-sm font-medium transition-all ${
            compacta ? 'mx-auto w-11 justify-center p-0' : 'gap-3 px-3'
          } ${isActive(path) ? 'app-nav-link-active' : ''}`}
        >
          {createElement(icon, { className: 'h-4 w-4 shrink-0' })}
          <span className={compacta ? 'sr-only' : ''}>{label}</span>
        </Link>
      ))}
    </>
  )

  return (
    <>
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r transition-[width] duration-300 lg:flex ${sidebarRecolhida ? 'w-[84px]' : 'w-[264px]'}`} aria-label="Navegação principal">
        <div className={`flex items-center border-b border-white/10 ${sidebarRecolhida ? 'h-[124px] flex-col justify-center gap-3 px-2' : 'h-[76px] justify-between gap-2 px-5'}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6675ff] to-[#3947cf] text-base font-black text-white shadow-lg shadow-indigo-950/40">L</div>
            <div className={sidebarRecolhida ? 'hidden' : ''}>
              <p className="text-base font-bold tracking-tight text-white">LVO TI</p>
              <p className="text-[11px] font-medium text-[#8d9abe]">Gestão de atendimentos</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8 shrink-0 text-[#aeb8d8] hover:bg-white/10 hover:text-white" title={sidebarRecolhida ? 'Expandir menu lateral' : 'Recolher menu lateral'} aria-label={sidebarRecolhida ? 'Expandir menu lateral' : 'Recolher menu lateral'}>
            {sidebarRecolhida ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <nav className={`flex-1 ${sidebarRecolhida ? 'px-3 py-5' : 'px-3 py-6'}`}>
          <LinksNavegacao compacta={sidebarRecolhida} />
        </nav>

        <div className={`m-3 rounded-xl border border-white/10 bg-white/[0.035] ${sidebarRecolhida ? 'p-2' : 'p-3'}`}>
          {!sidebarRecolhida && <p className="text-xs font-semibold text-white">Acesso rápido</p>}
          <a
            href="https://www.nfse.gov.br/EmissorNacional/"
            target="_blank"
            rel="noopener noreferrer"
            title="Emitir Nota Fiscal"
            className={`text-xs font-medium text-[#aeb8d8] transition-colors hover:text-white ${sidebarRecolhida ? 'flex h-8 items-center justify-center' : 'mt-2 flex items-center gap-2'}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className={sidebarRecolhida ? 'sr-only' : ''}>Emitir Nota Fiscal</span>
          </a>
        </div>
      </aside>

      <header className={`app-header sticky top-0 z-30 border-b transition-[margin] duration-300 ${sidebarRecolhida ? 'lg:ml-[84px]' : 'lg:ml-[264px]'}`}>
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-[76px] lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-border bg-card/70 lg:hidden"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="surface-label hidden sm:block">Dashboard</p>
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">LVO Consultoria em TI</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={darkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
              aria-label={darkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button onClick={onNovoChamado} size="sm" className="h-9 rounded-lg bg-[#5c6cf4] px-3 text-white shadow-lg shadow-indigo-500/20 hover:bg-[#4d5be0]">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Novo chamado</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>
      </header>

      {menuAberto && (
        <div className="lg:hidden">
          <button className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm" onClick={() => setMenuAberto(false)} aria-label="Fechar menu de navegação" />
          <aside className="app-sidebar fixed inset-y-0 left-0 z-[60] flex w-[82vw] max-w-[300px] flex-col animate-in slide-in-from-left duration-200" aria-label="Menu de navegação">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6675ff] to-[#3947cf] font-black text-white">L</div>
                <div><p className="font-bold text-white">LVO TI</p><p className="text-[11px] text-[#8d9abe]">Gestão de atendimentos</p></div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-[#b9c3e3] hover:bg-white/10 hover:text-white" onClick={() => setMenuAberto(false)} aria-label="Fechar menu"><X className="h-5 w-5" /></Button>
            </div>
            <nav className="flex-1 px-3 py-6"><LinksNavegacao onNavigate={() => setMenuAberto(false)} /></nav>
            <div className="border-t border-white/10 p-3">
              <button onClick={toggleDarkMode} className="app-nav-link flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function App() {
  const [atendimentos, setAtendimentos] = useState([])
  const [darkMode, setDarkMode] = useState(true)
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false)
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false)
  const [notificacaoAtraso, setNotificacaoAtraso] = useState(0)
  const [dadosCarregados, setDadosCarregados] = useState(false)
  const [erroPersistencia, setErroPersistencia] = useState('')
  const [novoAtendimento, setNovoAtendimento] = useState({
    data_atendimento: '',
    checkin: '',
    checkout: '',
    numero_os: '',
    nome_cliente: '',
    plataforma: plataformas[0],
    data_prevista_pagamento: '',
    valor_chamado: '0',
    ganhos_adicionais: '0',
    despesas_os: '0',
    adiantamento_recebido: '0',
    status: 'Prox Atendimento'
  })

  // Carregar tema do localStorage ao iniciar
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme !== null) {
      setDarkMode(JSON.parse(savedTheme))
    }
  }, [])

  // Salvar tema no localStorage sempre que houver alteração
  useEffect(() => {
    localStorage.setItem("theme", JSON.stringify(darkMode))
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'

    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  // Os dados de chamados são lidos exclusivamente do arquivo configurado no servidor Linux.
  useEffect(() => {
    let ativo = true

    const carregarChamados = async () => {
      try {
        const dados = await getChamados()
        if (ativo && Array.isArray(dados)) {
          setAtendimentos(dados)
        }
      } catch (error) {
        console.error('Erro ao carregar chamados do servidor:', error)
        if (ativo) {
          setErroPersistencia('Não foi possível carregar os chamados armazenados no servidor.')
        }
      } finally {
        if (ativo) {
          setDadosCarregados(true)
        }
      }
    }

    carregarChamados()
    return () => { ativo = false }
  }, [])

  // Atualiza a tela e persiste a lista completa no arquivo JSON do servidor Linux.
  const atualizarESalvar = useCallback(async (novosDados) => {
    setAtendimentos(novosDados)
    setErroPersistencia('')

    try {
      await saveChamados(novosDados)
    } catch (error) {
      console.error('Erro ao salvar chamados no servidor:', error)
      setErroPersistencia('As alterações não puderam ser salvas no servidor. Verifique a conexão e tente novamente.')
      throw error
    }
  }, [])

  // Verificação automática de pagamentos atrasados
  useEffect(() => {
    if (!dadosCarregados || atendimentos.length === 0) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split('T')[0];
    
    let novosAtrasos = 0;
    const novosAtendimentos = atendimentos.map(att => {
      if (att.data_prevista_pagamento && 
          att.data_prevista_pagamento < hojeStr && 
          att.status !== 'Pago' && 
          att.status !== 'Pagamento Atrasado') {
        novosAtrasos++;
        return { ...att, status: 'Pagamento Atrasado' };
      }
      return att;
    });

    if (novosAtrasos > 0) {
      atualizarESalvar(novosAtendimentos).catch(() => {})
      setNotificacaoAtraso(novosAtrasos)
    }
  }, [atendimentos, atualizarESalvar, dadosCarregados]);

  const handleAdicionar = async () => {
    if (!novoAtendimento.data_atendimento || !novoAtendimento.numero_os) {
      alert('Por favor, preencha pelo menos a data e o número da OS')
      return
    }
    const atendimento = { ...novoAtendimento, id: Date.now().toString() }

    try {
      await atualizarESalvar([...atendimentos, atendimento])
    } catch {
      return
    }

    setNovoAtendimento({
      data_atendimento: '', checkin: '', checkout: '', numero_os: '', nome_cliente: '',
      plataforma: plataformas[0], data_prevista_pagamento: '', valor_chamado: '0',
      ganhos_adicionais: '0', despesas_os: '0', adiantamento_recebido: '0', status: 'Prox Atendimento'
    });
    setIsModalNovoAberto(false);
  }

  return (
    <Router>
      <div className="app-shell">
        <Navigation 
          toggleDarkMode={toggleDarkMode} 
          darkMode={darkMode} 
          sidebarRecolhida={sidebarRecolhida}
          onToggleSidebar={() => setSidebarRecolhida((atual) => !atual)}
          onNovoChamado={() => setIsModalNovoAberto(true)} 
        />

        <div className={`transition-[margin] duration-300 ${sidebarRecolhida ? 'lg:ml-[84px]' : 'lg:ml-[264px]'}`}>
        {erroPersistencia && (
          <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 shadow-lg sm:mx-6 lg:mx-8">
            <span>{erroPersistencia}</span>
            <button onClick={() => setErroPersistencia('')} className="rounded p-1 hover:bg-red-500/10" aria-label="Fechar aviso de persistência"><X className="h-4 w-4" /></button>
          </div>
        )}

        {notificacaoAtraso > 0 && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/90 px-4 py-3 text-white shadow-xl shadow-red-950/15 animate-in fade-in slide-in-from-top duration-500 sm:mx-6 sm:items-center lg:mx-8">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 animate-pulse sm:mt-0 sm:h-6 sm:w-6" />
              <div className="min-w-0">
                <p className="font-bold">Atenção: Pagamentos Vencidos!</p>
                <p className="text-sm opacity-90">Identificamos {notificacaoAtraso} novo(s) chamado(s) que passaram da data de pagamento e foram movidos para "Atrasado".</p>
              </div>
            </div>
            <button
              onClick={() => setNotificacaoAtraso(0)}
              className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Fechar notificação"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {dadosCarregados ? (
            <AnimatedRoutes atendimentos={atendimentos} setAtendimentos={atualizarESalvar} />
          ) : (
            <PageLoadingFallback />
          )}
        </main>

        {/* Modal Global de Novo Chamado */}
        <Dialog open={isModalNovoAberto} onOpenChange={setIsModalNovoAberto}>
          <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto sm:w-full">
            <DialogHeader>
              <DialogTitle>Registrar Novo Chamado</DialogTitle>
              <DialogDescription>Preencha as informações abaixo para cadastrar um novo atendimento no sistema.</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Data do Atendimento</Label>
                <Input type="date" value={novoAtendimento.data_atendimento} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, data_atendimento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Número da OS</Label>
                <Input placeholder="Ex: 123456" value={novoAtendimento.numero_os} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, numero_os: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input placeholder="Nome do cliente ou local" value={novoAtendimento.nome_cliente} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, nome_cliente: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select value={novoAtendimento.plataforma} onValueChange={(v) => setNovoAtendimento({ ...novoAtendimento, plataforma: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{plataformas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Check-in</Label>
                  <Input type="time" value={novoAtendimento.checkin} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, checkin: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Check-out</Label>
                  <Input type="time" value={novoAtendimento.checkout} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, checkout: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Previsão de Pagamento</Label>
                <Input type="date" value={novoAtendimento.data_prevista_pagamento} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, data_prevista_pagamento: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Valor Chamado</Label>
                  <Input type="number" value={novoAtendimento.valor_chamado} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, valor_chamado: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ganhos Extras</Label>
                  <Input type="number" value={novoAtendimento.ganhos_adicionais} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, ganhos_adicionais: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Despesas OS</Label>
                  <Input type="number" value={novoAtendimento.despesas_os} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, despesas_os: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Adiantamento</Label>
                  <Input type="number" value={novoAtendimento.adiantamento_recebido} onChange={(e) => setNovoAtendimento({ ...novoAtendimento, adiantamento_recebido: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Status Inicial</Label>
                <Select value={novoAtendimento.status} onValueChange={(v) => setNovoAtendimento({ ...novoAtendimento, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsModalNovoAberto(false)}>Cancelar</Button>
              <Button onClick={handleAdicionar} className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto">Salvar Atendimento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </Router>
  )
}

export default App

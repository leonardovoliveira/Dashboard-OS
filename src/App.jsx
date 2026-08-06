import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home, FileText, BarChart3, Sun, Moon, Plus, AlertTriangle, X } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Extrato from './pages/Extrato'
import Relatorios from './pages/Relatorios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { getChamados, saveChamados } from './services/api'[cite: 1]

import './App.css'

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

function Navigation({ toggleDarkMode, darkMode, onNovoChamado }) {
  const location = useLocation()
  
  const isActive = (path) => {
    return location.pathname === path
  }

  return (
      <nav className="bg-background border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-foreground hover:text-blue-500 transition-colors">LVO TI</Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <button
                onClick={toggleDarkMode}
                className="inline-flex items-center px-3 transition-colors text-muted-foreground hover:text-foreground"
                title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link
                to="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'border-blue-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
                }`}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
              <Link
                to="/extrato"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/extrato')
                    ? 'border-blue-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Extrato de Atendimentos
              </Link>
              <Link
                to="/relatorios"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/relatorios')
                    ? 'border-blue-500 text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Relatórios Mensais
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={onNovoChamado}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Chamado
            </Button>
            <a
              href="https://www.nfse.gov.br/EmissorNacional/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Emitir NF
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  const [atendimentos, setAtendimentos] = useState([])
  const [darkMode, setDarkMode] = useState(true)
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false)
  const [notificacaoAtraso, setNotificacaoAtraso] = useState(0)
  const [dadosCarregados, setDadosCarregados] = useState(false)
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

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme !== null) {
      setDarkMode(JSON.parse(savedTheme))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("theme", JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  // Carregar dados assíncronamente do servidor Linux ao iniciar[cite: 1]
  useEffect(() => {
    getChamados().then(data => {
      if (data && Array.isArray(data)) {
        setAtendimentos(data);
      }
      setDadosCarregados(true);
    });
  }, [])

  // Função centralizada para atualizar e salvar imediatamente na API do Servidor Linux
  const atualizarE Salvar = async (novosDados) => {
    setAtendimentos(novosDados);
    await saveChamados(novosDados);
  };

  // Verificação automática de pagamentos atrasados
  useEffect(() => {
    if (!dadosCarregados || atendimentos.length === 0) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split('T')[0];
    
    let houveMudanca = false;
    const novosAtendimentos = atendimentos.map(att => {
      if (att.data_prevista_pagamento && 
          att.data_prevista_pagamento < hojeStr && 
          att.status !== 'Pago' && 
          att.status !== 'Pagamento Atrasado') {
        houveMudanca = true;
        return { ...att, status: 'Pagamento Atrasado' };
      }
      return att;
    });

    if (houveMudanca) {
      atualizarE Salvar(novosAtendimentos);
      setNotificacaoAtraso(atendimentos.filter(a => a.status === 'Pagamento Atrasado').length);
    }
  }, [dadosCarregados]);

  const handleAdicionar = async () => {
    if (!novoAtendimento.data_atendimento || !novoAtendimento.numero_os) {
      alert('Por favor, preencha pelo menos a data e o número da OS')
      return
    }
    const atendimento = { ...novoAtendimento, id: Date.now().toString() }
    const atualizados = [...atendimentos, atendimento];
    
    await atualizarE Salvar(atualizados);
    
    setNovoAtendimento({
      data_atendimento: '', checkin: '', checkout: '', numero_os: '', nome_cliente: '',
      plataforma: plataformas[0], data_prevista_pagamento: '', valor_chamado: '0',
      ganhos_adicionais: '0', despesas_os: '0', adiantamento_recebido: '0', status: 'Prox Atendimento'
    });
    setIsModalNovoAberto(false);
  }

  return (
    <Router>
      <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50"}`}>
        <Navigation 
          toggleDarkMode={toggleDarkMode} 
          darkMode={darkMode} 
          onNovoChamado={() => setIsModalNovoAberto(true)} 
        />

        {notificacaoAtraso > 0 && (
          <div className="bg-red-600 text-white px-4 py-3 shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <div>
                <p className="font-bold">Atenção: Pagamentos Vencidos!</p>
                <p className="text-sm opacity-90">Identificamos {notificacaoAtraso} chamado(s) com pagamento atrasado.</p>
              </div>
            </div>
            <button 
              onClick={() => setNotificacaoAtraso(0)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard atendimentos={atendimentos} />} />
            <Route path="/extrato" element={<Extrato atendimentos={atendimentos} setAtendimentos={atualizarE Salvar} />} />
            <Route path="/relatorios" element={<Relatorios atendimentos={atendimentos} />} />
          </Routes>
        </main>

        {/* Modal Global de Novo Chamado */}
        <Dialog open={isModalNovoAberto} onOpenChange={setIsModalNovoAberto}>
          <DialogContent className="max-w-2xl">
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
                  <Input type="number" value={novoAtendimento.ganhos_adicionais} onChange={(e) => setNovoAtendedimento({ ...novoAtendimento, ganhos_adicionais: e.target.value })} />
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalNovoAberto(false)}>Cancelar</Button>
              <Button onClick={handleAdicionar} className="bg-green-600 hover:bg-green-700 text-white">Salvar Atendimento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Router>
  )
}

export default App
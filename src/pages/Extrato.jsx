import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Save, X, Download, Upload, Calendar, Info, ExternalLink, AlertTriangle, Search } from 'lucide-react'

// Função para calcular horas trabalhadas
const calcularHoras = (checkin, checkout) => {
  if (!checkin || !checkout) return 0
  const [hIn, mIn] = checkin.split(':').map(Number)
  const [hOut, mOut] = checkout.split(':').map(Number)
  const totalMinutos = (hOut * 60 + mOut) - (hIn * 60 + mIn)
  return (totalMinutos / 60).toFixed(2)
}

// Função para calcular valor bruto
const calcularValorBruto = (atendimento) => {
  return (parseFloat(atendimento.valor_chamado) || 0) + (parseFloat(atendimento.ganhos_adicionais) || 0)
}

// Função para calcular valor líquido
const calcularValorLiquido = (atendimento) => {
  const bruto = calcularValorBruto(atendimento)
  const despesas = parseFloat(atendimento.despesas_os) || 0
  return bruto - despesas
}

const plataformas = ['FINDUP', 'EUNERD', 'QUALLITY', 'NS SUPORTE', 'ONIX SUPORTE', 'CO&BE', 'LVO TI']

const diasParaVencimento = (atendimento) => {
  if (atendimento.status !== 'Aguardando Pagamento' || !atendimento.data_prevista_pagamento) return null

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [ano, mes, dia] = atendimento.data_prevista_pagamento.split('-').map(Number)
  const vencimento = new Date(ano, mes - 1, dia)
  vencimento.setHours(0, 0, 0, 0)
  const dias = Math.round((vencimento - hoje) / 86400000)

  return dias >= 0 && dias <= 3 ? dias : null
}

const getPlataformaColorClass = (plataforma) => {
  switch (plataforma) {
    case 'FINDUP': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'EUNERD': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'QUALLITY': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'NS SUPORTE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'ONIX SUPORTE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'CO&BE': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'LVO TI': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};

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

const AtendimentoRow = ({ 
  atendimento, 
  handleExcluir, 
  isSelected,
  toggleSelection,
  onViewDetails
}) => {
  const dataAtendimentoFormatada = atendimento.data_atendimento ? new Date(atendimento.data_atendimento + 'T03:00:00Z').toLocaleDateString('pt-BR') : '';
  const diasRestantes = diasParaVencimento(atendimento);
  const vencimentoProximo = diasRestantes !== null;
  
  return (
    <tr 
      key={atendimento.id} 
      className={`operations-table-row cursor-pointer transition-colors ${isSelected ? 'is-selected' : ''} ${vencimentoProximo ? 'is-due-soon' : ''}`}
      onClick={() => onViewDetails(atendimento)}
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => toggleSelection(atendimento.id)}
        />
      </td>
      <td className="px-3 py-3 text-sm">{dataAtendimentoFormatada}</td>
      <td className="px-3 py-3 text-sm font-medium">{atendimento.numero_os}</td>
      <td className="px-3 py-3 text-sm">{atendimento.nome_cliente}</td>
      <td className="px-3 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs font-medium ${getPlataformaColorClass(atendimento.plataforma)}`}>
          {atendimento.plataforma}
        </span>
      </td>
      <td className="px-3 py-3 text-sm font-bold text-green-500">
        {calcularValorLiquido(atendimento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
      <td className="px-3 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium ${
            atendimento.status === 'Pago' ? 'bg-green-100/10 text-green-400' :
            atendimento.status === 'Aguardando Pagamento' ? 'bg-yellow-100/10 text-yellow-400' :
            atendimento.status === 'Pagamento Atrasado' ? 'bg-red-100/10 text-red-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {atendimento.status}
          </span>
          {vencimentoProximo && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-500" title={`Vencimento em ${atendimento.data_prevista_pagamento}`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {diasRestantes === 0 ? 'Vence hoje' : `${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(atendimento)}
          >
            <Info className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleExcluir(atendimento.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

const AtendimentoCardMobile = ({ atendimento, handleExcluir, isSelected, toggleSelection, onViewDetails }) => {
  const dataAtendimentoFormatada = atendimento.data_atendimento
    ? new Date(atendimento.data_atendimento + 'T03:00:00Z').toLocaleDateString('pt-BR')
    : 'Data não informada'
  const diasRestantes = diasParaVencimento(atendimento)
  const vencimentoProximo = diasRestantes !== null

  const statusClass = atendimento.status === 'Pago'
    ? 'bg-green-100/10 text-green-400'
    : atendimento.status === 'Aguardando Pagamento'
    ? 'bg-yellow-100/10 text-yellow-400'
    : atendimento.status === 'Pagamento Atrasado'
    ? 'bg-red-100/10 text-red-400'
    : 'bg-muted text-muted-foreground'

  return (
    <article
      onClick={() => onViewDetails(atendimento)}
      className={`operations-mobile-card cursor-pointer rounded-2xl border p-4 transition-colors ${isSelected ? 'is-selected' : vencimentoProximo ? 'is-due-soon' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(atendimento.id)} aria-label={`Selecionar OS ${atendimento.numero_os}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold">OS {atendimento.numero_os}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{atendimento.nome_cliente || 'Cliente não informado'}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                handleExcluir(atendimento.id)
              }}
              aria-label={`Excluir OS ${atendimento.numero_os}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{dataAtendimentoFormatada}</span>
            <span className={`rounded px-2 py-1 text-xs font-medium ${getPlataformaColorClass(atendimento.plataforma)}`}>
              {atendimento.plataforma}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
            <div className="flex flex-col items-start gap-2">
              <span className={`rounded px-2 py-1 text-xs font-medium ${statusClass}`}>{atendimento.status}</span>
              {vencimentoProximo && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {diasRestantes === 0 ? 'Vence hoje' : `Vence em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Valor líquido</p>
              <p className="text-base font-bold text-green-500">
                {calcularValorLiquido(atendimento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function Extrato({ atendimentos: propAtendimentos = [], setAtendimentos: setPropAtendimentos = () => {} }) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [dataInicio, setDataInicio] = useState(firstDay);
  const [dataFim, setDataFim] = useState(lastDay);
  const [filtroPlataforma, setFiltroPlataforma] = useState('all');
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [localAtendimentos, setLocalAtendimentos] = useState(propAtendimentos);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkDataPrevistaPagamento, setBulkDataPrevistaPagamento] = useState('');
  const [atendimentoDetalhe, setAtendimentoDetalhe] = useState(null);
  const [isEditando, setIsEditando] = useState(false);
  const [atendimentoEditado, setAtendimentoEditado] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalAtendimentos(propAtendimentos);
  }, [propAtendimentos]);

  useEffect(() => {
    setPropAtendimentos(localAtendimentos);
  }, [localAtendimentos, setPropAtendimentos]);

  const handleExportar = () => {
    const dataStr = JSON.stringify(localAtendimentos, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', 'extrato_atendimentos.json')
    linkElement.click()
  }

  const handleImportar = (event) => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result)
        if (Array.isArray(importedData)) {
          setLocalAtendimentos(importedData)
          alert('Dados importados com sucesso!')
        }
      } catch (error) {
        alert('Erro ao ler o arquivo: ' + error.message)
      }
    }
    reader.readAsText(file)
  }

  const atendimentosFiltrados = useMemo(() => {
    const termoBusca = filtroBusca.trim().toLocaleLowerCase('pt-BR')

    return localAtendimentos.filter(atendimento => {
      const dataAtendimentoStr = atendimento.data_atendimento;
      // A busca é global para localizar uma OS mesmo quando ela está fora do período atualmente selecionado.
      const dataCorresponde = termoBusca || ((!dataInicio || dataAtendimentoStr >= dataInicio) && (!dataFim || dataAtendimentoStr <= dataFim));
      const plataformaCorresponde = filtroPlataforma === 'all' || atendimento.plataforma === filtroPlataforma;
      const statusCorresponde = filtroStatus === 'all' || atendimento.status === filtroStatus;
      const buscaCorresponde = !termoBusca || [atendimento.numero_os, atendimento.nome_cliente, atendimento.plataforma]
        .some((campo) => String(campo || '').toLocaleLowerCase('pt-BR').includes(termoBusca));
      return dataCorresponde && plataformaCorresponde && statusCorresponde && buscaCorresponde;
    }).sort((a, b) => new Date(a.data_atendimento) - new Date(b.data_atendimento));
  }, [localAtendimentos, dataInicio, dataFim, filtroPlataforma, filtroStatus, filtroBusca]);

  const totalBrutoFiltrado = atendimentosFiltrados.reduce((acc, atendimento) => acc + calcularValorBruto(atendimento), 0);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este atendimento?')) {
      setLocalAtendimentos(localAtendimentos.filter(att => att.id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === atendimentosFiltrados.length ? [] : atendimentosFiltrados.map(a => a.id));
  };

  const handleBulkUpdate = () => {
    if (!bulkStatus && !bulkDataPrevistaPagamento) return;

    setLocalAtendimentos(localAtendimentos.map((att) => {
      if (!selectedIds.includes(att.id)) return att;
      return {
        ...att,
        ...(bulkStatus ? { status: bulkStatus } : {}),
        ...(bulkDataPrevistaPagamento ? { data_prevista_pagamento: bulkDataPrevistaPagamento } : {})
      };
    }));
    setSelectedIds([]);
    setBulkStatus('');
    setBulkDataPrevistaPagamento('');
  };

  const handleCancelarEdicaoLote = () => {
    setSelectedIds([]);
    setBulkStatus('');
    setBulkDataPrevistaPagamento('');
  };

  const handleSalvarEdicao = () => {
    setLocalAtendimentos(localAtendimentos.map(att => att.id === atendimentoEditado.id ? atendimentoEditado : att));
    setAtendimentoDetalhe(atendimentoEditado);
    setIsEditando(false);
  };

  const handleIniciarEdicao = (e) => {
    e.stopPropagation();
    setAtendimentoEditado({...atendimentoDetalhe});
    setIsEditando(true);
  };

  return (
    <div className="operations-page space-y-6">
      <header className="operations-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="surface-label">Operacional</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Atendimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulte, edite e acompanhe o ciclo financeiro de cada ordem de serviço.</p>
        </div>
        <div className="operations-hero-actions grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={handleExportar} variant="outline" size="sm" className="operations-action-button h-10 w-full sm:w-auto"><Download className="mr-2 h-4 w-4" />Exportar</Button>
          <input type="file" ref={fileInputRef} onChange={handleImportar} accept=".json" style={{ display: 'none' }} />
          <Button onClick={() => fileInputRef.current.click()} variant="outline" size="sm" className="operations-action-button h-10 w-full sm:w-auto"><Upload className="mr-2 h-4 w-4" />Importar</Button>
        </div>
      </header>

      <section className="operations-summary-grid" aria-label="Resumo do extrato filtrado">
        <article><span>Resultados</span><strong>{atendimentosFiltrados.length}</strong><small>{filtroBusca ? 'Busca global ativa' : 'No período selecionado'}</small></article>
        <article><span>Faturamento bruto</span><strong>{totalBrutoFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><small>OS exibidas no extrato</small></article>
        <article><span>Seleção em lote</span><strong>{selectedIds.length}</strong><small>{selectedIds.length ? 'Itens prontos para edição' : 'Nenhuma OS selecionada'}</small></article>
      </section>

      {selectedIds.length > 0 && (
        <Card className="operations-bulk-panel sticky top-20 z-10 rounded-2xl">
          <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm font-medium text-primary">{selectedIds.length} itens selecionados</span>
              <div className="flex flex-col gap-2 min-[420px]:flex-row min-[700px]:items-end">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="h-10 w-full min-[420px]:w-[200px]"><SelectValue placeholder="Alterar status para..." /></SelectTrigger>
                    <SelectContent>{statusOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bulk-data-prevista" className="text-xs font-medium text-muted-foreground">Previsão de pagamento</Label>
                  <Input
                    id="bulk-data-prevista"
                    type="date"
                    value={bulkDataPrevistaPagamento}
                    onChange={(e) => setBulkDataPrevistaPagamento(e.target.value)}
                    className="h-10 w-full min-[420px]:w-[185px]"
                  />
                </div>
                <Button size="sm" className="h-10 min-[420px]:self-end" onClick={handleBulkUpdate} disabled={!bulkStatus && !bulkDataPrevistaPagamento}>Aplicar alterações</Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="self-start sm:self-auto" onClick={handleCancelarEdicaoLote}>Cancelar</Button>
          </CardContent>
        </Card>
      )}

      <Card className="operations-filter-panel filters-surface rounded-2xl">
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-7">
          <div className="space-y-2 sm:col-span-2 xl:col-span-2">
            <Label className="surface-label">Busca global de chamados</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                placeholder="OS, cliente ou plataforma"
                className="pl-10 pr-10"
                aria-label="Buscar por número da OS, cliente ou plataforma"
              />
              {filtroBusca && (
                <button type="button" onClick={() => setFiltroBusca('')} className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Limpar busca">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Busca em todos os atendimentos cadastrados.</p>
          </div>
          <div className="space-y-2">
            <Label className="surface-label">Data início</Label>
            <div className="relative">
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="pl-10" />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="surface-label">Data fim</Label>
            <div className="relative">
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="pl-10" />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="surface-label">Plataforma</Label>
            <Select value={filtroPlataforma} onValueChange={setFiltroPlataforma}>
              <SelectTrigger><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {plataformas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="surface-label">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col justify-end space-y-2 sm:col-span-2 xl:col-span-1">
                          <Label className="surface-label">Total bruto filtrado</Label>
              <span className="text-2xl font-bold text-violet-400">

              {totalBrutoFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {atendimentosFiltrados.length > 0 ? (
          atendimentosFiltrados.map((atendimento) => (
            <AtendimentoCardMobile
              key={atendimento.id}
              atendimento={atendimento}
              handleExcluir={handleExcluir}
              isSelected={selectedIds.includes(atendimento.id)}
              toggleSelection={toggleSelection}
              onViewDetails={(att) => {
                setAtendimentoDetalhe(att)
                setIsEditando(false)
              }}
            />
          ))
        ) : (
          <Card className="operations-empty-state">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum atendimento encontrado para os filtros selecionados.
            </CardContent>
          </Card>
        )}
      </div>

      <section className="operations-table-panel hidden overflow-x-auto rounded-2xl md:block">
        <div className="operations-table-panel-header"><div><p className="surface-label">Lista operacional</p><h2>Atendimentos encontrados</h2></div><span>{atendimentosFiltrados.length} {atendimentosFiltrados.length === 1 ? 'OS' : 'OS'}</span></div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="operations-table-head">
              <th className="px-3 py-3 text-left w-10">
                <Checkbox checked={atendimentosFiltrados.length > 0 && selectedIds.length === atendimentosFiltrados.length} onCheckedChange={toggleSelectAll} />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">OS</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cliente</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Plataforma</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Líquido</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {atendimentosFiltrados.length > 0 ? (
              atendimentosFiltrados.map((atendimento) => (
                <AtendimentoRow 
                  key={atendimento.id} 
                  atendimento={atendimento} 
                  handleExcluir={handleExcluir}
                  isSelected={selectedIds.includes(atendimento.id)}
                  toggleSelection={toggleSelection}
                  onViewDetails={(att) => {
                    setAtendimentoDetalhe(att);
                    setIsEditando(false);
                  }}
                />
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum atendimento encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Modal de Detalhes e Edição */}
      <Dialog open={!!atendimentoDetalhe} onOpenChange={(open) => !open && setAtendimentoDetalhe(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-4 sm:w-full sm:p-6">
          <DialogHeader>
            <div className="flex flex-col items-start gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between">
              <DialogTitle>{isEditando ? 'Editar Atendimento' : 'Detalhes do Atendimento'}</DialogTitle>
              {!isEditando && (
                <Button variant="outline" size="sm" className="self-stretch sm:self-auto" onClick={handleIniciarEdicao}>
                  <Edit2 className="w-4 h-4 mr-2" /> Editar
                </Button>
              )}
            </div>
            <DialogDescription>
              {isEditando ? 'Altere as informações abaixo e clique em salvar.' : 'Informações completas da Ordem de Serviço.'}
            </DialogDescription>
          </DialogHeader>

          {atendimentoDetalhe && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {isEditando ? (
                <>
                  <div className="space-y-2"><Label>Data</Label><Input type="date" value={atendimentoEditado.data_atendimento} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, data_atendimento: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Número da OS</Label><Input value={atendimentoEditado.numero_os} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, numero_os: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Cliente</Label><Input value={atendimentoEditado.nome_cliente} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, nome_cliente: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Plataforma</Label>
                    <Select value={atendimentoEditado.plataforma} onValueChange={(v) => setAtendimentoEditado({...atendimentoEditado, plataforma: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{plataformas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2"><Label>Check-in</Label><Input type="time" value={atendimentoEditado.checkin} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, checkin: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Check-out</Label><Input type="time" value={atendimentoEditado.checkout} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, checkout: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2"><Label>Previsão Pagamento</Label><Input type="date" value={atendimentoEditado.data_prevista_pagamento} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, data_prevista_pagamento: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2"><Label>Valor Chamado</Label><Input type="number" value={atendimentoEditado.valor_chamado} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, valor_chamado: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Ganhos Extras</Label><Input type="number" value={atendimentoEditado.ganhos_adicionais} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, ganhos_adicionais: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2"><Label>Despesas OS</Label><Input type="number" value={atendimentoEditado.despesas_os} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, despesas_os: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Adiantamento</Label><Input type="number" value={atendimentoEditado.adiantamento_recebido} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, adiantamento_recebido: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2 md:col-span-2"><Label>Status</Label>
                    <Select value={atendimentoEditado.status} onValueChange={(v) => setAtendimentoEditado({...atendimentoEditado, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{statusOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Data do Atendimento</p><p className="font-medium">{new Date(atendimentoDetalhe.data_atendimento + 'T03:00:00Z').toLocaleDateString('pt-BR')}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Número da OS</p><p className="font-bold text-lg">{atendimentoDetalhe.numero_os}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{atendimentoDetalhe.nome_cliente || 'Não informado'}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Plataforma</p><span className={`px-2 py-1 rounded text-xs font-medium ${getPlataformaColorClass(atendimentoDetalhe.plataforma)}`}>{atendimentoDetalhe.plataforma}</span></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Horário</p><p className="font-medium">{atendimentoDetalhe.checkin} às {atendimentoDetalhe.checkout} ({calcularHoras(atendimentoDetalhe.checkin, atendimentoDetalhe.checkout)}h)</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Previsão de Pagamento</p><p className="font-medium">{atendimentoDetalhe.data_prevista_pagamento ? new Date(atendimentoDetalhe.data_prevista_pagamento + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'Não definida'}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Status Atual</p><span className={`px-2 py-1 rounded text-xs font-bold ${
                    atendimentoDetalhe.status === 'Pagamento Atrasado' ? 'bg-red-500/20 text-red-500' : 'bg-primary/10 text-primary'
                  }`}>{atendimentoDetalhe.status}</span></div>
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-accent/50 p-3 sm:gap-4 sm:p-4 md:col-span-2 md:grid-cols-4">
                    <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground">Valor OS</p><p className="font-bold">{parseFloat(atendimentoDetalhe.valor_chamado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                    <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground">Extras</p><p className="font-bold text-green-500">+{parseFloat(atendimentoDetalhe.ganhos_adicionais).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                    <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground">Despesas</p><p className="font-bold text-red-500">-{parseFloat(atendimentoDetalhe.despesas_os).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                    <div className="space-y-1"><p className="text-[10px] uppercase text-muted-foreground">Líquido</p><p className="font-bold text-xl text-blue-500">{calcularValorLiquido(atendimentoDetalhe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                  </div>
                </>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            {isEditando ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsEditando(false)}>Cancelar</Button>
                <Button className="w-full sm:w-auto" onClick={handleSalvarEdicao}>Salvar Alterações</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAtendimentoDetalhe(null)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Extrato;

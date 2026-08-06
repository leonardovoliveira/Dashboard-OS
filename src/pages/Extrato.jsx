import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Save, X, Download, Upload, Calendar, Info } from 'lucide-react'
import { saveChamados } from '../services/api' //[cite: 2]

const calcularHoras = (checkin, checkout) => {
  if (!checkin || !checkout) return 0
  const [hIn, mIn] = checkin.split(':').map(Number)
  const [hOut, mOut] = checkout.split(':').map(Number)
  const totalMinutos = (hOut * 60 + mOut) - (hIn * 60 + mIn)
  return (totalMinutos / 60).toFixed(2)
}

const calcularValorBruto = (atendimento) => {
  return (parseFloat(atendimento.valor_chamado) || 0) + (parseFloat(atendimento.ganhos_adicionais) || 0)
}

const calcularValorLiquido = (atendimento) => {
  const bruto = calcularValorBruto(atendimento)
  const despesas = parseFloat(atendimento.despesas_os) || 0
  return bruto - despesas
}

const plataformas = ['FINDUP', 'EUNERD', 'QUALLITY', 'NS SUPORTE', 'ONIX SUPORTE', 'CO&BE', 'LVO TI']

const getPlataformaColorClass = (plataforma) => {
  switch (plataforma) {
    case 'FINDUP': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'EUNERD': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'QUALLITY': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'NS SUPORTE': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-400';
    case 'ONIX SUPORTE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'CO&BE': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'LVO TI': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};

const statusOpcoes = [
  'Prox Atendimento', 'em atendimento', 'Gerar NF', 'NF Gerada', 
  'NF enviada', 'Aguardando Pagamento', 'Pagamento Atrasado', 'Pago'
]

const AtendimentoRow = ({ atendimento, handleExcluir, isSelected, toggleSelection, onViewDetails }) => {
  const dataAtendimentoFormatada = atendimento.data_atendimento ? new Date(atendimento.data_atendimento + 'T03:00:00Z').toLocaleDateString('pt-BR') : '';
  
  return (
    <tr className={`hover:bg-accent/50 transition-colors cursor-pointer ${isSelected ? 'bg-accent/50' : ''}`} onClick={() => onViewDetails(atendimento)}>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(atendimento.id)} /></td>
      <td className="px-3 py-3 text-sm">{dataAtendimentoFormatada}</td>
      <td className="px-3 py-3 text-sm font-medium">{atendimento.numero_os}</td>
      <td className="px-3 py-3 text-sm">{atendimento.nome_cliente}</td>
      <td className="px-3 py-3 text-sm"><span className={`px-2 py-1 rounded text-xs font-medium ${getPlataformaColorClass(atendimento.plataforma)}`}>{atendimento.plataforma}</span></td>
      <td className="px-3 py-3 text-sm font-bold text-green-500">{calcularValorLiquido(atendimento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td className="px-3 py-3 text-sm"><span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">{atendimento.status}</span></td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => onViewDetails(atendimento)}><Info className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleExcluir(atendimento.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </td>
    </tr>
  )
}

function Extrato({ atendimentos = [], setAtendimentos }) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [dataInicio, setDataInicio] = useState(firstDay);
  const [dataFim, setDataFim] = useState(lastDay);
  const [filtroPlataforma, setFiltroPlataforma] = useState('all');
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [atendimentoDetalhe, setAtendimentoDetalhe] = useState(null);
  const [isEditando, setIsEditando] = useState(false);
  const [atendimentoEditado, setAtendimentoEditado] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleExportar = () => {
    const dataStr = JSON.stringify(atendimentos, null, 2)
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
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result)
        if (Array.isArray(importedData)) {
          setAtendimentos(importedData) // Atualiza o App.jsx, que já dispara o salvamento no servidor!
          alert('Dados importados e sincronizados com sucesso!')
        } else {
          alert('O arquivo JSON precisa conter uma lista de atendimentos.')
        }
      } catch (error) {
        alert('Erro ao ler o arquivo: ' + error.message)
      }
    }
    reader.readAsText(file)
  }

  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter(atendimento => {
      const dataAtendimentoStr = atendimento.data_atendimento;
      const dataCorresponde = (!dataInicio || dataAtendimentoStr >= dataInicio) && (!dataFim || dataAtendimentoStr <= dataFim);
      const plataformaCorresponde = filtroPlataforma === 'all' || atendimento.plataforma === filtroPlataforma;
      const statusCorresponde = filtroStatus === 'all' || atendimento.status === filtroStatus;
      return dataCorresponde && plataformaCorresponde && statusCorresponde;
    }).sort((a, b) => new Date(a.data_atendimento) - new Date(b.data_atendimento));
  }, [atendimentos, dataInicio, dataFim, filtroPlataforma, filtroStatus]);

  const totalBrutoFiltrado = atendimentosFiltrados.reduce((acc, atendimento) => acc + calcularValorBruto(atendimento), 0);

  const handleExcluir = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este atendimento?')) {
      const novosDados = atendimentos.filter(att => att.id !== id);
      setAtendimentos(novosDados);
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === atendimentosFiltrados.length ? [] : atendimentosFiltrados.map(a => a.id));
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus) return;
    const novosDados = atendimentos.map(att => selectedIds.includes(att.id) ? { ...att, status: bulkStatus } : att);
    setAtendimentos(novosDados);
    setSelectedIds([]);
    setBulkStatus('');
  };

  const handleSalvarEdicao = () => {
    const novosDados = atendimentos.map(att => att.id === atendimentoEditado.id ? atendimentoEditado : att);
    setAtendimentos(novosDados);
    setAtendimentoDetalhe(atendimentoEditado);
    setIsEditando(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Extrato de Atendimentos</h1>
        <div className="flex space-x-2">
          <Button onClick={handleExportar} variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <input type="file" ref={fileInputRef} onChange={handleImportar} accept=".json" style={{ display: 'none' }} />
          <Button onClick={() => fileInputRef.current.click()} variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Importar</Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-6">
          <div className="space-y-2"><Label>Data Início</Label><Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
          <div className="space-y-2"><Label>Data Fim</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Select value={filtroPlataforma} onValueChange={setFiltroPlataforma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{plataformas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{statusOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex flex-col justify-end">
            <Label className="text-sm font-medium text-muted-foreground">Total Bruto</Label>
            <span className="text-2xl font-bold text-blue-500">{totalBrutoFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-3 text-left w-10"><Checkbox checked={atendimentosFiltrados.length > 0 && selectedIds.length === atendimentosFiltrados.length} onCheckedChange={toggleSelectAll} /></th>
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
                <AtendimentoRow key={atendimento.id} atendimento={atendimento} handleExcluir={handleExcluir} isSelected={selectedIds.includes(atendimento.id)} toggleSelection={toggleSelection} onViewDetails={(att) => { setAtendimentoDetalhe(att); setIsEditando(false); }} />
              ))
            ) : (
              <tr><td colSpan="8" className="px-3 py-8 text-center text-muted-foreground">Nenhum atendimento encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!atendimentoDetalhe} onOpenChange={(open) => !open && setAtendimentoDetalhe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex justify-between items-center pr-6">
              <DialogTitle>{isEditando ? 'Editar Atendimento' : 'Detalhes do Atendimento'}</DialogTitle>
              {!isEditando && <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setAtendimentoEditado({...atendimentoDetalhe}); setIsEditando(true); }}><Edit2 className="w-4 h-4 mr-2" /> Editar</Button>}
            </div>
          </DialogHeader>
          {atendimentoDetalhe && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {isEditando ? (
                <>
                  <div className="space-y-2"><Label>Data</Label><Input type="date" value={atendimentoEditado.data_atendimento} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, data_atendimento: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Número da OS</Label><Input value={atendimentoEditado.numero_os} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, numero_os: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Cliente</Label><Input value={atendimentoEditado.nome_cliente} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, nome_cliente: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Valor Chamado</Label><Input type="number" value={atendimentoEditado.valor_chamado} onChange={(e) => setAtendimentoEditado({...atendimentoEditado, valor_chamado: e.target.value})} /></div>
                </>
              ) : (
                <>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">OS</p><p className="font-bold text-lg">{atendimentoDetalhe.numero_os}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{atendimentoDetalhe.nome_cliente || 'Não informado'}</p></div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            {isEditando ? (
              <Button onClick={handleSalvarEdicao}>Salvar Alterações</Button>
            ) : (
              <Button variant="outline" onClick={() => setAtendimentoDetalhe(null)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

exports default Extrato; // (Mantenha export default Extrato)
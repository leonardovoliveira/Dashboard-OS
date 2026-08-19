import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, TrendingUp, Clock, DollarSign, FileText } from 'lucide-react'

function Relatorios({ atendimentos }) {
  // Obter anos disponíveis
  const anosDisponiveis = useMemo(() => {
    const anos = new Set()
    atendimentos.forEach(atendimento => {
      if (atendimento.data_atendimento) {
        const ano = atendimento.data_atendimento.substring(0, 4)
        anos.add(ano)
      }
    })
    // Adicionar o ano atual se não houver atendimentos
    if (anos.size === 0) {
      anos.add(new Date().getFullYear().toString())
    }
    return Array.from(anos).sort((a, b) => b - a)
  }, [atendimentos])

  const [anoSelecionado, setAnoSelecionado] = useState(
    anosDisponiveis.length > 0 ? anosDisponiveis[0] : new Date().getFullYear().toString()
  )

  // Função para calcular horas trabalhadas
  const calcularHoras = (checkin, checkout) => {
    if (!checkin || !checkout) return 0
    const [hIn, mIn] = checkin.split(':').map(Number)
    const [hOut, mOut] = checkout.split(':').map(Number)
    const totalMinutos = (hOut * 60 + mOut) - (hIn * 60 + mIn)
    return totalMinutos / 60
  }

  // Função para calcular valor bruto
  const calcularValorBruto = (atendimento) => {
    return (parseFloat(atendimento.valor_chamado) || 0) + (parseFloat(atendimento.ganhos_adicionais) || 0)
  }

  // Processar dados mensais
  const dadosMensais = useMemo(() => {
    const meses = {}
    
    // Inicializar todos os meses do ano selecionado
    for (let i = 1; i <= 12; i++) {
      const mesKey = `${anoSelecionado}-${String(i).padStart(2, '0')}`
      meses[mesKey] = {
        mes: new Date(parseInt(anoSelecionado), i - 1).toLocaleString('pt-BR', { month: 'long' }),
        mesNumero: i,
        quantidadeOS: 0,
        faturamentoTotal: 0,
        horasTrabalhadas: 0,
        atendimentos: []
      }
    }

    // Processar atendimentos do ano selecionado
    atendimentos.forEach(atendimento => {
      if (atendimento.data_atendimento && atendimento.data_atendimento.startsWith(anoSelecionado)) {
        const mesKey = atendimento.data_atendimento.substring(0, 7)
        if (meses[mesKey]) {
          const bruto = calcularValorBruto(atendimento)
          const horas = calcularHoras(atendimento.checkin, atendimento.checkout)
          
          meses[mesKey].quantidadeOS += 1
          meses[mesKey].faturamentoTotal += bruto
          meses[mesKey].horasTrabalhadas += horas
          meses[mesKey].atendimentos.push(atendimento)
        }
      }
    })

    // Calcular médias
    return Object.values(meses).map(mes => ({
      ...mes,
      valorMedioOS: mes.quantidadeOS > 0 ? mes.faturamentoTotal / mes.quantidadeOS : 0,
      valorMedioPorHora: mes.horasTrabalhadas > 0 ? mes.faturamentoTotal / mes.horasTrabalhadas : 0
    }))
  }, [atendimentos, anoSelecionado])

  // Calcular totais do ano
  const totaisAno = useMemo(() => {
    return dadosMensais.reduce((acc, mes) => ({
      quantidadeOS: acc.quantidadeOS + mes.quantidadeOS,
      faturamentoTotal: acc.faturamentoTotal + mes.faturamentoTotal,
      horasTrabalhadas: acc.horasTrabalhadas + mes.horasTrabalhadas
    }), { quantidadeOS: 0, faturamentoTotal: 0, horasTrabalhadas: 0 })
  }, [dadosMensais])

  const mediasAno = useMemo(() => {
    return {
      valorMedioOS: totaisAno.quantidadeOS > 0 ? totaisAno.faturamentoTotal / totaisAno.quantidadeOS : 0,
      valorMedioPorHora: totaisAno.horasTrabalhadas > 0 ? totaisAno.faturamentoTotal / totaisAno.horasTrabalhadas : 0
    }
  }, [totaisAno])

  return (
    <div className="reports-page space-y-6">
      <header className="reports-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="surface-label">Análise de desempenho</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Relatórios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Indicadores consolidados para acompanhar a evolução do seu trabalho.</p>
        </div>
        
        <div className="w-full sm:w-48">
          <p className="mb-2 surface-label">Ano de referência</p>
          <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
            <SelectTrigger className="reports-year-select h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map(ano => (
                <SelectItem key={ano} value={ano}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="reports-annual-band" aria-label="Visão anual selecionada">
        <div><p className="surface-label">Visão anual consolidada</p><h3>Desempenho em {anoSelecionado}</h3><p>Leitura operacional e financeira de todos os atendimentos registrados no período.</p></div>
        <div className="reports-annual-band-total"><span>Faturamento anual</span><strong>{totaisAno.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><small>{totaisAno.quantidadeOS} OS · {totaisAno.horasTrabalhadas.toFixed(1)} horas</small></div>
      </section>

      {/* Cards de resumo do ano */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">
        <Card className="reports-insight-card reports-insight-card-sky">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
            <span className="metric-icon bg-sky-500/12 text-sky-500"><FileText className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaisAno.quantidadeOS}</div>
            <p className="text-xs text-muted-foreground">no ano de {anoSelecionado}</p>
          </CardContent>
        </Card>

        <Card className="reports-insight-card reports-insight-card-emerald">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <span className="metric-icon bg-emerald-500/12 text-emerald-500"><DollarSign className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totaisAno.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">no ano de {anoSelecionado}</p>
          </CardContent>
        </Card>

        <Card className="reports-insight-card reports-insight-card-amber">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <span className="metric-icon bg-amber-500/12 text-amber-500"><Clock className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaisAno.horasTrabalhadas.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">no ano de {anoSelecionado}</p>
          </CardContent>
        </Card>

        <Card className="reports-insight-card reports-insight-card-violet">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio/OS</CardTitle>
            <span className="metric-icon bg-violet-500/12 text-violet-500"><TrendingUp className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediasAno.valorMedioOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">média do ano</p>
          </CardContent>
        </Card>

        <Card className="reports-insight-card reports-insight-card-indigo">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio/Hora</CardTitle>
            <span className="metric-icon bg-indigo-500/12 text-indigo-500"><Calendar className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediasAno.valorMedioPorHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">média do ano</p>
          </CardContent>
        </Card>
      </div>

      {/* Leitura por cartões em smartphones e tablets */}
      <div className="space-y-3 lg:hidden">
        {dadosMensais.map((mes) => (
          <Card key={mes.mesNumero} className={`reports-month-card ${mes.quantidadeOS === 0 ? 'is-empty' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="capitalize font-semibold">{mes.mes}</h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {mes.quantidadeOS} {mes.quantidadeOS === 1 ? 'OS' : 'OS'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="mt-1 font-semibold">{mes.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas</p>
                  <p className="mt-1 font-semibold">{mes.horasTrabalhadas.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Média por OS</p>
                  <p className="mt-1 font-semibold">{mes.valorMedioOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Média por hora</p>
                  <p className="mt-1 font-semibold">{mes.valorMedioPorHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="reports-year-total-card">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Total do Ano</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Atendimentos</p><p className="mt-1 font-bold">{totaisAno.quantidadeOS} OS</p></div>
              <div><p className="text-xs text-muted-foreground">Horas</p><p className="mt-1 font-bold">{totaisAno.horasTrabalhadas.toFixed(1)}h</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Faturamento total</p><p className="mt-1 text-lg font-bold text-primary">{totaisAno.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de relatórios mensais para telas amplas */}
      <Card className="reports-table-panel hidden overflow-hidden rounded-2xl lg:block">
        <CardHeader className="reports-table-header">
          <CardTitle>Relatório Mensal - {anoSelecionado}</CardTitle>
          <CardDescription>Dados agrupados por mês com estatísticas detalhadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="reports-table-head">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Mês
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade de OS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faturamento Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas Trabalhadas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Médio da OS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Médio por Hora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dadosMensais.map((mes, index) => (
                  <tr 
                    key={index} 
                    className={`reports-table-row ${mes.quantidadeOS > 0 ? 'has-data' : 'is-empty'}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground capitalize">
                      {mes.mes}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {mes.quantidadeOS > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {mes.quantidadeOS}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {mes.faturamentoTotal > 0 ? (
                        mes.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      ) : (
                        <span className="text-muted-foreground">R$ 0,00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {mes.horasTrabalhadas > 0 ? (
                        `${mes.horasTrabalhadas.toFixed(1)}h`
                      ) : (
                        <span className="text-muted-foreground">0h</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {mes.valorMedioOS > 0 ? (
                        mes.valorMedioOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      ) : (
                        <span className="text-muted-foreground">R$ 0,00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {mes.valorMedioPorHora > 0 ? (
                        mes.valorMedioPorHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      ) : (
                        <span className="text-muted-foreground">R$ 0,00</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="reports-table-total font-bold">
                  <td className="px-4 py-3 text-sm text-foreground">
                    Total do Ano
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                      {totaisAno.quantidadeOS}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-foreground">
                    {totaisAno.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-foreground">
                    {totaisAno.horasTrabalhadas.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-foreground">
                    {mediasAno.valorMedioOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-foreground">
                    {mediasAno.valorMedioPorHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights e observações */}
      {totaisAno.quantidadeOS > 0 && (
        <Card className="reports-insights-panel rounded-2xl">
          <CardHeader className="reports-insights-header">
            <CardTitle>Insights do Ano</CardTitle>
            <CardDescription>Análise automática dos dados de {anoSelecionado}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm text-foreground">
                  Você realizou <strong>{totaisAno.quantidadeOS}</strong> atendimentos em {anoSelecionado}, 
                  totalizando <strong>{totaisAno.horasTrabalhadas.toFixed(1)} horas</strong> de trabalho.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <p className="text-sm text-foreground">
                  O faturamento total do ano foi de <strong>
                    {totaisAno.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>, com valor médio de <strong>
                    {mediasAno.valorMedioOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong> por OS.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <p className="text-sm text-foreground">
                  Seu valor médio por hora trabalhada é de <strong>
                    {mediasAno.valorMedioPorHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Relatorios

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
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Relatórios Mensais</h2>
          <p className="mt-1 text-sm text-muted-foreground">Análise detalhada dos atendimentos agrupados por mês</p>
        </div>
        
        <div className="w-48">
          <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map(ano => (
                <SelectItem key={ano} value={ano}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de resumo do ano */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaisAno.quantidadeOS}</div>
            <p className="text-xs text-muted-foreground">no ano de {anoSelecionado}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totaisAno.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">no ano de {anoSelecionado}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaisAno.horasTrabalhadas.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">no ano de {anoSelecionado}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio/OS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediasAno.valorMedioOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">média do ano</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio/Hora</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediasAno.valorMedioPorHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">média do ano</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de relatórios mensais */}
      <Card>
        <CardHeader>
          <CardTitle>Relatório Mensal - {anoSelecionado}</CardTitle>
          <CardDescription>Dados agrupados por mês com estatísticas detalhadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-accent">
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
                    className={`hover:bg-accent/50 transition-colors ${
                      mes.quantidadeOS > 0 ? 'bg-background' : 'bg-accent/20 opacity-60'
                    }`}
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
                <tr className="border-t-2 border-border bg-accent/30 font-bold">
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
        <Card>
          <CardHeader>
            <CardTitle>Insights do Ano</CardTitle>
            <CardDescription>Análise automática dos dados de {anoSelecionado}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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

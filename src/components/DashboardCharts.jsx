import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function GraficoPorPlataforma({ faturamentoPorPlataforma }) {
  return (
    <Card className="dashboard-analytics-card analytics-card analytics-card-platform">
      <CardHeader className="analytics-card-header">
        <div><p className="analytics-card-eyebrow">Distribuição de receita</p><CardTitle>Faturamento por Plataforma</CardTitle></div>
        <span className="analytics-card-badge">{faturamentoPorPlataforma.length} plataformas</span>
      </CardHeader>
      <CardContent className="analytics-card-content">
        {faturamentoPorPlataforma.length > 0 ? (
          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoPorPlataforma}>
                <XAxis dataKey="plataforma" fontSize={10} interval="preserveStartEnd" />
                <YAxis />
                <Tooltip formatter={formatarMoeda} />
                <Legend />
                <Bar dataKey="faturamento" fill="#8e7bff" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhum faturamento registrado para este mês.</p>
        )}
      </CardContent>
    </Card>
  )
}

function GraficosMensais({ dadosMensais, anoExibicao }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="dashboard-analytics-card analytics-card">
        <CardHeader className="analytics-card-header">
          <div><p className="analytics-card-eyebrow">Comparativo anual</p><CardTitle>Faturamento Mensal</CardTitle></div>
          <span className="analytics-card-badge">{anoExibicao}</span>
        </CardHeader>
        <CardContent className="analytics-card-content">
          <p className="analytics-card-description">Comparação de faturamento bruto, despesas e saldo líquido.</p>
          <div className="analytics-chart-wrap analytics-chart-wrap-with-description">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosMensais}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis formatter={formatarMoeda} />
                <Tooltip formatter={formatarMoeda} />
                <Legend />
                <Line type="monotone" dataKey="faturamentoBruto" stroke="#9a87ff" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Faturamento Bruto" />
                <Line type="monotone" dataKey="despesas" stroke="#55d4b1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Despesas" />
                <Line type="monotone" dataKey="faturamentoLiquido" stroke="#ffc45c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Faturamento Líquido" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="dashboard-analytics-card analytics-card analytics-card-growth">
        <CardHeader className="analytics-card-header">
          <div><p className="analytics-card-eyebrow">Evolução do período</p><CardTitle>Faturamento Bruto</CardTitle></div>
          <span className="analytics-card-badge">mensal</span>
        </CardHeader>
        <CardContent className="analytics-card-content">
          <p className="analytics-card-description">Receita bruta acumulada ao longo do ano.</p>
          <div className="analytics-chart-wrap analytics-chart-wrap-with-description">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMensais}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis formatter={formatarMoeda} />
                <Tooltip formatter={formatarMoeda} />
                <Legend />
                <Bar dataKey="faturamentoBruto" fill="#8e7bff" radius={[7, 7, 0, 0]} name="Faturamento Bruto" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardCharts({ tipo, faturamentoPorPlataforma = [], dadosMensais = [], anoExibicao }) {
  if (tipo === 'plataforma') {
    return <GraficoPorPlataforma faturamentoPorPlataforma={faturamentoPorPlataforma} />
  }

  return <GraficosMensais dadosMensais={dadosMensais} anoExibicao={anoExibicao} />
}

export default DashboardCharts

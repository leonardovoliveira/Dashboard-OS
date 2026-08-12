import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function GraficoPorPlataforma({ faturamentoPorPlataforma }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento por Plataforma</CardTitle>
      </CardHeader>
      <CardContent>
        {faturamentoPorPlataforma.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faturamentoPorPlataforma}>
              <XAxis dataKey="plataforma" fontSize={10} interval="preserveStartEnd" />
              <YAxis />
              <Tooltip formatter={formatarMoeda} />
              <Legend />
              <Bar dataKey="faturamento" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
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
      <Card>
        <CardHeader>
          <CardTitle>Faturamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Comparação de faturamento bruto, despesas e líquido no ano de {anoExibicao}</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis formatter={formatarMoeda} />
              <Tooltip formatter={formatarMoeda} />
              <Legend />
              <Line type="monotone" dataKey="faturamentoBruto" stroke="#8884d8" name="Faturamento Bruto" />
              <Line type="monotone" dataKey="despesas" stroke="#82ca9d" name="Despesas" />
              <Line type="monotone" dataKey="faturamentoLiquido" stroke="#ffc658" name="Faturamento Líquido" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do Faturamento Bruto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Evolução do faturamento bruto ao longo dos meses</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis formatter={formatarMoeda} />
              <Tooltip formatter={formatarMoeda} />
              <Legend />
              <Bar dataKey="faturamentoBruto" fill="#8884d8" name="Faturamento Bruto" />
            </BarChart>
          </ResponsiveContainer>
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

/* global process */

import express from 'express'
import fs from 'fs'
import path from 'path'
import cors from 'cors'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

app.set('trust proxy', true)
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// No Linux de produção, defina DATA_PATH para apontar ao arquivo persistente.
// Sem a variável, o arquivo é gravado ao lado do servidor: <projeto>/chamados.json.
const DATA_FILE = path.resolve(process.env.DATA_PATH || path.join(__dirname, 'chamados.json'))

function lerChamados() {
  if (!fs.existsSync(DATA_FILE)) {
    return []
  }

  const conteudo = fs.readFileSync(DATA_FILE, 'utf8').trim()
  if (!conteudo) {
    return []
  }

  const chamados = JSON.parse(conteudo)
  if (!Array.isArray(chamados)) {
    throw new Error('O arquivo de chamados não contém uma lista válida')
  }

  return chamados
}

function salvarChamados(chamados) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })

  // A troca atômica reduz o risco de deixar um JSON incompleto em caso de interrupção.
  const arquivoTemporario = `${DATA_FILE}.tmp`
  fs.writeFileSync(arquivoTemporario, `${JSON.stringify(chamados, null, 2)}\n`, 'utf8')
  fs.renameSync(arquivoTemporario, DATA_FILE)
}

app.get('/api/chamados', (req, res) => {
  try {
    return res.json(lerChamados())
  } catch (error) {
    console.error('Erro ao ler chamados:', error)
    return res.status(500).json({ message: 'Não foi possível ler o arquivo de chamados no servidor.' })
  }
})

app.post('/api/chamados', (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ message: 'O corpo da requisição deve ser uma lista de chamados.' })
  }

  try {
    salvarChamados(req.body)
    return res.json({ success: true, message: 'Chamados salvos no servidor Linux.' })
  } catch (error) {
    console.error('Erro ao salvar chamados:', error)
    return res.status(500).json({ message: 'Não foi possível salvar o arquivo de chamados no servidor.' })
  }
})

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
  console.log(`Arquivo de chamados: ${DATA_FILE}`)
})

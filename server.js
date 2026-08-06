import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// Caminho onde o arquivo de dados JSON será salvo no seu servidor Linux
const DATA_FILE = process.env.DATA_PATH || path.join(__dirname, 'chamados.json');

// Rota para buscar os chamados
app.get('/api/chamados', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) {
        return res.json([]);
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
});

// Rota para salvar os chamados
app.post('/api/chamados', (req, res) => {
    const chamados = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify(chamados, null, 2));
    res.json({ success: true, message: 'Salvo com sucesso no servidor Linux!' });
});

// Servir os arquivos estáticos do seu app React após o build
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
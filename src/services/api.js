const API_URL = '/api/chamados'; // Como o Express vai servir o front e o back juntos, rota relativa funciona perfeitamente!

export async function fetchChamados() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro ao buscar chamados');
        return await response.json();
    } catch (error) {
        console.error("Usando fallback do localStorage devido a erro:", error);
        // Fallback opcional caso queira manter compatibilidade temporária
        return JSON.parse(localStorage.getItem('chamados') || '[]');
    }
}

export async function saveChamados(chamados) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chamados)
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao salvar no servidor, salvando no localStorage:", error);
        localStorage.setItem('chamados', JSON.stringify(chamados));
    }
}
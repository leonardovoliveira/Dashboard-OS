export async function getChamados() {
    try {
        const response = await fetch('/api/chamados');
        if (!response.ok) throw new Error('Erro ao buscar dados do servidor');
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar do servidor, usando localStorage:", error);
        const local = localStorage.getItem('chamados');
        return local ? JSON.parse(local) : [];
    }
}

export async function saveChamados(chamadosData) {
    try {
        const response = await fetch('/api/chamados', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chamadosData),
        });
        if (!response.ok) throw new Error('Erro ao salvar no servidor');
        return await response.json();
    } catch (error) {
        console.error("Erro ao salvar no servidor, salvando no localStorage:", error);
        localStorage.setItem('chamados', JSON.stringify(chamadosData));
    }
}
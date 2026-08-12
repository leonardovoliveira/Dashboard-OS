export async function getChamados() {
  const response = await fetch('/api/chamados', {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Erro ao buscar dados do servidor: ${response.status}`)
  }

  const chamados = await response.json()
  if (!Array.isArray(chamados)) {
    throw new Error('O servidor retornou um formato inválido de chamados')
  }

  return chamados
}

export async function saveChamados(chamadosData) {
  const response = await fetch('/api/chamados', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(chamadosData),
  })

  if (!response.ok) {
    throw new Error(`Erro ao salvar dados no servidor: ${response.status}`)
  }

  return response.json()
}

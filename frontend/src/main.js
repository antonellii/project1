import './style.css'

const API = 'http://localhost:8000/tarefas/'

async function api(path = '', options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`Erro ${res.status}`)
  return res.json()
}

function criarItem(tarefa) {
  const li = document.createElement('li')
  li.className = `item ${tarefa.concluida ? 'item--concluida' : ''}`
  li.dataset.id = tarefa.id

  li.innerHTML = `
    <input type="checkbox" class="item__check" ${tarefa.concluida ? 'checked' : ''} />
    <div class="item__texto">
      <span class="item__titulo">${tarefa.titulo}</span>
      ${tarefa.descricao ? `<span class="item__desc">${tarefa.descricao}</span>` : ''}
    </div>
    <button class="item__del" title="Remover">&#x2715;</button>
  `

  li.querySelector('.item__check').addEventListener('change', (e) => {
    alternar(tarefa.id, e.target.checked)
  })

  li.querySelector('.item__del').addEventListener('click', () => {
    deletar(tarefa.id)
  })

  return li
}

async function carregar() {
  const tarefas = await api()
  const lista = document.getElementById('lista-tarefas')
  const vazio = document.getElementById('vazio')
  lista.innerHTML = ''
  tarefas.forEach(t => lista.appendChild(criarItem(t)))
  vazio.hidden = tarefas.length > 0
}

async function criar(titulo, descricao) {
  await api('', {
    method: 'POST',
    body: JSON.stringify({ titulo, descricao: descricao || null }),
  })
  await carregar()
}

async function alternar(id, concluida) {
  await api(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ concluida }),
  })
  await carregar()
}

async function deletar(id) {
  await api(`/${id}`, { method: 'DELETE' })
  await carregar()
}

document.addEventListener('DOMContentLoaded', () => {
  carregar()

  document.getElementById('form-tarefa').addEventListener('submit', async (e) => {
    e.preventDefault()
    const titulo = document.getElementById('input-titulo').value.trim()
    const descricao = document.getElementById('input-descricao').value.trim()
    if (!titulo) return
    await criar(titulo, descricao)
    e.target.reset()
  })
})

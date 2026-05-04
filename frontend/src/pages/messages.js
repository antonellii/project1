import { get, post } from '../api.js'
import { avatarHtml } from './profile.js'

let activeConvId  = null
let currentUserId = null
let pollInterval  = null

export async function mount(container) {
  clearInterval(pollInterval)

  const me = await get('/users/me')
  currentUserId = me.id

  container.innerHTML = `
    <div class="chat-layout">
      <aside class="conv-panel">
        <div class="conv-header">
          <h2>Mensagens</h2>
          <button class="btn--icon" id="new-msg-btn" title="Nova mensagem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <div class="conv-list" id="conv-list">
          <p class="conv-empty">Carregando...</p>
        </div>
      </aside>

      <section class="chat-panel" id="chat-panel">
        <div class="chat-empty">
          <div class="placeholder-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1>Suas mensagens</h1>
          <p>Selecione uma conversa ou inicie uma nova.<br/>Você só pode enviar mensagens para quem segue.</p>
        </div>
      </section>
    </div>
  `

  await loadConversations()

  document.getElementById('new-msg-btn').addEventListener('click', () => openNewMsgModal())
}

async function loadConversations() {
  const list = document.getElementById('conv-list')
  if (!list) return

  try {
    const convs = await get('/messages/')
    if (convs.length === 0) {
      list.innerHTML = `<p class="conv-empty">Nenhuma conversa ainda.<br/>Siga alguém e inicie uma.</p>`
      return
    }
    list.innerHTML = convs.map(c => convItem(c)).join('')
    convs.forEach(c => {
      list.querySelector(`[data-id="${c.id}"]`)
        ?.addEventListener('click', () => openConversation(c.id, c.other_user))
    })
    if (activeConvId) {
      list.querySelector(`[data-id="${activeConvId}"]`)?.classList.add('active')
    }
  } catch {
    list.innerHTML = `<p class="conv-empty" style="color:#EF4444">Erro ao carregar.</p>`
  }
}

function convItem(c) {
  const preview = c.last_message
    ? c.last_message.length > 35 ? c.last_message.slice(0, 35) + '…' : c.last_message
    : 'Nenhuma mensagem ainda'
  const unread = c.unread_count > 0 ? `<span class="conv-badge">${c.unread_count}</span>` : ''

  return `
    <div class="conv-item ${activeConvId === c.id ? 'active' : ''}" data-id="${c.id}">
      ${avatarHtml(c.other_user)}
      <div class="conv-info">
        <div class="conv-name-row">
          <span class="conv-name">${c.other_user.display_name}</span>
          ${unread}
        </div>
        <span class="conv-preview">${preview}</span>
      </div>
    </div>
  `
}

async function openConversation(convId, otherUser) {
  clearInterval(pollInterval)
  activeConvId = convId

  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'))
  document.querySelector(`[data-id="${convId}"]`)?.classList.add('active')

  const panel = document.getElementById('chat-panel')

  panel.innerHTML = `
    <div class="chat-header">
      ${avatarHtml(otherUser)}
      <div>
        <p class="chat-header-name">${otherUser.display_name}</p>
        <a href="#user/${otherUser.username}" class="chat-header-user">@${otherUser.username}</a>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages">
      <p style="color:var(--text-muted); font-size:0.875rem; text-align:center">Carregando...</p>
    </div>
    <div class="chat-input-bar">
      <div class="chat-input-inner">
        <textarea class="chat-textarea" id="chat-input" placeholder="Escreva uma mensagem..." rows="1"></textarea>
        <button class="btn--send" id="send-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `

  await loadMessages(convId)

  const input  = document.getElementById('chat-input')
  const sendBtn= document.getElementById('send-btn')

  async function sendMessage() {
    const text = input.value.trim()
    if (!text) return
    input.value    = ''
    input.style.height = 'auto'
    sendBtn.disabled = true
    try {
      await post(`/messages/${convId}`, { content: text })
      await loadMessages(convId)
      await loadConversations()
    } finally {
      sendBtn.disabled = false
      input.focus()
    }
  }

  sendBtn.addEventListener('click', sendMessage)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  })
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = Math.min(input.scrollHeight, 120) + 'px'
  })

  pollInterval = setInterval(() => loadMessages(convId), 5000)
}

async function loadMessages(convId) {
  const box = document.getElementById('chat-messages')
  if (!box) { clearInterval(pollInterval); return }

  try {
    const msgs = await get(`/messages/${convId}`)
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60

    box.innerHTML = msgs.length === 0
      ? `<p class="chat-no-msgs">Nenhuma mensagem ainda. Diga olá! 👋</p>`
      : msgs.map(m => msgBubble(m)).join('')

    if (atBottom || msgs.at(-1)?.sender_id === currentUserId) {
      box.scrollTop = box.scrollHeight
    }
  } catch { clearInterval(pollInterval) }
}

function msgBubble(m) {
  const own  = m.sender_id === currentUserId
  const time = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `
    <div class="bubble-row ${own ? 'bubble-row--own' : ''}">
      <div class="bubble ${own ? 'bubble--own' : 'bubble--other'}">
        <span class="bubble-text">${escapeHtml(m.content)}</span>
        <span class="bubble-time">${time}</span>
      </div>
    </div>
  `
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')
}

async function openNewMsgModal() {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <h3>Nova mensagem</h3>
      <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem">
        Escolha alguém que você segue para iniciar uma conversa.
      </p>
      <div class="error-msg" id="new-msg-error"></div>
      <div id="following-list"><p style="color:var(--text-muted); font-size:0.9rem">Carregando...</p></div>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn btn--ghost btn--sm" id="cancel-new">Cancelar</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.querySelector('#cancel-new').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  try {
    const me      = await get('/users/me')
    const follows = await get(`/users/${me.username}/following`)
    const listEl  = overlay.querySelector('#following-list')

    if (follows.length === 0) {
      listEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem">Você ainda não segue ninguém.</p>`
      return
    }

    listEl.innerHTML = follows.map(u => `
      <div class="modal-user-row">
        <div class="modal-user-info">
          ${avatarHtml(u)}
          <div>
            <p class="user-card__name">${u.display_name}</p>
            <p class="user-card__username">@${u.username}</p>
          </div>
        </div>
        <button class="btn btn--follow btn--sm" data-username="${u.username}">Mensagem</button>
      </div>
    `).join('')

    listEl.querySelectorAll('[data-username]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = '...'
        try {
          const conv = await post(`/messages/?username=${btn.dataset.username}`, {})
          overlay.remove()
          await loadConversations()
          openConversation(conv.id, conv.other_user)
        } catch (err) {
          overlay.querySelector('#new-msg-error').textContent = err.message
          overlay.querySelector('#new-msg-error').classList.add('visible')
          btn.disabled = false; btn.textContent = 'Mensagem'
        }
      })
    })
  } catch {
    overlay.querySelector('#following-list').innerHTML =
      `<p style="color:#EF4444; font-size:0.9rem">Erro ao carregar.</p>`
  }
}

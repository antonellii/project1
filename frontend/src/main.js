import './style.css'
import { isLogged, clearToken } from './auth.js'
import { get, patch } from './api.js'

// ── Tema ──────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('lunar_theme', theme)
  document.querySelectorAll('.theme-dot').forEach(d => {
    d.classList.toggle('theme-dot--active', d.dataset.t === theme)
  })
}

function initTheme() {
  const saved = localStorage.getItem('lunar_theme') || 'light'
  document.documentElement.setAttribute('data-theme', saved)
}

initTheme()

export function moonLogo(size = 28) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"
        fill="#FFD234"/>
    </svg>
  `
}

const BELL_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`

const NAV = [
  {
    hash: 'home', label: 'Início',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  {
    hash: 'explore', label: 'Explorar',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  },
  {
    hash: 'publish', label: 'Publicar',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  },
  {
    hash: 'messages', label: 'Mensagens',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  },
  {
    hash: 'profile', label: 'Perfil',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
]

function sidebar(active) {
  const items = NAV.map(({ hash, label, icon }) => `
    <a href="#${hash}" class="nav-item ${active === hash ? 'active' : ''}">
      ${icon} ${label}
    </a>
  `).join('')

  return `
    <aside class="sidebar">
      <div class="sidebar__brand">
        ${moonLogo(30)}
        <span class="sidebar__brand-name">Lunar</span>
      </div>
      <nav class="sidebar__nav">${items}</nav>
      <button class="sidebar__logout" id="logout-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sair
      </button>
    </aside>
  `
}

function notificationText(n) {
  const name = n.from_user.display_name
  if (n.type === 'follow')  return `<strong>${name}</strong> começou a te seguir`
  if (n.type === 'message') return `<strong>${name}</strong> te enviou uma mensagem`
  if (n.type === 'post')    return `<strong>${name}</strong> fez uma nova publicação`
  return `<strong>${name}</strong> interagiu com você`
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)   return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

let notifOpen = false

async function setupNotifications() {
  const btn   = document.getElementById('notif-btn')
  const badge = document.getElementById('notif-badge')
  const panel = document.getElementById('notif-panel')
  if (!btn) return

  async function refreshBadge() {
    try {
      const { count } = await get('/notifications/unread-count')
      badge.textContent = count > 0 ? (count > 9 ? '9+' : count) : ''
      badge.style.display = count > 0 ? 'flex' : 'none'
    } catch {}
  }

  await refreshBadge()
  setInterval(refreshBadge, 30000)

  btn.addEventListener('click', async (e) => {
    e.stopPropagation()
    notifOpen = !notifOpen
    panel.classList.toggle('notif-panel--open', notifOpen)

    if (notifOpen) {
      panel.innerHTML = `<p class="notif-loading">Carregando...</p>`
      try {
        const notifs = await get('/notifications/')
        await patch('/notifications/read', {})
        badge.style.display = 'none'
        badge.textContent = ''

        if (notifs.length === 0) {
          panel.innerHTML = `<p class="notif-empty">Nenhuma notificação ainda.</p>`
          return
        }

        panel.innerHTML = notifs.map(n => `
          <div class="notif-item ${n.read ? '' : 'notif-item--unread'}">
            <div class="avatar notif-avatar">${n.from_user.display_name[0].toUpperCase()}</div>
            <div class="notif-body">
              <p class="notif-text">${notificationText(n)}</p>
              <span class="notif-time">${timeAgo(n.created_at)}</span>
            </div>
          </div>
        `).join('')
      } catch {
        panel.innerHTML = `<p class="notif-empty" style="color:#EF4444">Erro ao carregar.</p>`
      }
    }
  })

  document.addEventListener('click', (e) => {
    if (notifOpen && !panel.contains(e.target) && e.target !== btn) {
      notifOpen = false
      panel.classList.remove('notif-panel--open')
    }
  })
}

async function navigate() {
  const app  = document.getElementById('app')
  const raw  = location.hash.slice(1) || 'home'
  const [hash, param] = raw.split('/')

  if (!isLogged()) {
    const page = hash === 'register' ? 'register' : 'login'
    const { mount } = await import(`./pages/${page}.js`)
    mount(app)
    return
  }

  const activeNav    = ['home','explore','publish','messages','profile'].includes(hash) ? hash : ''
  const isFullLayout = hash === 'messages'
  const currentTheme = localStorage.getItem('lunar_theme') || 'light'

  app.innerHTML = `
    <div class="layout">
      ${sidebar(activeNav)}
      <main class="${isFullLayout ? 'content--full' : 'content'}" id="page-content"></main>
      <div class="notif-wrapper">
        <button class="notif-btn" id="notif-btn" title="Notificações">
          ${BELL_ICON}
          <span class="notif-badge" id="notif-badge" style="display:none"></span>
        </button>
        <div class="notif-panel" id="notif-panel"></div>
      </div>
      ${isFullLayout ? '' : `
      <div class="theme-switcher">
        <span class="theme-label">Tema</span>
        <div class="theme-dots">
          <button class="theme-dot theme-dot--light ${currentTheme === 'light' ? 'theme-dot--active' : ''}" data-t="light" title="Claro"></button>
          <button class="theme-dot theme-dot--dark  ${currentTheme === 'dark'  ? 'theme-dot--active' : ''}" data-t="dark"  title="Escuro"></button>
        </div>
      </div>`}
    </div>
  `

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearToken()
    location.hash = 'login'
  })

  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => applyTheme(dot.dataset.t))
  })

  notifOpen = false
  await setupNotifications()

  const content = document.getElementById('page-content')
  const pages   = { home: 'home', explore: 'explore', publish: 'publish', messages: 'messages', profile: 'profile', user: 'profile' }
  const target  = pages[hash] || 'home'

  const { mount } = await import(`./pages/${target}.js`)
  mount(content, param || null)
}

window.addEventListener('hashchange', navigate)
document.addEventListener('DOMContentLoaded', navigate)

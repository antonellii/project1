import { get } from '../api.js'

const API_BASE = 'http://localhost:8000'

export async function mount(container) {
  container.innerHTML = `
    <div class="home-header">
      <h1>Início</h1>
      <p>Posts de quem você segue</p>
    </div>
    <div id="feed"></div>
  `

  try {
    const posts = await get('/posts/feed')
    const feed  = document.getElementById('feed')

    if (posts.length === 0) {
      feed.innerHTML = `
        <div class="page-placeholder">
          <div class="placeholder-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1>Seu feed está vazio</h1>
          <p>Siga pessoas para ver as publicações delas aqui.</p>
        </div>
      `
      return
    }

    feed.className = 'feed-grid'
    feed.innerHTML = posts.map(p => {
      const img = p.image_url
        ? `<img class="feed-card__cover" src="${API_BASE}${p.image_url}" alt="${p.title}" />`
        : `<div class="feed-card__cover feed-card__cover--empty">🌙</div>`
      const avatar = p.author_avatar
        ? `<img class="avatar avatar--img" src="${API_BASE}${p.author_avatar}" alt="${p.author_name}" />`
        : `<div class="avatar">${p.author_name[0].toUpperCase()}</div>`

      return `
        <div class="feed-card">
          ${img}
          <div class="feed-card__body">
            <p class="feed-card__title">${p.title}</p>
            ${p.caption ? `<p class="feed-card__caption">${p.caption}</p>` : ''}
            <div class="feed-card__user">
              ${avatar}
              <a href="#user/${p.author_user}" class="feed-card__name">${p.author_name}</a>
            </div>
          </div>
        </div>
      `
    }).join('')
  } catch {
    document.getElementById('feed').innerHTML =
      `<p style="color:var(--text-muted)">Erro ao carregar o feed.</p>`
  }
}

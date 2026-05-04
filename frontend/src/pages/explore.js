import { get, post, del } from '../api.js'

let activeFilter = 'geral'

export async function mount(container) {
  container.innerHTML = `
    <div class="explore-header">
      <h1>Explorar</h1>
      <div class="filter-bar">
        <button class="filter-btn active" data-filter="geral">Geral</button>
        <button class="filter-btn" data-filter="perfis">Perfis</button>
        <button class="filter-btn" data-filter="postagens">Postagens</button>
      </div>
      <div class="search-bar">
        <input class="input" type="text" id="search-input" placeholder="Buscar..." />
        <button class="btn--search" id="search-btn">Buscar</button>
      </div>
    </div>

    <div id="search-results"></div>

    <div class="page-placeholder" id="explore-placeholder">
      <div class="placeholder-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <h1>Explorar</h1>
      <p>Comece a explorar para receber sugestões e resultados.<br/>Busque por perfis, postagens ou palavras-chave.</p>
    </div>
  `

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      activeFilter = btn.dataset.filter
      const q = document.getElementById('search-input').value.trim()
      if (q) runSearch(q)
    })
  })

  document.getElementById('search-btn').addEventListener('click', () => {
    const q = document.getElementById('search-input').value.trim()
    if (q) runSearch(q)
  })

  document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('search-btn').click()
  })
}

async function runSearch(q) {
  const resultsEl     = document.getElementById('search-results')
  const placeholder   = document.getElementById('explore-placeholder')
  if (placeholder) placeholder.style.display = 'none'

  if (activeFilter === 'postagens') {
    resultsEl.innerHTML = `
      <div class="search-empty">
        <p>🌙</p>
        <p>Busca de postagens estará disponível em breve.</p>
      </div>
    `
    return
  }

  // geral = perfis por enquanto (postagens ainda não implementadas)
  if (activeFilter === 'geral') {
    resultsEl.innerHTML = `<p class="search-loading">Buscando...</p>`
    try {
      const users = await get(`/users/search?q=${encodeURIComponent(q)}`)
      resultsEl.innerHTML = users.length === 0
        ? `<div class="search-empty"><p>🌙</p><p>Nenhum resultado para "<strong>${q}</strong>".</p></div>`
        : `<p class="search-count">${users.length} perfil${users.length > 1 ? 'is' : ''} encontrado${users.length > 1 ? 's' : ''}</p>
           <div class="user-list" id="user-list">${users.map(u => userCard(u)).join('')}</div>`
      if (users.length) bindFollowButtons()
    } catch {
      resultsEl.innerHTML = `<p class="search-loading" style="color:#EF4444">Erro ao buscar.</p>`
    }
    return
  }

  resultsEl.innerHTML = `<p class="search-loading">Buscando perfis...</p>`

  try {
    const users = await get(`/users/search?q=${encodeURIComponent(q)}`)

    if (users.length === 0) {
      resultsEl.innerHTML = `
        <div class="search-empty">
          <p>🌙</p>
          <p>Nenhum perfil encontrado para "<strong>${q}</strong>".</p>
        </div>
      `
      return
    }

    resultsEl.innerHTML = `
      <p class="search-count">${users.length} perfil${users.length > 1 ? 'is' : ''} encontrado${users.length > 1 ? 's' : ''}</p>
      <div class="user-list" id="user-list"></div>
    `

    document.getElementById('user-list').innerHTML = users.map(u => userCard(u)).join('')
    bindFollowButtons()

  } catch {
    resultsEl.innerHTML = `<p class="search-loading" style="color:#EF4444">Erro ao buscar. Tente novamente.</p>`
  }
}

function userCard(u) {
  const initial = u.display_name[0].toUpperCase()
  const followBtn = u.is_following
    ? `<button class="btn btn--following btn--sm" data-username="${u.username}" data-action="unfollow">Seguindo</button>`
    : `<button class="btn btn--follow btn--sm"    data-username="${u.username}" data-action="follow">Seguir</button>`

  return `
    <div class="user-card">
      <a href="#user/${u.username}" class="user-card__info">
        <div class="avatar">${initial}</div>
        <div>
          <p class="user-card__name">${u.display_name}</p>
          <p class="user-card__username">@${u.username}</p>
          ${u.bio ? `<p class="user-card__bio">${u.bio}</p>` : ''}
          <p class="user-card__stats">${u.followers_count} seguidores</p>
        </div>
      </a>
      <div class="user-card__action">${followBtn}</div>
    </div>
  `
}

function bindFollowButtons() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      const username = btn.dataset.username
      const action   = btn.dataset.action

      btn.disabled = true
      try {
        if (action === 'follow') {
          await post(`/users/${username}/follow`, {})
          btn.textContent   = 'Seguindo'
          btn.dataset.action = 'unfollow'
          btn.className     = 'btn btn--following btn--sm'
        } else {
          await del(`/users/${username}/follow`)
          btn.textContent   = 'Seguir'
          btn.dataset.action = 'follow'
          btn.className     = 'btn btn--follow btn--sm'
        }
      } catch {
        btn.textContent = 'Erro'
      } finally {
        btn.disabled = false
      }
    })
  })
}

import { get } from '../api.js'

export async function mount(container) {
  container.innerHTML = `
    <div class="home-header">
      <h1>Início</h1>
      <p>Veja o que está acontecendo no Lunar</p>
    </div>
    <div class="feed-placeholder" id="feed"></div>
  `

  try {
    const user = await get('/users/me')
    const posts = await get(`/users/${user.username}/posts`)

    const feed = document.getElementById('feed')

    if (posts.length === 0) {
      feed.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:3rem 0; color:var(--text-muted)">
          <p style="font-size:2rem; margin-bottom:0.5rem">🌙</p>
          <p>Seu feed está vazio por enquanto.</p>
          <p style="font-size:0.875rem">Quando posts forem criados, aparecerão aqui.</p>
        </div>
      `
    } else {
      feed.innerHTML = posts.map(p => `
        <div class="feed-card">
          <div class="feed-card__img">🌙</div>
          <div class="feed-card__user">
            <div class="avatar">${user.display_name[0].toUpperCase()}</div>
            <span class="feed-card__name">${user.display_name}</span>
          </div>
          ${p.caption ? `<p style="font-size:0.9rem">${p.caption}</p>` : ''}
        </div>
      `).join('')
    }
  } catch {
    document.getElementById('feed').innerHTML =
      `<p style="color:var(--text-muted)">Erro ao carregar o feed.</p>`
  }
}

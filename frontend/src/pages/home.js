import { get, post, del, api } from '../api.js'
import { buildCarousel } from '../carousel.js'

const API_BASE = 'http://localhost:8000'
const STYLE_LABEL = { visual: 'Visual', digital: 'Digital', '3d': '3D' }

function registerView(postId) {
  post(`/posts/${postId}/view`, {}).catch(() => {})
}

function catBadge(art_style) {
  if (!art_style) return ''
  return `<span class="masonry-cat-badge">${STYLE_LABEL[art_style] || art_style}</span>`
}

function renderComment(c) {
  const avatar = c.author_avatar
    ? `<img class="avatar avatar--img" src="${API_BASE}${c.author_avatar}" style="width:28px;height:28px" />`
    : `<div class="avatar" style="width:28px;height:28px;font-size:0.7rem;flex-shrink:0">${c.author_name[0].toUpperCase()}</div>`
  return `
    <div class="comment-row">
      ${avatar}
      <div class="comment-body">
        <span class="comment-author">${c.author_name}</span>
        <span class="comment-text">${c.content}</span>
      </div>
    </div>
  `
}

async function openPostModal(p) {
  registerView(p.id)

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'

  const carouselEl = buildCarousel(p.images || (p.image_url ? [p.image_url] : []))

  const avatar = p.author_avatar
    ? `<img class="avatar avatar--img" src="${API_BASE}${p.author_avatar}" style="width:36px;height:36px" />`
    : `<div class="avatar" style="width:36px;height:36px;font-size:0.9rem">${p.author_name[0].toUpperCase()}</div>`

  overlay.innerHTML = `
    <div class="modal modal--post" style="max-width:680px">
      <button class="modal-close--abs" id="modal-close-btn">✕</button>
      <div id="modal-carousel-slot"></div>
      <div class="post-modal__title-row">
        <span class="post-modal__title-text">${p.title}</span>
        ${catBadge(p.art_style)}
      </div>
      <div class="post-modal__body">
        <div class="post-modal__header">
          ${avatar}
          <div style="flex:1;min-width:0">
            <a href="#user/${p.author_user}" class="feed-card__name" style="font-size:0.925rem;font-weight:700">${p.author_name}</a>
            <p style="font-size:0.8rem;color:var(--text-muted)">@${p.author_user}</p>
          </div>
          ${!p.is_own_post ? `<button type="button" class="btn btn--follow btn--sm" id="modal-follow-btn" style="flex-shrink:0">Seguir</button>` : ''}
          <span style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;margin-left:0.5rem">${(p.views || 0).toLocaleString()} views</span>
        </div>
        ${p.caption ? `<p class="post-modal__caption">${p.caption}</p>` : ''}

        <div class="post-modal__actions">
          <button type="button" class="post-action-btn ${p.liked_by_me ? 'post-action-btn--liked' : ''}" id="like-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${p.liked_by_me ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span id="like-count" style="pointer-events:none">${p.likes_count || 0}</span>
          </button>
          <span class="post-modal__comment-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span id="comment-count">${p.comments_count || 0}</span>
          </span>
        </div>

        <div class="post-comments" id="post-comments">
          <div class="comments-list" id="comments-list">
            <p style="font-size:0.82rem;color:var(--text-muted)">Carregando comentários…</p>
          </div>
          <div class="comment-input-row">
            <textarea class="input comment-input" id="comment-input" placeholder="Escreva um comentário…" maxlength="1000" rows="1"></textarea>
            <button class="btn btn--primary btn--sm comment-submit-btn" id="comment-submit">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.getElementById('modal-carousel-slot').appendChild(carouselEl)

  // Fecha ao clicar fora ou no X
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.id === 'modal-close-btn') overlay.remove()
  })

  // Botão de seguir
  if (!p.is_own_post) {
    const followBtn = document.getElementById('modal-follow-btn')
    get(`/users/${p.author_user}`).then(profile => {
      if (profile.is_following) {
        followBtn.textContent = 'Seguindo'
        followBtn.className   = 'btn btn--following btn--sm'
      }
    }).catch(() => {})

    followBtn.addEventListener('click', async (e) => {
      e.stopPropagation()
      followBtn.disabled = true
      const following = followBtn.classList.contains('btn--following')
      try {
        if (following) {
          await del(`/users/${p.author_user}/follow`)
          followBtn.textContent = 'Seguir'
          followBtn.className   = 'btn btn--follow btn--sm'
        } else {
          await post(`/users/${p.author_user}/follow`, {})
          followBtn.textContent = 'Seguindo'
          followBtn.className   = 'btn btn--following btn--sm'
        }
      } catch {}
      followBtn.disabled = false
    })
  }

  // Carrega comentários
  const listEl = document.getElementById('comments-list')
  try {
    const comments = await get(`/posts/${p.id}/comments`)
    listEl.innerHTML = comments.length
      ? comments.map(renderComment).join('')
      : `<p style="font-size:0.82rem;color:var(--text-muted)">Nenhum comentário ainda. Seja o primeiro!</p>`
  } catch {
    listEl.innerHTML = `<p style="font-size:0.82rem;color:#EF4444">Erro ao carregar comentários.</p>`
  }

  // Like
  let liked = p.liked_by_me
  const likeBtn   = document.getElementById('like-btn')
  const likeCount = document.getElementById('like-count')

  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation()
    likeBtn.disabled = true
    try {
      const res = await post(`/posts/${p.id}/like`, {})
      liked = res.liked
      likeCount.textContent = res.likes_count
      likeBtn.classList.toggle('post-action-btn--liked', liked)
      likeBtn.querySelector('svg').setAttribute('fill', liked ? 'currentColor' : 'none')
    } catch (err) {
      console.error('Like falhou:', err)
    } finally {
      likeBtn.disabled = false
    }
  })

  // Comentar
  const input  = document.getElementById('comment-input')
  const submit = document.getElementById('comment-submit')
  const countEl= document.getElementById('comment-count')

  submit.addEventListener('click', async () => {
    const text = input.value.trim()
    if (!text) return
    submit.disabled = true
    try {
      const c = await post(`/posts/${p.id}/comments`, { content: text })
      if (listEl.querySelector('p')) listEl.innerHTML = ''
      listEl.innerHTML += renderComment(c)
      listEl.scrollTop = listEl.scrollHeight
      input.value = ''
      countEl.textContent = parseInt(countEl.textContent || '0') + 1
    } catch {}
    submit.disabled = false
  })

  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = input.scrollHeight + 'px'
  })
}

function buildCard(p) {
  const div = document.createElement('div')

  if (p.image_url) {
    div.className = 'masonry-card'
    const thumbBadge = p.art_style
      ? `<span class="masonry-thumb-badge">${STYLE_LABEL[p.art_style] || p.art_style}</span>`
      : ''
    div.innerHTML = `
      <div class="masonry-card__img-wrap">
        <img class="masonry-card__img" src="${API_BASE}${p.image_url}" alt="${p.title}" loading="lazy" />
        ${thumbBadge}
        <div class="masonry-card__overlay">
          <div class="masonry-card__author">
            ${p.author_avatar
              ? `<img class="masonry-card__avatar avatar--img" src="${API_BASE}${p.author_avatar}" />`
              : `<div class="masonry-card__avatar-letter">${p.author_name[0].toUpperCase()}</div>`}
            <span class="masonry-card__author-name">${p.author_name}</span>
          </div>
          <span class="masonry-card__views">${(p.views || 0).toLocaleString()}</span>
        </div>
      </div>
      <div class="masonry-card__info">
        <p class="masonry-card__title">${p.title}</p>
        <div class="masonry-card__stats">
          <span>♥ ${p.likes_count || 0}</span>
          <span>💬 ${p.comments_count || 0}</span>
        </div>
      </div>
    `
  } else {
    div.className = 'masonry-card masonry-card--text'
    div.innerHTML = `
      <div class="masonry-card__title-row">
        <p class="masonry-card__title">${p.title}</p>
        ${catBadge(p.art_style)}
      </div>
      ${p.caption ? `<p class="masonry-card__caption">${p.caption.slice(0, 120)}${p.caption.length > 120 ? '…' : ''}</p>` : ''}
      <div class="masonry-card__text-footer">
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted)">${p.author_name}</span>
        <span style="font-size:0.75rem;color:var(--text-muted)">♥ ${p.likes_count || 0} · 💬 ${p.comments_count || 0}</span>
      </div>
    `
  }

  div.addEventListener('click', () => openPostModal(p))
  return div
}

function buildEmptyCard(msg, icon) {
  const div = document.createElement('div')
  div.className = 'masonry-empty-col'
  div.innerHTML = `<div style="font-size:1.6rem">${icon}</div><p>${msg}</p>`
  return div
}

function fillColumn(col, posts) {
  posts.forEach(p => col.appendChild(buildCard(p)))
}

export async function mount(container) {
  container.innerHTML = `
    <div class="masonry-home" id="masonry-home">
      <div class="masonry-col">
        <div class="masonry-col-header">
          <span class="masonry-col-icon">👥</span>
          <span class="masonry-col-label">Seguindo</span>
        </div>
        <div class="masonry-col-body" id="col1-body"><div class="masonry-loading">Carregando…</div></div>
      </div>
      <div class="masonry-col">
        <div class="masonry-col-header">
          <span class="masonry-col-icon">🎨</span>
          <span class="masonry-col-label">Seus interesses</span>
        </div>
        <div class="masonry-col-body" id="col2-body"><div class="masonry-loading">Carregando…</div></div>
      </div>
      <div class="masonry-col">
        <div class="masonry-col-header">
          <span class="masonry-col-icon">✨</span>
          <span class="masonry-col-label">Mais arte</span>
        </div>
        <div class="masonry-col-body" id="col3-body"><div class="masonry-loading">Carregando…</div></div>
      </div>
      <div class="masonry-col">
        <div class="masonry-col-header">
          <span class="masonry-col-icon">🔥</span>
          <span class="masonry-col-label">Em Alta</span>
        </div>
        <div class="masonry-col-body" id="col4-body"><div class="masonry-loading">Carregando…</div></div>
      </div>
    </div>
  `

  const [feedPosts, interestPosts, trendingPosts] = await Promise.all([
    get('/posts/feed').catch(() => []),
    get('/posts/by-interest?limit=60').catch(() => []),
    get('/posts/trending?limit=40').catch(() => []),
  ])

  const col1 = document.getElementById('col1-body')
  const col2 = document.getElementById('col2-body')
  const col3 = document.getElementById('col3-body')
  const col4 = document.getElementById('col4-body')
  col1.innerHTML = col2.innerHTML = col3.innerHTML = col4.innerHTML = ''

  feedPosts.length
    ? fillColumn(col1, feedPosts)
    : col1.appendChild(buildEmptyCard('Siga alguém para ver posts aqui.', '👥'))

  const half = Math.ceil(interestPosts.length / 2)
  if (interestPosts.length === 0) {
    col2.appendChild(buildEmptyCard('Configure seus interesses ao criar conta.', '🎨'))
    col3.appendChild(buildEmptyCard('Você pode editar seus interesses no perfil.', '✨'))
  } else {
    fillColumn(col2, interestPosts.slice(0, half))
    fillColumn(col3, interestPosts.slice(half))
    if (interestPosts.length < 2) col3.appendChild(buildEmptyCard('Mais posts aparecerão aqui.', '✨'))
  }

  trendingPosts.length
    ? fillColumn(col4, trendingPosts)
    : col4.appendChild(buildEmptyCard('Nenhum post popular ainda.', '🔥'))
}

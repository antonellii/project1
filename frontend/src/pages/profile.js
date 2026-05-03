import { get, patch, post, del } from '../api.js'

export async function mount(container, username = null) {
  container.innerHTML = `<p style="color:var(--text-muted); padding:2rem 0">Carregando perfil...</p>`

  try {
    const me    = await get('/users/me')
    const isOwn = !username || username === me.username
    const target = isOwn ? me.username : username

    const [profile, posts] = await Promise.all([
      get(`/users/${target}`),
      get(`/users/${target}/posts`),
    ])

    renderProfile(container, profile, posts, isOwn)
  } catch {
    container.innerHTML = `<p style="color:var(--text-muted)">Erro ao carregar o perfil.</p>`
  }
}

function renderProfile(container, user, posts, isOwn) {
  const initial    = user.display_name[0].toUpperCase()
  const joinedYear = new Date(user.created_at).getFullYear()

  const actionBtn = isOwn
    ? `<button class="btn btn--ghost btn--sm" id="edit-btn">Editar perfil</button>`
    : user.is_following
      ? `<button class="btn btn--following" id="follow-btn" data-username="${user.username}" data-action="unfollow">Seguindo</button>`
      : `<button class="btn btn--follow"    id="follow-btn" data-username="${user.username}" data-action="follow">Seguir</button>`

  container.innerHTML = `
    <div class="profile-header">
      <div class="avatar avatar--lg">${initial}</div>
      <div class="profile-info">
        <h1 class="profile-display-name">${user.display_name}</h1>
        <p class="profile-username">@${user.username}</p>
        <div class="profile-stats">
          <button class="stat-btn" id="btn-followers">
            <strong>${user.followers_count}</strong> seguidores
          </button>
          <button class="stat-btn" id="btn-following">
            <strong>${user.following_count}</strong> seguindo
          </button>
        </div>
        <p class="profile-bio">${user.bio || '<span style="font-style:italic;color:var(--text-muted)">Sem bio ainda.</span>'}</p>
        <p class="profile-meta">Membro desde ${joinedYear}</p>
        <div style="margin-top:1rem">${actionBtn}</div>
      </div>
    </div>

    <p class="profile-posts-title">Posts</p>
    <div class="posts-grid">
      ${posts.length === 0
        ? `<div class="posts-empty">
             <p style="font-size:2rem">🌙</p>
             <p>${isOwn ? 'Você ainda não tem posts.' : 'Nenhum post ainda.'}</p>
           </div>`
        : posts.map(() => `<div class="post-tile">🌙</div>`).join('')
      }
    </div>
  `

  document.getElementById('btn-followers').addEventListener('click', () =>
    openUserListModal('Seguidores', `/users/${user.username}/followers`)
  )
  document.getElementById('btn-following').addEventListener('click', () =>
    openUserListModal('Seguindo', `/users/${user.username}/following`)
  )

  if (isOwn) {
    document.getElementById('edit-btn').addEventListener('click', () => openEditModal(user, container))
  } else {
    document.getElementById('follow-btn').addEventListener('click', async () => {
      const el     = document.getElementById('follow-btn')
      const action = el.dataset.action
      el.disabled  = true

      try {
        if (action === 'follow') {
          await post(`/users/${user.username}/follow`, {})
          el.textContent    = 'Seguindo'
          el.dataset.action = 'unfollow'
          el.className      = 'btn btn--following'
        } else {
          await del(`/users/${user.username}/follow`)
          el.textContent    = 'Seguir'
          el.dataset.action = 'follow'
          el.className      = 'btn btn--follow'
        }
        const updated = await get(`/users/${user.username}`)
        document.getElementById('btn-followers').innerHTML = `<strong>${updated.followers_count}</strong> seguidores`
        document.getElementById('btn-following').innerHTML = `<strong>${updated.following_count}</strong> seguindo`
      } catch {
        el.textContent = 'Erro'
      } finally {
        el.disabled = false
      }
    })
  }
}

async function openUserListModal(title, endpoint) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal modal--list">
      <div class="modal-list-header">
        <h3>${title}</h3>
        <button class="modal-close" id="close-list">&times;</button>
      </div>
      <div class="modal-list-body" id="modal-list-body">
        <p style="color:var(--text-muted); font-size:0.9rem">Carregando...</p>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.querySelector('#close-list').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  try {
    const users = await get(endpoint)
    const body  = overlay.querySelector('#modal-list-body')

    if (users.length === 0) {
      body.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:1.5rem 0">Nenhum usuário ainda.</p>`
      return
    }

    body.innerHTML = users.map(u => `
      <div class="modal-user-row">
        <a href="#user/${u.username}" class="modal-user-info" onclick="document.querySelector('.modal-overlay').remove()">
          <div class="avatar">${u.display_name[0].toUpperCase()}</div>
          <div>
            <p class="user-card__name">${u.display_name}</p>
            <p class="user-card__username">@${u.username}</p>
          </div>
        </a>
        ${u.is_following
          ? `<button class="btn btn--following btn--sm" data-username="${u.username}" data-action="unfollow">Seguindo</button>`
          : `<button class="btn btn--follow    btn--sm" data-username="${u.username}" data-action="follow">Seguir</button>`
        }
      </div>
    `).join('')

    body.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action   = btn.dataset.action
        const username = btn.dataset.username
        btn.disabled   = true
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
  } catch {
    overlay.querySelector('#modal-list-body').innerHTML =
      `<p style="color:#EF4444; font-size:0.9rem">Erro ao carregar a lista.</p>`
  }
}

function openEditModal(user, container) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <h3>Editar perfil</h3>
      <div class="error-msg" id="edit-error"></div>
      <div class="field">
        <label>Nome de exibição</label>
        <input class="input" id="edit-name" value="${user.display_name}" maxlength="100" />
      </div>
      <div class="field">
        <label>Bio</label>
        <textarea class="textarea" id="edit-bio" maxlength="500">${user.bio || ''}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn--ghost btn--sm" id="cancel-edit">Cancelar</button>
        <button class="btn btn--primary btn--sm" id="save-edit" style="width:auto">Salvar</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.querySelector('#cancel-edit').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  overlay.querySelector('#save-edit').addEventListener('click', async () => {
    const errEl = overlay.querySelector('#edit-error')
    errEl.classList.remove('visible')
    try {
      await patch('/users/me', {
        display_name: overlay.querySelector('#edit-name').value,
        bio:          overlay.querySelector('#edit-bio').value || null,
      })
      overlay.remove()
      mount(container, null)
    } catch (err) {
      errEl.textContent = err.message
      errEl.classList.add('visible')
    }
  })
}

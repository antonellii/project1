import { get, patch, post, del } from '../api.js'

const API_BASE = 'http://localhost:8000'

export function avatarHtml(user, cls = 'avatar') {
  if (user.avatar_url) {
    return `<img class="${cls} avatar--img" src="${API_BASE}${user.avatar_url}" alt="${user.display_name}" />`
  }
  return `<div class="${cls}">${user.display_name[0].toUpperCase()}</div>`
}

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
  const joinedYear = new Date(user.created_at).getFullYear()

  const actionBtn = isOwn
    ? `<button class="btn btn--ghost btn--sm" id="edit-btn">Editar perfil</button>`
    : user.is_following
      ? `<button class="btn btn--following" id="follow-btn" data-username="${user.username}" data-action="unfollow">Seguindo</button>`
      : `<button class="btn btn--follow"    id="follow-btn" data-username="${user.username}" data-action="follow">Seguir</button>`

  container.innerHTML = `
    <div class="profile-header">
      ${avatarHtml(user, 'avatar avatar--lg')}
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
    ${posts.length === 0
      ? `<div class="page-placeholder" style="min-height:40vh">
           <div class="placeholder-icon">
             <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
             </svg>
           </div>
           <h1>${isOwn ? 'Você ainda não tem posts' : 'Nenhum post ainda'}</h1>
           <p>${isOwn ? 'Suas publicações aparecerão aqui quando você começar a postar.' : 'Este usuário ainda não publicou nada.'}</p>
         </div>`
      : `<div class="posts-grid">${posts.map(p => postTile(p)).join('')}</div>`
    }
  `

  document.getElementById('btn-followers').addEventListener('click', () =>
    openUserListModal('Seguidores', `/users/${user.username}/followers`)
  )
  document.getElementById('btn-following').addEventListener('click', () =>
    openUserListModal('Seguindo', `/users/${user.username}/following`)
  )

  posts.forEach(p => {
    document.querySelector(`[data-post-id="${p.id}"]`)
      ?.addEventListener('click', () => openPostModal(p, user, isOwn))
  })

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

function postTile(p) {
  const img = p.image_url
    ? `<img class="post-tile__img" src="${API_BASE}${p.image_url}" alt="${p.title}" />`
    : `<div class="post-tile__img post-tile__img--empty">🌙</div>`
  return `
    <div class="post-tile" data-post-id="${p.id}">
      ${img}
      <p class="post-tile__title">${p.title}</p>
    </div>
  `
}

function openPostModal(post, user, isOwn = false) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  const img = post.image_url
    ? `<img class="post-modal__img" src="${API_BASE}${post.image_url}" alt="${post.title}" />`
    : `<div class="post-modal__img post-modal__img--empty">🌙</div>`
  const date = new Date(post.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })

  overlay.innerHTML = `
    <div class="modal modal--post">
      <button class="modal-close modal-close--abs" id="close-post">&times;</button>
      <h2 class="post-modal__title" id="modal-post-title">${post.title}</h2>
      ${img}
      <div class="post-modal__body">
        <div class="post-modal__header">
          ${avatarHtml(user)}
          <div style="flex:1">
            <p style="font-weight:600; font-size:0.9rem">${user.display_name}</p>
            <p style="font-size:0.8rem; color:var(--text-muted)">@${user.username} · ${date}</p>
          </div>
          ${isOwn ? `<button class="btn btn--ghost btn--sm" id="edit-post-btn">Editar</button>` : ''}
        </div>
        <p class="post-modal__caption" id="modal-post-caption">${post.caption || ''}</p>
        <div class="post-edit-form" id="post-edit-form" style="display:none">
          <div class="error-msg" id="post-edit-error"></div>
          <div class="field">
            <label>Título</label>
            <input class="input" id="post-edit-title" value="${post.title}" maxlength="200" />
          </div>
          <div class="field">
            <label>Descrição</label>
            <textarea class="textarea" id="post-edit-caption" maxlength="2000">${post.caption || ''}</textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn--ghost btn--sm" id="cancel-post-edit">Cancelar</button>
            <button class="btn btn--primary btn--sm" id="save-post-edit" style="width:auto">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  overlay.querySelector('#close-post').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  if (!isOwn) return

  const editBtn   = overlay.querySelector('#edit-post-btn')
  const form      = overlay.querySelector('#post-edit-form')
  const cancelBtn = overlay.querySelector('#cancel-post-edit')
  const saveBtn   = overlay.querySelector('#save-post-edit')
  const errEl     = overlay.querySelector('#post-edit-error')

  editBtn.addEventListener('click', () => {
    form.style.display = 'flex'
    form.style.flexDirection = 'column'
    form.style.gap = '0.75rem'
    editBtn.style.display = 'none'
  })

  cancelBtn.addEventListener('click', () => {
    form.style.display = 'none'
    editBtn.style.display = ''
    errEl.classList.remove('visible')
  })

  saveBtn.addEventListener('click', async () => {
    errEl.classList.remove('visible')
    saveBtn.disabled = true
    saveBtn.textContent = 'Salvando...'

    try {
      const { getToken } = await import('../auth.js')
      const formData = new FormData()
      formData.append('title',   overlay.querySelector('#post-edit-title').value.trim())
      formData.append('caption', overlay.querySelector('#post-edit-caption').value.trim())

      const res = await fetch(`${API_BASE}/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      const updated = await res.json()

      overlay.querySelector('#modal-post-title').textContent  = updated.title
      overlay.querySelector('#modal-post-caption').textContent= updated.caption || ''
      overlay.querySelector('#post-edit-title').value  = updated.title
      overlay.querySelector('#post-edit-caption').value= updated.caption || ''

      form.style.display = 'none'
      editBtn.style.display = ''
      post.title   = updated.title
      post.caption = updated.caption
    } catch (err) {
      errEl.textContent = err.message
      errEl.classList.add('visible')
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = 'Salvar'
    }
  })
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
          ${avatarHtml(u)}
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
            btn.textContent    = 'Seguindo'
            btn.dataset.action = 'unfollow'
            btn.className      = 'btn btn--following btn--sm'
          } else {
            await del(`/users/${username}/follow`)
            btn.textContent    = 'Seguir'
            btn.dataset.action = 'follow'
            btn.className      = 'btn btn--follow btn--sm'
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
  const currentAvatar = user.avatar_url
    ? `<img class="avatar avatar--lg avatar--img" src="${API_BASE}${user.avatar_url}" alt="avatar" id="avatar-preview" />`
    : `<div class="avatar avatar--lg" id="avatar-preview">${user.display_name[0].toUpperCase()}</div>`

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <h3>Editar perfil</h3>
      <div class="error-msg" id="edit-error"></div>

      <div class="avatar-upload-area">
        ${currentAvatar}
        <button class="avatar-upload-btn" id="avatar-upload-btn" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Alterar foto
        </button>
        <input type="file" id="avatar-file" accept="image/jpeg,image/png,image/webp" style="display:none" />
      </div>

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

  const fileInput   = overlay.querySelector('#avatar-file')
  const uploadBtn   = overlay.querySelector('#avatar-upload-btn')
  const preview     = overlay.querySelector('#avatar-preview')
  let   pendingFile = null

  uploadBtn.addEventListener('click', () => fileInput.click())

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]
    if (!file) return
    pendingFile = file
    const url = URL.createObjectURL(file)
    preview.outerHTML = `<img class="avatar avatar--lg avatar--img" src="${url}" id="avatar-preview" />`
  })

  overlay.querySelector('#cancel-edit').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  overlay.querySelector('#save-edit').addEventListener('click', async () => {
    const errEl  = overlay.querySelector('#edit-error')
    const saveBtn = overlay.querySelector('#save-edit')
    errEl.classList.remove('visible')
    saveBtn.disabled   = true
    saveBtn.textContent = 'Salvando...'

    try {
      if (pendingFile) {
        const form = new FormData()
        form.append('file', pendingFile)
        const { getToken } = await import('../auth.js')
        const res = await fetch(`${API_BASE}/users/me/avatar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getToken()}` },
          body: form,
        })
        if (!res.ok) throw new Error('Erro ao enviar imagem')
      }

      await patch('/users/me', {
        display_name: overlay.querySelector('#edit-name').value,
        bio:          overlay.querySelector('#edit-bio').value || null,
      })

      overlay.remove()
      mount(container, null)
    } catch (err) {
      errEl.textContent = err.message
      errEl.classList.add('visible')
      saveBtn.disabled   = false
      saveBtn.textContent = 'Salvar'
    }
  })
}

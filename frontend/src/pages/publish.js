import { getToken } from '../auth.js'

const API_BASE  = 'http://localhost:8000'
const MAX_FILES = 8

const ART_STYLES = [
  { id: 'visual',  label: 'Visual',  emoji: '🎨' },
  { id: 'digital', label: 'Digital', emoji: '💻' },
  { id: '3d',      label: '3D',      emoji: '🧊' },
]

export async function mount(container) {
  container.innerHTML = `
    <div class="publish-wrap">
      <h1 class="publish-title">Nova publicação</h1>

      <div class="error-msg" id="pub-error"></div>
      <div class="success-msg" id="pub-success"></div>

      <form class="publish-form" id="publish-form">
        <div class="field">
          <label>Título <span style="color:#EF4444">*</span></label>
          <input class="input" id="pub-title" type="text" maxlength="200" placeholder="Dê um título ao seu post" required />
        </div>

        <div class="field">
          <label>Imagens <span style="color:var(--text-muted);font-weight:400">(até ${MAX_FILES})</span></label>
          <div class="multi-img-area" id="multi-img-area">
            <input type="file" id="pub-file" accept="image/*" multiple style="display:none" />
            <div class="img-drop-area" id="img-drop">
              <div class="img-drop-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <p>Clique ou arraste imagens aqui</p>
                <span>JPG, PNG, WEBP, GIF · até ${MAX_FILES} imagens</span>
              </div>
            </div>
            <div class="img-thumbs-grid" id="img-thumbs-grid" style="display:none"></div>
          </div>
        </div>

        <div class="field">
          <label>Categoria de arte</label>
          <div class="art-style-chips" id="art-style-chips">
            ${ART_STYLES.map(s => `
              <button type="button" class="interest-chip" data-style="${s.id}">
                <span>${s.emoji}</span> ${s.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="field">
          <label>Descrição</label>
          <textarea class="textarea" id="pub-caption" maxlength="2000" rows="4" placeholder="Conte algo sobre este post..."></textarea>
        </div>

        <button class="btn btn--primary" type="submit" id="pub-btn">Publicar</button>
      </form>
    </div>
  `

  const fileInput  = document.getElementById('pub-file')
  const dropArea   = document.getElementById('img-drop')
  const thumbsGrid = document.getElementById('img-thumbs-grid')
  const chipsEl    = document.getElementById('art-style-chips')
  let   selectedFiles = []

  // ── Seletor de estilo ──────────────────────────────
  chipsEl.addEventListener('click', e => {
    const chip = e.target.closest('.interest-chip')
    if (!chip) return
    document.querySelectorAll('#art-style-chips .interest-chip').forEach(c => c.classList.remove('interest-chip--active'))
    chip.classList.add('interest-chip--active')
  })

  // ── Drop zone ──────────────────────────────────────
  dropArea.addEventListener('click', () => fileInput.click())
  dropArea.addEventListener('dragover',  e => { e.preventDefault(); dropArea.classList.add('img-drop-area--over') })
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('img-drop-area--over'))
  dropArea.addEventListener('drop', e => {
    e.preventDefault()
    dropArea.classList.remove('img-drop-area--over')
    addFiles([...e.dataTransfer.files])
  })
  fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files])
    fileInput.value = ''
  })

  function addFiles(newFiles) {
    const allowed = newFiles.filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f.name))
    const slots   = MAX_FILES - selectedFiles.length
    selectedFiles = [...selectedFiles, ...allowed.slice(0, slots)]
    renderThumbs()
  }

  function renderThumbs() {
    if (selectedFiles.length === 0) {
      dropArea.style.display  = ''
      thumbsGrid.style.display = 'none'
      thumbsGrid.innerHTML = ''
      return
    }

    dropArea.style.display  = 'none'
    thumbsGrid.style.display = 'grid'

    thumbsGrid.innerHTML = selectedFiles.map((f, i) => `
      <div class="img-thumb-wrap" data-idx="${i}">
        <img class="img-thumb" src="${URL.createObjectURL(f)}" />
        <button type="button" class="img-thumb-remove" data-idx="${i}">✕</button>
        ${i === 0 ? '<span class="img-thumb-badge">Principal</span>' : ''}
      </div>
    `).join('') + (selectedFiles.length < MAX_FILES ? `
      <div class="img-add-slot" id="img-add-slot">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
    ` : '')

    thumbsGrid.querySelectorAll('.img-thumb-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFiles.splice(parseInt(btn.dataset.idx), 1)
        renderThumbs()
      })
    })

    document.getElementById('img-add-slot')?.addEventListener('click', () => fileInput.click())
  }

  // ── Submit ─────────────────────────────────────────
  document.getElementById('publish-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl     = document.getElementById('pub-error')
    const successEl = document.getElementById('pub-success')
    const btn       = document.getElementById('pub-btn')
    errEl.classList.remove('visible')
    successEl.style.display = 'none'

    const title = document.getElementById('pub-title').value.trim()
    if (!title) { errEl.textContent = 'O título é obrigatório.'; errEl.classList.add('visible'); return }

    btn.disabled    = true
    btn.textContent = 'Publicando...'

    try {
      const form = new FormData()
      form.append('title', title)
      const caption = document.getElementById('pub-caption').value.trim()
      if (caption) form.append('caption', caption)
      selectedFiles.forEach(f => form.append('files', f))
      const activeStyle = document.querySelector('#art-style-chips .interest-chip--active')
      if (activeStyle) form.append('art_style', activeStyle.dataset.style)

      const res = await fetch(`${API_BASE}/posts/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: form,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao publicar')

      successEl.textContent = 'Post publicado com sucesso!'
      successEl.style.display = 'block'
      document.getElementById('publish-form').reset()
      selectedFiles = []
      renderThumbs()
      document.querySelectorAll('#art-style-chips .interest-chip').forEach(c => c.classList.remove('interest-chip--active'))
    } catch (err) {
      errEl.textContent = err.message
      errEl.classList.add('visible')
    } finally {
      btn.disabled    = false
      btn.textContent = 'Publicar'
    }
  })
}

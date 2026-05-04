import { getToken } from '../auth.js'

const API_BASE = 'http://localhost:8000'

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
          <label>Imagem</label>
          <div class="img-drop-area" id="img-drop">
            <input type="file" id="pub-file" accept="image/*" style="display:none" />
            <div class="img-drop-placeholder" id="img-placeholder">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <p>Clique ou arraste uma imagem aqui</p>
              <span>JPG, PNG, WEBP, GIF</span>
            </div>
            <img id="img-preview" class="img-preview" style="display:none" />
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

  const dropArea   = document.getElementById('img-drop')
  const fileInput  = document.getElementById('pub-file')
  const preview    = document.getElementById('img-preview')
  const placeholder= document.getElementById('img-placeholder')

  dropArea.addEventListener('click', () => fileInput.click())

  dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('img-drop-area--over') })
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('img-drop-area--over'))
  dropArea.addEventListener('drop', e => {
    e.preventDefault()
    dropArea.classList.remove('img-drop-area--over')
    const file = e.dataTransfer.files[0]
    if (file) showPreview(file)
  })

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) showPreview(fileInput.files[0])
  })

  function showPreview(file) {
    const url = URL.createObjectURL(file)
    preview.src = url
    preview.style.display = 'block'
    placeholder.style.display = 'none'
  }

  document.getElementById('publish-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl     = document.getElementById('pub-error')
    const successEl = document.getElementById('pub-success')
    const btn       = document.getElementById('pub-btn')
    errEl.classList.remove('visible')
    successEl.style.display = 'none'

    const title = document.getElementById('pub-title').value.trim()
    if (!title) { errEl.textContent = 'O título é obrigatório.'; errEl.classList.add('visible'); return }

    btn.disabled   = true
    btn.textContent = 'Publicando...'

    try {
      const form = new FormData()
      form.append('title', title)
      const caption = document.getElementById('pub-caption').value.trim()
      if (caption) form.append('caption', caption)
      const file = fileInput.files[0]
      if (file) form.append('file', file)

      const res = await fetch(`${API_BASE}/posts/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: form,
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao publicar')

      successEl.textContent = 'Post publicado com sucesso!'
      successEl.style.display = 'block'
      document.getElementById('publish-form').reset()
      preview.style.display = 'none'
      placeholder.style.display = 'flex'
    } catch (err) {
      errEl.textContent = err.message
      errEl.classList.add('visible')
    } finally {
      btn.disabled   = false
      btn.textContent = 'Publicar'
    }
  })
}

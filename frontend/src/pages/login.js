import { post } from '../api.js'
import { setToken } from '../auth.js'
import { moonLogo } from '../main.js'

export function mount(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-box">
        <div class="auth-brand">
          ${moonLogo(32)}
          <span class="auth-brand-name">Lunar</span>
        </div>
        <h2>Entrar</h2>
        <p>Bem-vindo de volta.</p>
        <div class="error-msg" id="login-error"></div>
        <form id="login-form">
          <div class="form-group">
            <div class="field">
              <label>Email</label>
              <input class="input" type="email" id="login-email" placeholder="seu@email.com" required />
            </div>
            <div class="field">
              <label>Senha</label>
              <input class="input" type="password" id="login-senha" placeholder="••••••" required />
            </div>
          </div>
          <button class="btn btn--primary" type="submit">Entrar</button>
        </form>
        <p class="auth-link">Não tem conta? <a href="#register">Criar conta</a></p>
      </div>
    </div>
  `

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl = document.getElementById('login-error')
    errEl.classList.remove('visible')

    try {
      const data = await post('/auth/login', {
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-senha').value,
      })
      setToken(data.access_token)
      location.hash = 'home'
    } catch (err) {
      errEl.textContent = err.message
      errEl.classList.add('visible')
    }
  })
}

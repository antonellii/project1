import { post } from '../api.js'
import { setToken } from '../auth.js'
import { moonLogo } from '../main.js'

const RULES = [
  { id: 'len',    label: 'Mínimo 8 caracteres',   test: v => v.length >= 8 },
  { id: 'letter', label: 'Pelo menos uma letra',   test: v => /[a-zA-Z]/.test(v) },
  { id: 'number', label: 'Pelo menos um número',   test: v => /[0-9]/.test(v) },
  { id: 'symbol', label: 'Pelo menos um símbolo',  test: v => /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(v) },
]

function validatePassword(value) {
  return RULES.map(r => ({ ...r, ok: r.test(value) }))
}

export function mount(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-box">
        <div class="auth-brand">
          ${moonLogo(32)}
          <span class="auth-brand-name">Lunar</span>
        </div>
        <h2>Criar conta</h2>
        <p>Junte-se ao Lunar hoje.</p>
        <div class="error-msg" id="register-error"></div>
        <form id="register-form">
          <div class="form-group">
            <div class="field">
              <label>Nome de exibição</label>
              <input class="input" type="text" id="reg-display"
                placeholder="Seu Nome" maxlength="100" required />
            </div>
            <div class="field">
              <label>Nome de usuário</label>
              <input class="input" type="text" id="reg-username"
                placeholder="@usuario" maxlength="50" required />
            </div>
            <div class="field">
              <label>Email</label>
              <input class="input" type="email" id="reg-email"
                placeholder="seu@email.com" required />
            </div>
            <div class="field">
              <label>Senha</label>
              <input class="input" type="password" id="reg-senha"
                placeholder="Crie uma senha forte" required />
              <div class="password-rules" id="password-rules">
                ${RULES.map(r => `
                  <div class="rule" id="rule-${r.id}">
                    <span class="rule-icon">✕</span> ${r.label}
                  </div>
                `).join('')}
              </div>
              <div class="strength-bar">
                <div class="strength-fill" id="strength-fill"></div>
              </div>
            </div>
            <div class="field">
              <label>Confirmar senha</label>
              <input class="input" type="password" id="reg-confirm"
                placeholder="Repita a senha" required />
              <span class="confirm-msg" id="confirm-msg"></span>
            </div>
          </div>
          <button class="btn btn--primary" type="submit" id="submit-btn">Criar conta</button>
        </form>
        <p class="auth-link">Já tem conta? <a href="#login">Entrar</a></p>
      </div>
    </div>
  `

  const senhaEl   = document.getElementById('reg-senha')
  const confirmEl = document.getElementById('reg-confirm')
  const submitBtn = document.getElementById('submit-btn')

  function updateRules() {
    const value   = senhaEl.value
    const results = validatePassword(value)
    const passed  = results.filter(r => r.ok).length

    results.forEach(({ id, ok }) => {
      const el   = document.getElementById(`rule-${id}`)
      const icon = el.querySelector('.rule-icon')
      el.classList.toggle('rule--ok', ok)
      icon.textContent = ok ? '✓' : '✕'
    })

    const fill = document.getElementById('strength-fill')
    const pct  = (passed / RULES.length) * 100
    fill.style.width = `${pct}%`
    fill.style.background =
      passed <= 1 ? '#EF4444' :
      passed <= 2 ? '#F59E0B' :
      passed <= 3 ? '#3B82F6' : '#22C55E'
  }

  function updateConfirm() {
    const msg = document.getElementById('confirm-msg')
    if (!confirmEl.value) { msg.textContent = ''; return }
    const match = senhaEl.value === confirmEl.value
    msg.textContent = match ? '✓ Senhas coincidem' : '✕ Senhas não coincidem'
    msg.className   = `confirm-msg ${match ? 'confirm-ok' : 'confirm-err'}`
  }

  senhaEl.addEventListener('input',   updateRules)
  confirmEl.addEventListener('input', updateConfirm)

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl = document.getElementById('register-error')
    errEl.classList.remove('visible')

    const senha   = senhaEl.value
    const confirm = confirmEl.value
    const results = validatePassword(senha)
    const allOk   = results.every(r => r.ok)

    if (!allOk) {
      errEl.textContent = 'A senha não atende todos os requisitos.'
      errEl.classList.add('visible')
      return
    }

    if (senha !== confirm) {
      errEl.textContent = 'As senhas não coincidem.'
      errEl.classList.add('visible')
      return
    }

    submitBtn.disabled   = true
    submitBtn.textContent = 'Criando conta...'

    try {
      const data = await post('/auth/register', {
        display_name: document.getElementById('reg-display').value,
        username:     document.getElementById('reg-username').value.replace('@', ''),
        email:        document.getElementById('reg-email').value,
        password:     senha,
      })
      setToken(data.access_token)
      location.hash = 'home'
    } catch (err) {
      errEl.textContent = err.message
      errEl.classList.add('visible')
      submitBtn.disabled   = false
      submitBtn.textContent = 'Criar conta'
    }
  })
}

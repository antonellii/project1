import { getToken, clearToken } from './auth.js'

const BASE = 'http://localhost:8000'

export async function api(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) { clearToken(); location.hash = 'login' }
  if (res.status === 204) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erro ${res.status}`)
  }
  return res.json()
}

export const get  = (path)         => api(path)
export const post = (path, body)   => api(path, { method: 'POST',  body: JSON.stringify(body) })
export const patch= (path, body)   => api(path, { method: 'PATCH', body: JSON.stringify(body) })
export const del  = (path)         => api(path, { method: 'DELETE' })

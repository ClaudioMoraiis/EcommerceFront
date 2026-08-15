import { requestFirstAvailable } from './http'

const AUTH_TOKEN_KEY = 'ecommerce.auth.token'
const USER_KEY = 'ecommerce.auth.user'

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    const parsedId = Number(parsed?.id)

    return {
      ...parsed,
      id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null,
    }
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function persistSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function extractUserId(data) {
  const candidateId = data?.userId ?? data?.id ?? data?.usuario?.id ?? data?.user?.id
  const parsedId = Number(candidateId)
  return Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function normalizeRole(value) {
  const text = Array.isArray(value) ? value.map(String).join(' ') : String(value || '')
  return /admin/i.test(text) ? 'ADMIN' : 'CUSTOMER'
}

function extractRole(data, token) {
  const candidate =
    data?.role ??
    data?.perfil ??
    data?.tipo ??
    data?.authorities ??
    data?.roles ??
    data?.usuario?.role ??
    data?.usuario?.perfil ??
    data?.user?.role ??
    data?.user?.perfil

  if (candidate !== undefined && candidate !== null && candidate !== '') {
    return normalizeRole(candidate)
  }

  const payload = decodeJwtPayload(token)
  if (payload) {
    return normalizeRole(
      payload.role ?? payload.roles ?? payload.authorities ?? payload.perfil ?? payload.tipo,
    )
  }

  return 'CUSTOMER'
}

function extractUserName(data, email) {
  const candidateName =
    data?.userName ??
    data?.name ??
    data?.nome ??
    data?.usuario?.name ??
    data?.usuario?.nome ??
    data?.user?.name ??
    data?.user?.nome

  if (candidateName && String(candidateName).trim()) {
    return String(candidateName).trim()
  }

  return email.split('@')[0] || 'Cliente'
}

export async function loginApi(credentials) {
  const email = (credentials?.email || '').trim().toUpperCase()
  const senha = credentials?.password || ''

  const data = await requestFirstAvailable(
    ['/user/login'],
    {
      method: 'POST',
      query: { email, senha },
    },
  )

  const token = data?.token || data?.accessToken || data?.jwt || data
  const user = {
    id: extractUserId(data),
    name: extractUserName(data, email),
    email,
    role: extractRole(data, typeof token === 'string' ? token : ''),
  }

  if (!token) {
    throw new Error('Resposta de login sem token. Verifique o backend.')
  }

  persistSession(token, user)
  return { token, user }
}

export async function registerApi(payload) {
  await requestFirstAvailable(['/user/insert'], {
    method: 'POST',
    body: {
      nome: payload.name,
      email: (payload.email || '').trim().toUpperCase(),
      senha: payload.password,
      role: 'CUSTOMER',
      ativo: true,
    },
  })
}

export async function requestPasswordResetApi(email) {
  const data = await requestFirstAvailable(['/user/email-redefinir-senha'], {
    method: 'POST',
    query: {
      email: (email || '').trim().toUpperCase(),
    },
  })

  if (typeof data === 'string') {
    return data
  }

  return 'Se o e-mail existir, o backend enviara o token de recuperacao.'
}

export async function resetPasswordApi({ token, password }) {
  await requestFirstAvailable(['/user/redefinir-senha'], {
    method: 'POST',
    query: {
      token: (token || '').trim(),
      senha: password || '',
    },
  })
}

export async function fetchUserNameById(userId) {
  const normalizedId = Number(userId)
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null
  }

  const data = await requestFirstAvailable([`/user/${normalizedId}/nome`], {
    token: getStoredToken(),
  })

  if (typeof data === 'string') {
    return data.trim() || null
  }

  if (data && typeof data === 'object') {
    const candidate = data.nome || data.name || data.userName
    if (candidate) {
      return String(candidate).trim() || null
    }
  }

  return null
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export { API_BASE_URL }

function buildUrl(path) {
  if (!path) return API_BASE_URL
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

function withQuery(path, query) {
  if (!query || typeof query !== 'object') return path

  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  const queryString = params.toString()
  if (!queryString) return path
  return `${path}${path.includes('?') ? '&' : '?'}${queryString}`
}

function unwrapApiResponse(payload) {
  if (!payload || typeof payload !== 'object') return payload

  // Spring backend uses { sucesso: boolean, resposta: any } as standard envelope.
  if (Object.hasOwn(payload, 'sucesso') && Object.hasOwn(payload, 'resposta')) {
    if (!payload.sucesso) {
      throw new ApiError(payload.resposta || 'Operacao nao concluida.', 400)
    }
    return payload.resposta
  }

  return payload
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function tryParseJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function request(path, { method = 'GET', body, token, query } = {}) {
  const finalPath = withQuery(path, query)
  const headers = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(finalPath), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const responseText = response.status === 204 ? '' : await response.text()
  const parsedPayload = tryParseJson(responseText)

  if (!response.ok) {
    let message = `Erro ${response.status}`

    if (parsedPayload && typeof parsedPayload === 'object') {
      message = parsedPayload.message ?? parsedPayload.error ?? parsedPayload.resposta ?? message
    } else if (responseText) {
      message = responseText
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return null
  }

  if (!parsedPayload) {
    return responseText
  }

  return unwrapApiResponse(parsedPayload)
}

export async function requestFirstAvailable(paths, options) {
  let lastError = null

  for (const path of paths) {
    try {
      return await request(path, options)
    } catch (error) {
      if (error instanceof ApiError && error.status !== 404) {
        throw error
      }
      lastError = error
    }
  }

  throw lastError || new Error('Nenhum endpoint disponivel para essa operacao.')
}

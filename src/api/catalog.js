import { ApiError, requestFirstAvailable } from './http'
import { getStoredToken } from './auth'

function tryParseJson(text) {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function normalizeProduct(product) {
  if (!product) return null

  const firstImageId = Array.isArray(product.images) ? product.images[0] : null
  const imageUrl = firstImageId
    ? `/backend/produto-imagem/produto/${product.id}/images/${firstImageId}`
    : null

  return {
    id: product.id,
    name: product.name || product.nome || 'Produto',
    description: product.description || product.descricao || '',
    price: Number(product.price ?? product.valor ?? 0),
    stock: Number(product.stock ?? product.saldo ?? 0),
    categoryId: product.categoryId ?? product.categoriaId ?? null,
    categoryName: product.categoryName || product.categoriaNome || null,
    imageUrl,
    images: product.images || [],
    soldQuantity: Number(product.soldQuantity ?? product.quantidadeVendida ?? 0),
  }
}

function normalizeCategory(category) {
  if (!category) return null

  return {
    id: category.id,
    name: category.name || category.nome || `Categoria ${category.id}`,
  }
}

function normalizeReview(review) {
  if (!review) return null

  const parsedUserId = Number(review.userId ?? review.user?.id ?? 0) || null
  const normalizedUserName =
    review.userName ??
    review.username ??
    review.user_name ??
    review.nomeUsuario ??
    review.usuarioNome ??
    review.user?.name ??
    review.user?.nome ??
    null

  return {
    id: review.id,
    productId: Number(review.productId ?? review.product?.id ?? 0),
    userId: parsedUserId,
    userName: normalizedUserName ? String(normalizedUserName).trim() : null,
    rating: Number(review.rating ?? 0),
    comment: review.comment || '',
    createdAt: review.createdAt || null,
  }
}

export async function fetchProducts({ categoryId, search } = {}) {
  const data = await requestFirstAvailable(['/produto/list'], {
    query: {
      nome: search,
      categoriaId: categoryId,
    },
  })

  const list = Array.isArray(data) ? data : data.content || []
  return list.map(normalizeProduct).filter(Boolean)
}

export async function fetchProductById(productId) {
  const data = await requestFirstAvailable([`/produto/${productId}`])

  return normalizeProduct(data)
}

export async function fetchCategories() {
  try {
    const token = getStoredToken()
    const data = await requestFirstAvailable(['/categoria/list', '/categoria'], { token })
    const list = Array.isArray(data) ? data : data?.content || []
    const normalized = list.map(normalizeCategory).filter(Boolean)
    if (normalized.length) {
      return normalized
    }
  } catch {
    // fallback abaixo quando backend nao retornar lista de categorias
  }

  const products = await fetchProducts()
  const ids = [...new Set(products.map((product) => product.categoryId).filter(Boolean))]
  return ids.map((id) => ({ id, name: `Categoria ${id}` }))
}

export async function createProduct(payload) {
  return requestFirstAvailable(['/produto/insert'], {
    method: 'POST',
    body: {
      nome: payload.name,
      descricao: payload.description || '',
      saldo: Number(payload.stock),
      valor: Number(payload.price),
      categoriaId: Number(payload.categoryId),
      images: payload.images || [],
    },
    token: getStoredToken(),
  })
}

export async function updateProduct(productId, payload) {
  return requestFirstAvailable(['/produto/alterar'], {
    method: 'PUT',
    body: {
      id: Number(productId),
      nome: payload.name,
      descricao: payload.description || '',
      saldo: Number(payload.stock),
      valor: Number(payload.price),
      categoriaId: Number(payload.categoryId),
      images: payload.images || [],
    },
    token: getStoredToken(),
  })
}

export async function fetchProductReviews(productId) {
  if (!productId) {
    throw new Error('Informe o produto para listar avaliacoes.')
  }

  const data = await requestFirstAvailable([`/produto-avaliacao/produto/${productId}`], {
    token: getStoredToken(),
  })

  const list = Array.isArray(data) ? data : data?.content || []
  return list.map(normalizeReview).filter(Boolean)
}

export async function fetchProductReviewAverage(productId) {
  if (!productId) {
    throw new Error('Informe o produto para consultar a media.')
  }

  const data = await requestFirstAvailable([`/produto-avaliacao/produto/${productId}/average`], {
    token: getStoredToken(),
  })

  if (typeof data === 'number') {
    return {
      average: Number(data) || 0,
      count: 0,
      histogram: [0, 0, 0, 0, 0, 0],
    }
  }

  return {
    average: Number(data?.average ?? 0),
    count: Number(data?.count ?? 0),
    histogram: Array.isArray(data?.histogram)
      ? data.histogram.map((item) => Number(item || 0))
      : [0, 0, 0, 0, 0, 0],
  }
}

export async function createProductReview({ productId, userId, rating, comment }) {
  if (!productId) {
    throw new Error('Informe o produto para avaliar.')
  }

  if (!userId) {
    throw new Error('Sessao sem identificador de usuario. Faca login novamente para avaliar.')
  }

  const normalizedRating = Number(rating)
  if (!Number.isFinite(normalizedRating) || normalizedRating < 0 || normalizedRating > 5) {
    throw new Error('A nota deve estar entre 0 e 5.')
  }

  return requestFirstAvailable(['/produto-avaliacao'], {
    method: 'POST',
    token: getStoredToken(),
    body: {
      productId: Number(productId),
      userId: Number(userId),
      rating: Math.round(normalizedRating),
      comment: (comment || '').trim(),
    },
  })
}

export async function removeProduct(productId) {
  return requestFirstAvailable([`/produto/delete/${productId}`], {
    method: 'DELETE',
    token: getStoredToken(),
  })
}

export async function uploadProductImage(productId, file) {
  if (!productId) {
    throw new Error('Produto invalido para upload de imagem.')
  }

  if (!file) {
    throw new Error('Selecione um arquivo de imagem para enviar.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const token = getStoredToken()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const response = await fetch(`/backend/produto-imagem/produto/${productId}/images`, {
    method: 'POST',
    headers,
    body: formData,
  })

  const responseText = response.status === 204 ? '' : await response.text()
  const parsed = tryParseJson(responseText)
  const payload = parsed && Object.hasOwn(parsed, 'sucesso') && Object.hasOwn(parsed, 'resposta')
    ? parsed.resposta
    : parsed

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.resposta ||
      responseText ||
      `Erro ${response.status} ao enviar imagem.`
    throw new Error(message)
  }

  return payload || null
}

export async function createCategory(payload) {
  try {
    return await requestFirstAvailable(['/categoria/insert', '/categoria'], {
      method: 'POST',
      body: {
        nome: payload.name,
        name: payload.name,
      },
      token: getStoredToken(),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new Error('Sua sessao expirou. Faca login novamente para cadastrar categoria.')
    }

    if (error instanceof ApiError && error.status === 403) {
      throw new Error('Seu usuario nao tem permissao para cadastrar categoria.')
    }

    throw new Error(
      error?.message ||
      'Nao foi possivel cadastrar categoria. Verifique se o backend possui endpoint de categoria.',
    )
  }
}

export async function updateCategory(categoryId, payload) {
  void categoryId
  void payload
  throw new Error('O backend atual nao possui endpoint para editar categoria.')
}

export async function removeCategory(categoryId) {
  void categoryId
  throw new Error('O backend atual nao possui endpoint para remover categoria.')
}

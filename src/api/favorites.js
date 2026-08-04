import { getStoredToken } from './auth'
import { requestFirstAvailable } from './http'

export async function listFavoritesByUser(userId) {
  if (!userId) {
    throw new Error('Informe o User ID para listar favoritos.')
  }

  return requestFirstAvailable([`/favorite/user/${userId}`], {
    token: getStoredToken(),
  })
}

export async function getFavoriteById(favoriteId) {
  if (!favoriteId) {
    throw new Error('Informe o id do favorito.')
  }

  return requestFirstAvailable([`/favorite/${favoriteId}`], {
    token: getStoredToken(),
  })
}

export async function createFavorite({ userId, productId }) {
  if (!userId || !productId) {
    throw new Error('userId e productId sao obrigatorios.')
  }

  return requestFirstAvailable(['/favorite/create'], {
    method: 'POST',
    token: getStoredToken(),
    body: {
      userId: Number(userId),
      productId: Number(productId),
    },
  })
}

export async function updateFavorite(favoriteId, payload) {
  if (!favoriteId) {
    throw new Error('Informe o id do favorito para atualizar.')
  }

  return requestFirstAvailable([`/favorite/${favoriteId}`], {
    method: 'PUT',
    token: getStoredToken(),
    body: {
      userId: payload?.userId ? Number(payload.userId) : undefined,
      productId: payload?.productId ? Number(payload.productId) : undefined,
    },
  })
}

export async function deleteFavorite(favoriteId) {
  if (!favoriteId) {
    throw new Error('Informe o id do favorito para remover.')
  }

  return requestFirstAvailable([`/favorite/${favoriteId}`], {
    method: 'DELETE',
    token: getStoredToken(),
  })
}

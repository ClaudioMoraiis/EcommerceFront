import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)
const FAVORITES_STORAGE_KEY = 'ecommerce.favorites.local'

function loadStoredFavorites() {
  const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistFavorites(items) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items))
}

function normalizeFavoriteProducts(favorites) {
  return favorites
    .map((favorite) => ({
      ...favorite,
      id: Number(favorite.id),
      price: Number(favorite.price || 0),
      stock: Number(favorite.stock || 0),
      soldQuantity: Number(favorite.soldQuantity || 0),
    }))
    .filter((favorite) => Number.isFinite(Number(favorite.id)) && Number(favorite.id) > 0)
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [favoriteItems, setFavoriteItems] = useState(() => normalizeFavoriteProducts(loadStoredFavorites()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadFavorites = async () => {
    setLoading(true)
    setError('')

    try {
      const nextItems = normalizeFavoriteProducts(loadStoredFavorites())
      setFavoriteItems(nextItems)
      persistFavorites(nextItems)
      return nextItems
    } catch (err) {
      setFavoriteItems([])
      setError(err.message || 'Falha ao carregar favoritos.')
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const favoriteMap = useMemo(() => {
    const map = new Map()
    favoriteItems.forEach((item) => {
      map.set(Number(item.id), item)
    })
    return map
  }, [favoriteItems])

  const isFavorited = (productId) => favoriteMap.has(Number(productId))

  const getFavoriteItem = (productId) => favoriteMap.get(Number(productId)) || null

  const addFavorite = async (product) => {
    if (!product?.id) {
      throw new Error('Produto invalido para favoritar.')
    }

    const favorite = {
      id: Number(product.id),
      name: product.name,
      description: product.description || '',
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      categoryId: product.categoryId || null,
      categoryName: product.categoryName || null,
      imageUrl: product.imageUrl || product.image || null,
      images: Array.isArray(product.images) ? product.images : [],
      soldQuantity: Number(product.soldQuantity || 0),
      favoriteCreatedAt: new Date().toISOString(),
    }

    const nextItems = normalizeFavoriteProducts([
      ...favoriteItems.filter((item) => Number(item.id) !== Number(product.id)),
      favorite,
    ])
    setFavoriteItems(nextItems)
    persistFavorites(nextItems)
    return nextItems
  }

  const removeFavorite = async (productOrId) => {
    const productId = Number(productOrId?.id ?? productOrId)
    const nextItems = favoriteItems.filter((item) => Number(item.id) !== productId)
    setFavoriteItems(nextItems)
    persistFavorites(nextItems)
  }

  const toggleFavorite = async (productOrId) => {
    const productId = Number(productOrId?.id ?? productOrId)
    if (isFavorited(productId)) {
      return removeFavorite(productOrId)
    }

    return addFavorite(productOrId)
  }

  const value = useMemo(
    () => ({
      favoriteItems,
      favoriteCount: favoriteItems.length,
      loading,
      error,
      loadFavorites,
      isFavorited,
      getFavoriteItem,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    }),
    [favoriteItems, loading, error, favoriteMap],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites precisa estar dentro de FavoritesProvider')
  }

  return context
}

import { createContext, useContext, useState } from 'react'

const CART_STORAGE_KEY = 'ecommerce.cart'
const SHIPPING = 25

const CartContext = createContext(null)

function loadCart() {
  const raw = localStorage.getItem(CART_STORAGE_KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  const persist = (nextItems) => {
    setItems(nextItems)
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems))
  }

  const addToCart = (product) => {
    const existing = items.find((item) => item.id === product.id)
    if (existing) {
      const updated = items.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      )
      persist(updated)
      return
    }

    persist([...items, { ...product, quantity: 1 }])
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return
    persist(items.map((item) => (item.id === productId ? { ...item, quantity } : item)))
  }

  const removeFromCart = (productId) => {
    persist(items.filter((item) => item.id !== productId))
  }

  const clearCart = () => {
    persist([])
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0)
  const shipping = items.length ? SHIPPING : 0
  const total = subtotal + shipping

  const value = {
    items,
    subtotal,
    shipping,
    total,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart precisa estar dentro de CartProvider')
  }
  return context
}

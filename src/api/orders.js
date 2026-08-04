import { getStoredToken } from './auth'
import { requestFirstAvailable } from './http'

export async function createStripePaymentIntent({ orderId, amount }) {
  if (!orderId) {
    throw new Error('OrderId obrigatorio para iniciar o pagamento.')
  }

  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Valor invalido para pagamento.')
  }

  const token = getStoredToken()

  return requestFirstAvailable(['/pagamento/create'], {
    method: 'POST',
    token,
    body: {
      orderId: Number(orderId),
      amount: Number(numericAmount.toFixed(2)),
    },
  })
}

export async function fetchPaymentByReference(paymentReference) {
  if (!paymentReference) {
    throw new Error('Informe a referencia do pagamento para consulta.')
  }

  return requestFirstAvailable([`/pagamento/${paymentReference}`], {
    token: getStoredToken(),
  })
}

export async function forceMarkPaymentPaid(paymentReference) {
  if (!paymentReference) {
    throw new Error('Informe a referencia do pagamento para sincronizar status.')
  }

  return requestFirstAvailable([`/pagamento/force-mark-paid/${paymentReference}`], {
    method: 'POST',
    token: getStoredToken(),
  })
}

export async function registerSale({ orderId, items }) {
  if (!orderId) {
    throw new Error('OrderId obrigatorio para registrar venda.')
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Itens obrigatorios para registrar venda.')
  }

  const token = getStoredToken()

  return requestFirstAvailable(['/sales/register'], {
    method: 'POST',
    token,
    body: {
      orderId: Number(orderId),
      items: items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      })),
    },
  })
}

export async function fetchSoldQuantityByProduct() {
  try {
    const token = getStoredToken()
    const data = await requestFirstAvailable(['/sales/by-product'], { token })
    if (!data || typeof data !== 'object') {
      return {}
    }

    return Object.entries(data).reduce((acc, [productId, qty]) => {
      const normalizedId = Number(productId)
      if (!Number.isFinite(normalizedId)) return acc
      acc[normalizedId] = Number(qty || 0)
      return acc
    }, {})
  } catch {
    return {}
  }
}

export async function createOrder({ userId, items }) {
  if (!userId) {
    throw new Error('Informe o userId do backend para finalizar o pedido.')
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Seu carrinho esta vazio.')
  }

  const token = getStoredToken()

  const cart = await requestFirstAvailable(['/carrinho'], {
    method: 'POST',
    token,
    body: {
      userId: Number(userId),
      items: [],
    },
  })

  const cartId = cart?.id
  if (!cartId) {
    throw new Error('Nao foi possivel criar carrinho no backend.')
  }

  for (const item of items) {
    await requestFirstAvailable([`/carrinho/${cartId}/items`], {
      method: 'POST',
      token,
      body: {
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      },
    })
  }

  return requestFirstAvailable(['/pedido/from-cart'], {
    method: 'POST',
    token,
    query: {
      cartId,
    },
  })
}

export async function fetchMyOrders(userId) {
  if (!userId) {
    throw new Error('Informe o userId para consultar seus pedidos.')
  }

  const data = await requestFirstAvailable([`/pedido/usuario/${userId}`], {
    token: getStoredToken(),
  })

  return Array.isArray(data) ? data : data.content || []
}

export async function fetchOrderById(orderId) {
  if (!orderId) {
    throw new Error('Informe o orderId para consultar o pedido.')
  }

  return requestFirstAvailable([`/pedido/${orderId}`], {
    token: getStoredToken(),
  })
}

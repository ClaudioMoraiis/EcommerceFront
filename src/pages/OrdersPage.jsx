import { useEffect, useState } from 'react'
import { fetchMyOrders } from '../api/orders'
import { useAuth } from '../contexts/AuthContext'

export function OrdersPage() {
  const { user, setBackendUserId: persistBackendUserId } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [backendUserId, setLocalBackendUserId] = useState(() => user?.id || '')
  const hasBackendUserId = Boolean(backendUserId)

  useEffect(() => {
    const run = async () => {
      if (!backendUserId) {
        setOrders([])
        setError('')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const data = await fetchMyOrders(backendUserId)
        setOrders(data)
      } catch (err) {
        setError(err.message || 'Falha ao carregar pedidos.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [backendUserId])

  if (loading) return <p className="muted">Carregando pedidos...</p>

  return (
    <section className="stack-md">
      <div>
        <span className="eyebrow">Minha conta</span>
        <h1>Historico de pedidos</h1>
      </div>
      {hasBackendUserId ? (
        <p className="muted">Mostrando pedidos do usuario #{backendUserId} autenticado.</p>
      ) : (
        <label>
          User ID no backend
          <input
            type="number"
            min="1"
            value={backendUserId}
            onChange={(event) => {
              const value = event.target.value
              setLocalBackendUserId(value)
              persistBackendUserId(value)
            }}
            placeholder="Ex.: 1"
          />
        </label>
      )}
      {!hasBackendUserId && <p className="muted">Faca login novamente para carregar o ID automatico do backend.</p>}
      {error && <p className="error-text">{error}</p>}
      {!error && hasBackendUserId && !orders.length && <p className="muted">Voce ainda nao tem pedidos.</p>}
      {orders.map((order) => {
        const resolvedStatus = order.status || 'PENDING'
        const statusLabel =
          resolvedStatus === 'PAID'
            ? 'Pago'
            : resolvedStatus === 'PENDING'
              ? 'Aguardando confirmação'
              : resolvedStatus

        return (
          <article key={order.id} className="card stack-sm">
            <div className="row-between">
              <strong>Pedido #{order.id}</strong>
              <span className="chip">{statusLabel}</span>
            </div>
            <p className="muted">Data: {new Date(order.createdAt || Date.now()).toLocaleString('pt-BR')}</p>
            <p>
              Total: <strong>R$ {Number(order.total || order.amount || 0).toFixed(2)}</strong>
            </p>
          </article>
        )
      })}
    </section>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import {
  createOrder,
  createStripePaymentIntent,
  fetchOrderById,
  fetchPaymentByReference,
  forceMarkPaymentPaid,
} from '../api/orders'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForOrderPaid(orderId, attempts = 8, intervalMs = 1000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const latestOrder = await fetchOrderById(orderId)
    const latestStatus = (latestOrder?.status || latestOrder?.resposta?.status || '').toUpperCase()
    if (latestStatus === 'PAID') {
      return true
    }
    await sleep(intervalMs)
  }

  return false
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, setBackendUserId: persistBackendUserId } = useAuth()
  const { items, subtotal, shipping, total, clearCart } = useCart()
  const [address, setAddress] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [backendUserId, setLocalBackendUserId] = useState(() => user?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  const stripe = useStripe()
  const elements = useElements()
  const hasBackendUserId = Boolean(backendUserId)
  const stripePublishableConfigured = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

  const handleConfirm = async () => {
    setError('')
    setPaymentMessage('')
    setPaymentReference('')
    setLoading(true)

    try {
      if (!stripePublishableConfigured) {
        setPaymentMessage('Pagamento Stripe indisponivel ate configurar VITE_STRIPE_PUBLISHABLE_KEY no front.')
        return
      }

      if (!stripe || !elements) {
        throw new Error('Stripe ainda nao carregou no navegador. Tente novamente em instantes.')
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Campo de cartao do Stripe nao esta disponivel.')
      }

      const trimmedHolder = cardHolder.trim()
      if (trimmedHolder.length < 3) {
        throw new Error('Informe o nome do titular do cartao.')
      }

      setPaymentMessage('Criando pedido...')
      const createdOrder = await createOrder({
        userId: backendUserId,
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
      })

      const createdOrderId = createdOrder?.id || createdOrder?.pedidoId || createdOrder?.orderId
      if (createdOrderId) {
        setPaymentMessage('Criando intencao de pagamento no Stripe...')
        const payment = await createStripePaymentIntent({
          orderId: createdOrderId,
          amount: total,
        })

        if (!payment?.paymentReference) {
          throw new Error('Pagamento criado sem referencia Stripe.')
        }

        setPaymentReference(payment.paymentReference)
        setPaymentMessage('Confirmando cartao com Stripe...')

        const result = await stripe.confirmCardPayment(payment.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: trimmedHolder,
              address: {
                line1: address.trim(),
              },
            },
          },
        })

        if (result.error) {
          throw new Error(result.error.message || 'Nao foi possivel confirmar o pagamento no Stripe.')
        }

        const paymentIntent = result.paymentIntent
        if (!paymentIntent) {
          throw new Error('Stripe nao retornou a intencao de pagamento.')
        }

        if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing') {
          throw new Error(`Pagamento nao concluido. Status atual: ${paymentIntent.status}.`)
        }

        setPaymentMessage(
          paymentIntent.status === 'processing'
            ? `Pagamento em processamento. Referencia: ${payment.paymentReference}`
            : `Pagamento aprovado no Stripe. Referencia: ${payment.paymentReference}`,
        )

        if (paymentIntent.status === 'succeeded') {
          setPaymentMessage('Pagamento aprovado. Sincronizando status no backend...')

          let paymentSynced = false
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const latestPayment = await fetchPaymentByReference(payment.paymentReference)
            const paymentStatus = (latestPayment?.status || latestPayment?.resposta?.status || '').toUpperCase()

            if (paymentStatus === 'PAID') {
              paymentSynced = true
              break
            }

            await sleep(1000)
          }

          if (!paymentSynced) {
            setPaymentMessage('Sincronizacao lenta detectada. Aplicando confirmacao no backend...')
            await forceMarkPaymentPaid(payment.paymentReference)
          }

          const orderPaid = await waitForOrderPaid(createdOrderId)
          if (orderPaid) {
            setPaymentMessage(`Pedido confirmado como PAID. Referencia Stripe: ${payment.paymentReference}`)
          } else {
            setPaymentMessage(`Pagamento confirmado. Pedido ainda sincronizando. Referencia Stripe: ${payment.paymentReference}`)
          }
        }

        clearCart()
        navigate('/orders')
      } else {
        throw new Error('Pedido criado sem identificador. Nao foi possivel iniciar o pagamento.')
      }
    } catch (err) {
      setError(err.message || 'Nao foi possivel finalizar o pedido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="stack-lg">
      <div>
        <span className="eyebrow">Finalizacao segura</span>
        <h1>Checkout</h1>
      </div>

      <div className="checkout-grid">
      <div className="card stack-md">
        <label>
          Endereco de entrega
          <textarea
            rows={4}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Rua, numero, cidade, estado e CEP"
            required
          />
        </label>
        {hasBackendUserId ? (
          <p className="muted">Pedido vinculado ao usuario #{backendUserId} autenticado.</p>
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
              placeholder="Obrigatorio para criar pedido"
              required
            />
          </label>
        )}

        <div className="stack-sm payment-methods">
          <h2>Pagamento com Stripe</h2>
          <p className="muted">
            O front confirma o PaymentIntent criado pelo backend usando o cartao de teste do Stripe.
          </p>
          {!stripePublishableConfigured && (
            <p className="muted">
              Configure VITE_STRIPE_PUBLISHABLE_KEY em .env.local e reinicie o Vite para habilitar a confirmação do cartão.
            </p>
          )}
          <label>
            Nome no cartao
            <input
              type="text"
              value={cardHolder}
              onChange={(event) => setCardHolder(event.target.value)}
              placeholder="Fulano de Teste"
              autoComplete="cc-name"
            />
          </label>
          {stripePublishableConfigured ? (
            <>
              <div className="payment-box">
                <label className="stack-sm">
                  Cartao
                  <CardElement
                    options={{
                      hidePostalCode: true,
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#172033',
                          '::placeholder': {
                            color: '#8a97ab',
                          },
                        },
                        invalid: {
                          color: '#d14545',
                        },
                      },
                    }}
                  />
                </label>
              </div>
              <p className="muted">
                Cartao de teste: 4242 4242 4242 4242, qualquer CVC e validade futura.
              </p>
            </>
          ) : (
            <p className="muted">
              O campo de cartao aparece assim que VITE_STRIPE_PUBLISHABLE_KEY estiver definido e o servidor for reiniciado.
            </p>
          )}
        </div>

        {paymentMessage && <p className="muted">{paymentMessage}</p>}
        {paymentReference && <p className="muted">Referencia Stripe: {paymentReference}</p>}
        {error && <p className="error-text">{error}</p>}
        <button
          type="button"
          className="btn"
          disabled={loading || !address || !backendUserId || !items.length || !stripePublishableConfigured}
          onClick={handleConfirm}
        >
          {loading ? 'Processando...' : 'Pagar com Stripe e confirmar pedido'}
        </button>
      </div>

      <aside className="card stack-md summary-card">
        <h2>Resumo do pedido</h2>
        {items.map((item) => (
          <div className="row-between" key={item.id}>
            <span>
              {item.name} x {item.quantity}
            </span>
            <strong>R$ {(Number(item.price || 0) * item.quantity).toFixed(2)}</strong>
          </div>
        ))}
        <div className="row-between">
          <span>Subtotal</span>
          <strong>R$ {subtotal.toFixed(2)}</strong>
        </div>
        <div className="row-between">
          <span>Frete</span>
          <strong>R$ {shipping.toFixed(2)}</strong>
        </div>
        <div className="row-between total-row">
          <span>Total</span>
          <strong>R$ {total.toFixed(2)}</strong>
        </div>
      </aside>
      </div>
    </section>
  )
}

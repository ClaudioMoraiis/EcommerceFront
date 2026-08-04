import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'

export function CartPage() {
  const navigate = useNavigate()
  const { items, subtotal, shipping, total, updateQuantity, removeFromCart } = useCart()
  const [coupon, setCoupon] = useState('')

  if (!items.length) {
    return (
      <section className="card stack-md">
        <h1>Seu carrinho esta vazio</h1>
        <p className="muted">Adicione produtos para continuar.</p>
        <Link to="/" className="btn">
          Ver produtos
        </Link>
      </section>
    )
  }

  return (
    <section className="stack-lg">
      <div className="row-between">
        <h1>Carrinho de compras</h1>
        <span className="chip">{items.length} itens</span>
      </div>

      <div className="cart-grid">
      <div className="stack-md">
        {items.map((item) => (
          <article key={item.id} className="card cart-item">
            <img
              src={item.imageUrl || item.image || 'https://placehold.co/180x120?text=Produto'}
              alt={item.name}
            />
            <div className="stack-sm">
              <h3>{item.name}</h3>
              <p className="muted">R$ {Number(item.price || 0).toFixed(2)}</p>
            </div>
            <label>
              Qtd
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => removeFromCart(item.id)}
            >
              Remover
            </button>
          </article>
        ))}
      </div>

      <aside className="card stack-md summary-card">
        <h2>Resumo</h2>
        <label>
          Cupom de desconto
          <div className="row-gap">
            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="Ex.: BEMVINDO10"
            />
            <button type="button" className="btn btn-ghost" disabled>
              Aplicar
            </button>
          </div>
        </label>
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
        <button type="button" className="btn" onClick={() => navigate('/checkout')}>
          Ir para checkout
        </button>
      </aside>
      </div>
    </section>
  )
}

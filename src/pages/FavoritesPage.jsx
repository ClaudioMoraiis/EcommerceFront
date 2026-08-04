import { Link, useNavigate } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'

export function FavoritesPage() {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { favoriteItems, loading, error } = useFavorites()

  const handleBuyNow = (product) => {
    addToCart(product)
    navigate('/checkout')
  }

  if (loading) return <p className="muted">Carregando favoritos...</p>

  return (
    <section className="stack-lg">
      <div className="card stack-sm">
        <span className="eyebrow">Meus favoritos</span>
        <h1>Produtos salvos</h1>
        <p className="muted">Clique no coracao para remover ou nos cards para ver os detalhes.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!error && !favoriteItems.length && (
        <div className="card stack-sm">
          <h2>Sem favoritos ainda</h2>
          <p className="muted">Salve produtos no coracao para acessar depois.</p>
          <Link className="btn btn-soft btn-detail" to="/">
            Ver produtos
          </Link>
        </div>
      )}

      {!!favoriteItems.length && (
        <div className="products-grid">
          {favoriteItems.map((product) => (
            <ProductCard key={`favorite-${product.id}`} product={product} onAdd={handleBuyNow} />
          ))}
        </div>
      )}
    </section>
  )
}

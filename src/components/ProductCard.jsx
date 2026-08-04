import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFavorites } from '../contexts/FavoritesContext'

export function ProductCard({ product, onAdd }) {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { isFavorited, toggleFavorite } = useFavorites()
  const currentPrice = Number(product.price || 0)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const favorited = isFavorited(product.id)

  const openDetails = () => {
    navigate(`/products/${product.id}`)
  }

  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDetails()
    }
  }

  const handleFavoriteClick = async (event) => {
    event.stopPropagation()
    event.preventDefault()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (!user?.id) {
      navigate('/orders')
      return
    }

    if (favoriteBusy) {
      return
    }

    setFavoriteBusy(true)
    try {
      await toggleFavorite(product)
    } finally {
      setFavoriteBusy(false)
    }
  }

  return (
    <article
      className="card product-card"
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
    >
      <div className="product-image-wrap">
        <img
          src={product.imageUrl || product.image || 'https://placehold.co/600x420?text=Produto'}
          alt={product.name}
        />
        <button
          type="button"
          className={`favorite-btn ${favorited ? 'favorite-btn-active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={favorited}
          disabled={favoriteBusy}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 20L4.8 13.2C3.1 11.6 3.1 8.9 4.8 7.3C6.4 5.8 9 5.8 10.6 7.3L12 8.6L13.4 7.3C15 5.8 17.6 5.8 19.2 7.3C20.9 8.9 20.9 11.6 19.2 13.2L12 20Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill={favorited ? 'currentColor' : 'none'}
            />
          </svg>
          <span className="sr-only">{favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}</span>
        </button>
      </div>
      <div className="product-body">
        <h3>{product.name}</h3>
        <p className="muted line-clamp">{product.description || 'Sem descricao.'}</p>
        <div className="row-between">
          <div className="price-block">
            <strong>R$ {currentPrice.toFixed(2)}</strong>
          </div>
          <span className="chip">{product.categoryName || `Categoria ${product.categoryId || '-'}`}</span>
        </div>
        <p className="muted">Vendidos: {Number(product.soldQuantity || 0)}</p>
        <p className="muted">Estoque: {Number(product.stock || 0)}</p>
        <div className="product-actions">
          <Link className="btn btn-soft btn-detail" to={`/products/${product.id}`}>
            Detalhes
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-buy"
            onClick={(event) => {
              event.stopPropagation()
              onAdd(product)
            }}
          >
            Comprar
          </button>
        </div>
      </div>
    </article>
  )
}

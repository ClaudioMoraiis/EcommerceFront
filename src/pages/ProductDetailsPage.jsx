import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createProductReview,
  fetchProductById,
  fetchProductReviewAverage,
  fetchProductReviews,
} from '../api/catalog'
import { fetchUserNameById } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'

function toStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)))
  const fullStars = '★'.repeat(safeRating)
  const emptyStars = '☆'.repeat(5 - safeRating)
  return `${fullStars}${emptyStars}`
}

function formatDate(value) {
  if (!value) return 'Data indisponivel'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Data indisponivel'

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function resolveReviewAuthorName(review, loggedUser) {
  if (!review) return 'Usuario'

  if (review.userName && String(review.userName).trim()) {
    return String(review.userName).trim()
  }

  const reviewUserId = Number(review.userId || 0)
  const loggedUserId = Number(loggedUser?.id || 0)
  if (reviewUserId > 0 && loggedUserId > 0 && reviewUserId === loggedUserId) {
    return loggedUser?.name || loggedUser?.email || `Usuario #${reviewUserId}`
  }

  if (reviewUserId > 0) {
    return `Usuario #${reviewUserId}`
  }

  return 'Usuario'
}

export function ProductDetailsPage() {
  const { productId } = useParams()
  const { addToCart } = useCart()
  const { isAuthenticated, user } = useAuth()
  const { isFavorited, toggleFavorite } = useFavorites()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewAverage, setReviewAverage] = useState({ average: 0, count: 0, histogram: [0, 0, 0, 0, 0, 0] })
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewSubmitError, setReviewSubmitError] = useState('')
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState('')

  const loadReviews = async () => {
    setReviewsLoading(true)
    setReviewsError('')

    try {
      const [list, average] = await Promise.all([
        fetchProductReviews(productId),
        fetchProductReviewAverage(productId),
      ])

      const missingNameUserIds = [
        ...new Set(
          list
            .filter((review) => !review?.userName && Number(review?.userId || 0) > 0)
            .map((review) => Number(review.userId)),
        ),
      ]

      const userNameEntries = await Promise.all(
        missingNameUserIds.map(async (id) => {
          try {
            const name = await fetchUserNameById(id)
            return [id, name]
          } catch {
            return [id, null]
          }
        }),
      )

      const userNameMap = Object.fromEntries(userNameEntries)
      const enrichedReviews = list.map((review) => {
        if (review?.userName) {
          return review
        }

        const lookupName = userNameMap[Number(review?.userId || 0)]
        if (lookupName) {
          return {
            ...review,
            userName: lookupName,
          }
        }

        return review
      })

      setReviews(enrichedReviews)
      setReviewAverage(average)
    } catch (err) {
      setReviewsError(err.message || 'Falha ao carregar avaliacoes do produto.')
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const [data] = await Promise.all([
          fetchProductById(productId),
          loadReviews(),
        ])
        setProduct(data)
        setActiveImageIndex(0)
      } catch (err) {
        setError(err.message || 'Falha ao carregar produto.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [productId])

  if (loading) return <p className="muted">Carregando detalhe do produto...</p>
  if (error) return <p className="error-text">{error}</p>
  if (!product) return <p className="muted">Produto nao encontrado.</p>

  const price = Number(product.price || 0)
  const stock = Number(product.stock || 0)
  const favorited = isFavorited(product.id)
  const fallbackImage = 'https://placehold.co/720x520?text=Produto'
  const productImages = Array.isArray(product.images) && product.images.length
    ? product.images.map((image) => {
      if (typeof image === 'string' && /^(https?:)?\/\//.test(image)) {
        return image
      }

      return `${API_BASE_URL}/produto-imagem/produto/${product.id}/images/${image}`
    })
    : [product.imageUrl || product.image || fallbackImage]
  const safeImageIndex = Math.min(activeImageIndex, productImages.length - 1)
  const activeImage = productImages[safeImageIndex] || fallbackImage

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % productImages.length)
  }

  const handlePreviousImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length)
  }

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      return
    }

    if (!user?.id) {
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

  const handleReviewSubmit = async (event) => {
    event.preventDefault()
    setReviewSubmitError('')
    setReviewSubmitSuccess('')

    if (!isAuthenticated || !user?.id) {
      setReviewSubmitError('Seu login atual nao trouxe o ID do usuario. Saia e entre novamente para avaliar com seu nome.')
      return
    }

    setReviewSaving(true)

    try {
      await createProductReview({
        productId,
        userId: user?.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      setReviewForm({ rating: 5, comment: '' })
      setReviewSubmitSuccess('Avaliacao enviada com sucesso.')
      await loadReviews()
    } catch (err) {
      setReviewSubmitError(err.message || 'Nao foi possivel enviar sua avaliacao.')
    } finally {
      setReviewSaving(false)
    }
  }

  const chartData = [5, 4, 3, 2, 1, 0].map((value) => ({
    value,
    count: Number(reviewAverage?.histogram?.[value] || 0),
  }))
  const maxHistogramValue = Math.max(...chartData.map((item) => item.count), 1)

  return (
    <section className="stack-lg">
      <article className="product-detail card">
        <div className="product-gallery">
          <div className="gallery-main">
            <img src={activeImage} alt={`${product.name} - foto ${safeImageIndex + 1}`} />
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav gallery-nav-prev"
                  onClick={handlePreviousImage}
                  aria-label="Ver foto anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="gallery-nav gallery-nav-next"
                  onClick={handleNextImage}
                  aria-label="Ver proxima foto"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {productImages.length > 1 && (
            <div className="gallery-thumbs" role="tablist" aria-label="Miniaturas do produto">
              {productImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`gallery-thumb ${index === safeImageIndex ? 'gallery-thumb-active' : ''}`}
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-selected={index === safeImageIndex}
                >
                  <img src={image} alt={`${product.name} miniatura ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="stack-md">
          <div className="row-between product-detail-head">
            <div className="stack-sm">
              <span className="eyebrow">Detalhe do produto</span>
              <h1>{product.name}</h1>
            </div>
            {isAuthenticated && (
              <button
                type="button"
                className={`btn btn-soft favorite-inline-btn ${favorited ? 'favorite-inline-btn-active' : ''}`}
                onClick={handleFavoriteClick}
                aria-pressed={favorited}
                aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
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
                {favorited ? 'Favoritado' : 'Favoritar'}
              </button>
            )}
          </div>
          <p className="price">R$ {price.toFixed(2)}</p>
          <div className="stock-card">
            <div>
              <span className="eyebrow">Saldo em estoque</span>
              <strong>{stock}</strong>
            </div>
            <span className={`stock-badge ${stock > 10 ? 'stock-badge-ok' : stock > 0 ? 'stock-badge-low' : 'stock-badge-empty'}`}>
              {stock > 10 ? 'Disponivel' : stock > 0 ? 'Estoque baixo' : 'Indisponivel'}
            </span>
          </div>
          <div className="product-actions product-actions-detail">
            <button type="button" className="btn btn-primary btn-buy" onClick={() => addToCart(product)}>
              Adicionar ao carrinho
            </button>
            <Link className="btn btn-soft btn-detail" to="/cart">
              Comprar agora
            </Link>
          </div>
        </div>
      </article>

      <article className="card stack-md">
        <h2>Descricao do produto</h2>
        <p className="muted">{product.description || 'Sem descricao disponivel para este produto.'}</p>
      </article>

      <article className="card stack-md">
        <h2>Especificacoes</h2>
        <div className="spec-grid">
          <div><strong>Categoria</strong><p className="muted">{product.categoryName || `Categoria ${product.categoryId || '-'}`}</p></div>
          <div><strong>Disponibilidade</strong><p className="muted">{stock > 0 ? 'Em estoque' : 'Indisponivel'}</p></div>
          <div><strong>SKU</strong><p className="muted">PROD-{product.id}</p></div>
          <div><strong>Garantia</strong><p className="muted">12 meses</p></div>
        </div>
      </article>

      <article className="card stack-md">
        <h2>Avaliacoes do produto</h2>

        {reviewsLoading ? (
          <p className="muted">Carregando avaliacoes...</p>
        ) : (
          <div className="review-summary-grid">
            <div className="review-average-card">
              <p className="eyebrow">Media geral</p>
              <p className="review-average-value">{Number(reviewAverage.average || 0).toFixed(1)}</p>
              <p className="stars">{toStars(Math.round(reviewAverage.average || 0))}</p>
              <p className="muted">{reviewAverage.count} avaliacao(oes)</p>
            </div>

            <div className="review-histogram">
              {chartData.map((item) => (
                <div className="review-histogram-row" key={item.value}>
                  <span>{item.value}★</span>
                  <div className="review-histogram-bar-wrap">
                    <div
                      className="review-histogram-bar"
                      style={{ width: `${(item.count / maxHistogramValue) * 100}%` }}
                    />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviewsError && <p className="error-text">{reviewsError}</p>}

        <form className="review-form" onSubmit={handleReviewSubmit}>
          <label>
            Sua nota
            <select
              value={reviewForm.rating}
              onChange={(event) =>
                setReviewForm((current) => ({
                  ...current,
                  rating: Number(event.target.value),
                }))
              }
            >
              <option value={5}>5 - Excelente</option>
              <option value={4}>4 - Muito bom</option>
              <option value={3}>3 - Bom</option>
              <option value={2}>2 - Regular</option>
              <option value={1}>1 - Ruim</option>
              <option value={0}>0 - Pessimo</option>
            </select>
          </label>

          <label>
            Comentario (opcional)
            <textarea
              rows={3}
              value={reviewForm.comment}
              onChange={(event) =>
                setReviewForm((current) => ({
                  ...current,
                  comment: event.target.value,
                }))
              }
              placeholder="Conte sua experiencia com este produto"
            />
          </label>

          {reviewSubmitError && <p className="error-text">{reviewSubmitError}</p>}
          {reviewSubmitSuccess && <p className="muted review-success">{reviewSubmitSuccess}</p>}

          {!user?.id && (
            <p className="muted">Sem ID de usuario na sessao atual. Entre novamente para enviar avaliacao com seu nome.</p>
          )}

          <button type="submit" className="btn" disabled={reviewSaving || !user?.id}>
            {reviewSaving ? 'Enviando avaliacao...' : 'Enviar avaliacao'}
          </button>
        </form>

        <div className="stack-sm">
          {reviews.length === 0 && !reviewsLoading ? (
            <p className="muted">Este produto ainda nao possui avaliacoes.</p>
          ) : (
            reviews.map((review) => (
              <article className="review-card" key={review.id || `${review.userId}-${review.createdAt}`}>
                <div className="review-card-head">
                  <strong>{resolveReviewAuthorName(review, user)}</strong>
                  <span className="muted">{formatDate(review.createdAt)}</span>
                </div>
                <p className="stars">{toStars(Math.round(review.rating || 0))}</p>
                {review.comment ? (
                  <p className="muted">{review.comment}</p>
                ) : (
                  <p className="muted">Sem comentario.</p>
                )}
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  )
}

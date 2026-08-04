import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCategories, fetchProducts } from '../api/catalog'
import { ProductCard } from '../components/ProductCard'
import { useCart } from '../contexts/CartContext'

export function HomePage() {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleBuyNow = (product) => {
    addToCart(product)
    navigate('/checkout')
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts({ categoryId, search }),
          fetchCategories(),
        ])
        setProducts(productsData)
        setCategories(categoriesData)
      } catch (err) {
        setError(err.message || 'Falha ao carregar produtos.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [categoryId, search])

  const content = useMemo(() => {
    if (loading) {
      return <p className="muted">Carregando produtos...</p>
    }

    if (error) {
      return <p className="error-text">{error}</p>
    }

    if (!products.length) {
      return <p className="muted">Nenhum produto encontrado.</p>
    }

    return (
      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={handleBuyNow} />
        ))}
      </div>
    )
  }, [loading, error, products, handleBuyNow])

  const displayedProducts = useMemo(() => products.slice(0, 12), [products])

  return (
    <section className="home-page">
      <section className="card stack-sm">
        <span className="eyebrow">Catalogo</span>
        <h1>Produtos da loja</h1>
        <p className="muted">Visualize produtos e filtre por nome ou categoria.</p>
      </section>

      <div className="home-grid">
        <aside className="card filters-panel stack-md">
          <div>
            <span className="eyebrow">Filtros</span>
            <h2>Encontre rapido</h2>
          </div>

          <label>
            Buscar por nome
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: Fone, Teclado, Monitor"
            />
          </label>

          <label>
            Filtrar por categoria
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name || category.nome}
                </option>
              ))}
            </select>
          </label>

          {categories.length > 0 && (
            <div className="category-shortcuts">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={categoryId === category.id ? 'chip chip-active' : 'chip'}
                  onClick={() =>
                    setCategoryId((prev) => (prev === category.id ? '' : category.id))
                  }
                >
                  {category.name || category.nome}
                </button>
              ))}
            </div>
          )}

        </aside>

        <div className="home-content stack-lg">
          {categories.length > 0 && (
            <section className="card categories-showcase">
              <div className="row-between">
                <h2>Categorias</h2>
                <span className="muted">Navegue por tipo</span>
              </div>
              <div className="category-grid">
                {categories.slice(0, 8).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="category-card"
                    onClick={() => setCategoryId(String(category.id))}
                  >
                    <strong>{category.name || category.nome}</strong>
                    <span className="muted">Ver produtos</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!loading && !error && (
            <p className="muted result-count">
              {products.length}{' '}
              {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
          )}

          <section className="stack-md">
            <div className="row-between">
              <h2>Produtos</h2>
              <span className="muted">Resultados atuais</span>
            </div>
            {loading || error ? content : (
              <div className="products-grid">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={handleBuyNow} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}

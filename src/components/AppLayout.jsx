import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'

export function AppLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const { items } = useCart()
  const { favoriteCount } = useFavorites()
  const [headerHidden, setHeaderHidden] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)

  useEffect(() => {
    const onScroll = () => {
      const atTop = window.scrollY <= 24
      setHeaderHidden(!atTop)
      if (!atTop) {
        setMobileMenuOpen(false)
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="app-shell">
      <header
        className={`topbar${headerHidden ? ' is-hidden' : ''}${mobileMenuOpen ? ' is-open' : ''}`}
      >
        <div className="topbar-main">
          <div className="brand-wrap">
            <Link className="brand" to="/">
              Ecommerce Hub
            </Link>
            <span className="brand-tag">Compre facil, receba rapido</span>
          </div>

          <button
            type="button"
            className="menu-toggle"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <form className="header-search" onSubmit={(event) => event.preventDefault()}>
            <input
              type="search"
              placeholder="Buscar produtos, marcas e categorias"
              aria-label="Buscar produtos"
            />
            <button type="button" className="search-btn" aria-label="Buscar">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          <div className="user-actions">
            {isAuthenticated ? (
              <>
                <span className="user-pill">{user?.name || user?.email}</span>
                <span className="user-pill">ID backend: {user?.id || 'nao informado'}</span>
                <button type="button" className="btn btn-ghost" onClick={logout}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost" to="/login">
                  Login
                </Link>
                <Link className="btn" to="/register">
                  Cadastro
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="topbar-center">
          <p className="topbar-note">Frete gratis acima de R$ 299,90 para regioes selecionadas</p>

          <div className="header-shortcuts">
            <button type="button" className="shortcut-btn shortcut-notify" aria-label="Notificacoes">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3C9.24 3 7 5.24 7 8V10.8C7 11.48 6.78 12.15 6.37 12.7L5 14.5H19L17.63 12.7C17.22 12.15 17 11.48 17 10.8V8C17 5.24 14.76 3 12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 18C10.4 19.2 11.1 20 12 20C12.9 20 13.6 19.2 14 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {!isAdmin && (
              <Link to="/favorites" className="shortcut-btn" aria-label="Favoritos">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20L4.8 13.2C3.1 11.6 3.1 8.9 4.8 7.3C6.4 5.8 9 5.8 10.6 7.3L12 8.6L13.4 7.3C15 5.8 17.6 5.8 19.2 7.3C20.9 8.9 20.9 11.6 19.2 13.2L12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                {favoriteCount > 0 && <span className="shortcut-badge">{favoriteCount}</span>}
              </Link>
            )}
            <Link to="/cart" className="shortcut-btn shortcut-cart" aria-label="Carrinho">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 5H5L6.4 13H17.8L20 7H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="18" r="1.4" fill="currentColor" />
                <circle cx="17" cy="18" r="1.4" fill="currentColor" />
              </svg>
              <span className="shortcut-badge">{totalItems}</span>
            </Link>
          </div>

          <nav className="menu">
            {isAdmin ? (
              <NavLink to="/admin">Cadastros</NavLink>
            ) : (
              <>
                <NavLink to="/" end>
                  Produtos
                </NavLink>
                <NavLink to="/orders">Pedidos</NavLink>
                <NavLink to="/cart">Carrinho</NavLink>
              </>
            )}
          </nav>

          {!isAdmin && (
            <nav className="categories-menu" aria-label="Categorias">
              <button type="button" className="categories-trigger">Todas as categorias</button>
              <a href="#destaques">Destaques</a>
              <a href="#ofertas">Ofertas do dia</a>
              <a href="#mais-vendidos">Mais vendidos</a>
              <a href="#recentes">Recentes</a>
              <a href="#marcas">Marcas</a>
            </nav>
          )}
        </div>
      </header>

      <main className="main-content">
        {isAuthenticated && !isAdmin && !user?.id && (
          <div className="card">
            <p className="muted">
              Informe o User ID no backend em "Pedidos" ou "Checkout" para criar e consultar pedidos.
            </p>
          </div>
        )}
        <Outlet />
      </main>

      <footer className="footer card">
        <div>
          <strong>Ecommerce Hub</strong>
          <p className="muted">Tecnologia, casa e estilo com entrega para todo o Brasil.</p>
        </div>
        <div className="footer-links">
          {isAdmin ? (
            <Link to="/admin">Cadastros</Link>
          ) : (
            <>
              <Link to="/">Produtos</Link>
              <Link to="/favorites">Favoritos</Link>
              <Link to="/orders">Meus pedidos</Link>
              <Link to="/cart">Carrinho</Link>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}

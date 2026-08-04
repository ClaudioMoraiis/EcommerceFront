import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="card stack-md">
      <h1>Pagina nao encontrada</h1>
      <p className="muted">O caminho informado nao existe.</p>
      <Link to="/" className="btn">
        Voltar para home
      </Link>
    </section>
  )
}

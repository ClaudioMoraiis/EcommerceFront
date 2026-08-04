import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordResetApi } from '../api/auth'

function extractTokenFromMessage(message) {
  const text = String(message || '')
  const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return uuidMatch ? uuidMatch[0] : ''
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [token, setToken] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setToken('')
    setLoading(true)

    try {
      const message = await requestPasswordResetApi(email)
      setSuccess(message)
      setToken(extractTokenFromMessage(message))
    } catch (err) {
      setError(err.message || 'Nao foi possivel solicitar a recuperacao de senha.')
    } finally {
      setLoading(false)
    }
  }

  const resetUrl = token
    ? `${window.location.origin}/reset-password?token=${encodeURIComponent(token)}`
    : ''

  return (
    <section className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Recuperacao</span>
        <h1>Esqueci minha senha</h1>
        <p className="muted">Informe seu e-mail para receber o token de redefinicao.</p>

        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="muted">{success}</p>}
        {token && (
          <>
            <p className="muted">Token detectado: {token}</p>
            <p className="muted">Link direto: <a href={resetUrl}>{resetUrl}</a></p>
            <a className="btn btn-secondary" href={resetUrl}>
              Ir direto para redefinir senha
            </a>
          </>
        )}

        <button type="submit" className="btn" disabled={loading || !email}>
          {loading ? 'Enviando...' : 'Enviar token'}
        </button>

        <p className="muted">
          Ja tem token? <Link to="/reset-password">Redefinir senha</Link>
        </p>
        <p className="muted">
          Voltar para <Link to="/login">login</Link>
        </p>
      </form>
    </section>
  )
}

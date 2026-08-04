import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPasswordApi } from '../api/auth'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }

    setLoading(true)

    try {
      await resetPasswordApi({ token, password })
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Nao foi possivel redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Seguranca</span>
        <h1>Redefinir senha</h1>
        <p className="muted">Cole o token recebido e defina uma nova senha.</p>

        <label>
          Token de recuperacao
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Cole o token recebido por e-mail"
            required
          />
        </label>

        <label>
          Nova senha
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <label>
          Confirmar nova senha
          <input
            type="password"
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          className="btn"
          disabled={loading || !token || !password || !confirmPassword}
        >
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>

        <p className="muted">
          Nao recebeu token? <Link to="/forgot-password">Solicitar novamente</Link>
        </p>
      </form>
    </section>
  )
}

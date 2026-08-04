import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Nao foi possivel cadastrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Nova conta</span>
        <h1>Criar conta</h1>
        <p className="muted">Cadastro rapido para iniciar as compras.</p>

        <label>
          Nome
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>

        <label>
          E-mail
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>

        <label>
          Senha
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              minLength={6}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <button
              type="button"
              className="btn btn-ghost password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <svg
                className="password-toggle-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2 12C3.8 8.5 7.2 6 12 6C16.8 6 20.2 8.5 22 12C20.2 15.5 16.8 18 12 18C7.2 18 3.8 15.5 2 12Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                {!showPassword && (
                  <path
                    d="M4 20L20 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <span className="sr-only">{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</span>
            </button>
          </div>
        </label>

        <label>
          Perfil
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            <option value="CUSTOMER">Cliente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Criando...' : 'Cadastrar'}
        </button>

        <p className="muted">
          Ja possui conta? <Link to="/login">Fazer login</Link>
        </p>
      </form>
    </section>
  )
}

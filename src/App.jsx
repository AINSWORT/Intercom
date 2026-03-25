import { useState } from 'react'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    alert(`Iniciando sesión como ${email}`)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">N</div>
          <h1>Bienvenido a NetTrack Pro</h1>
          <p>Inicia sesión para continuar</p>
        </div>

        <button type="button" className="button-google">
          <span>G</span>
          Continuar con Google
        </button>

        <div className="divider">o</div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tú@ejemplo.com"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" className="button-submit">Iniciar sesión</button>
        </form>
      </div>
    </div>
  )
}

export default App
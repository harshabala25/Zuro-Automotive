import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/buy'
    })
  }, [])

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    window.location.href = '/buy'
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#111',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#000',
        padding: '40px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <img
          src="/ZuroRecLog.png"
          alt="Zuro"
          style={{ height: 40, marginBottom: 28 }}
        />

        <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 22, alignSelf: 'center' }}>
          Welcome Back
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />

        {error && (
          <p style={{ color: '#ff4444', marginBottom: 12, fontSize: 14, alignSelf: 'flex-start' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p style={{ color: '#666', marginTop: 20, fontSize: 14, textAlign: 'center' }}>
          Don't have an account?{' '}
          <a href="/signup" style={{ color: '#00aaff', textDecoration: 'none' }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  marginBottom: '14px',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '15px',
  boxSizing: 'border-box',
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  backgroundColor: '#00aaff',
  color: '#000',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '4px',
}
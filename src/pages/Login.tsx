import { useState, type FormEvent } from 'react'
import { supabase, traducirError } from '../lib/supabase'
import { Aviso } from '../components/ui'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave })
    if (error) setError(traducirError(error))
    setEnviando(false)
  }

  return (
    <div className="login">
      <form className="login-caja" onSubmit={entrar}>
        <img src="/guante.svg" alt="" width={56} height={56} />
        <h1>GymBoxing Kaly Jr</h1>
        <p className="tenue">Acceso para el staff del gimnasio</p>
        <label>Correo
          <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} required autoFocus autoComplete="username" />
        </label>
        <label>Contraseña
          <input type="password" value={clave} onChange={e => setClave(e.target.value)} required autoComplete="current-password" />
        </label>
        <Aviso>{error}</Aviso>
        <button className="btn" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}

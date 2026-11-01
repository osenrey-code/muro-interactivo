import React, { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db, firebaseReady } from './firebase'

const emptyAuthForm = { username: '', password: '', firstName: '', lastName: '' }

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@muro-interactivo.local`
}

function formatDate(value) {
  if (!value?.toDate) return 'Ahora mismo'
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(value.toDate())
}

export default function App() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [mode, setMode] = useState('login')
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [postText, setPostText] = useState('')
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!firebaseReady) {
      setLoadingPosts(false)
      return undefined
    }

    const unsubscribeAuth = onAuthStateChanged(auth, setUser)
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map((post) => ({ id: post.id, ...post.data() })))
      setLoadingPosts(false)
    }, () => {
      setFeedback({ type: 'error', text: 'No se pudieron cargar las publicaciones. Revisa las reglas de Firestore.' })
      setLoadingPosts(false)
    })

    return () => {
      unsubscribeAuth()
      unsubscribePosts()
    }
  }, [])

  function updateAuthForm(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  async function handleAuth(event) {
    event.preventDefault()
    if (!firebaseReady) {
      setFeedback({ type: 'error', text: 'Primero configura el archivo .env.local con los datos de Firebase.' })
      return
    }

    const username = authForm.username.trim()
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username)) {
      setFeedback({ type: 'error', text: 'El usuario debe tener entre 3 y 20 caracteres: letras, números, punto, guion o guion bajo.' })
      return
    }
    if (authForm.password.length < 6) {
      setFeedback({ type: 'error', text: 'La clave debe tener al menos 6 caracteres.' })
      return
    }
    if (mode === 'register' && (!authForm.firstName.trim() || !authForm.lastName.trim())) {
      setFeedback({ type: 'error', text: 'Completa tu nombre y apellido.' })
      return
    }

    setSubmitting(true)
    setFeedback({ type: '', text: '' })
    try {
      const email = usernameToEmail(username)
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(auth, email, authForm.password)
        const displayName = `${authForm.firstName.trim()} ${authForm.lastName.trim()}`
        await updateProfile(credential.user, { displayName })
        await setDoc(doc(db, 'users', credential.user.uid), {
          username,
          firstName: authForm.firstName.trim(),
          lastName: authForm.lastName.trim(),
          createdAt: serverTimestamp(),
        })
        setFeedback({ type: 'success', text: 'Cuenta creada. Ya puedes publicar en el muro.' })
      } else {
        await signInWithEmailAndPassword(auth, email, authForm.password)
        setFeedback({ type: 'success', text: 'Sesión iniciada correctamente.' })
      }
      setAuthForm(emptyAuthForm)
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'Ese usuario ya está registrado.',
        'auth/invalid-credential': 'Usuario o clave incorrectos.',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo otra vez.',
      }
      setFeedback({ type: 'error', text: messages[error.code] || 'No fue posible completar la operación. Inténtalo de nuevo.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePost(event) {
    event.preventDefault()
    const content = postText.trim()
    if (!content || !user) return
    if (content.length > 500) {
      setFeedback({ type: 'error', text: 'La publicación puede tener un máximo de 500 caracteres.' })
      return
    }
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'posts'), {
        content,
        authorId: user.uid,
        authorName: user.displayName || 'Usuario',
        createdAt: serverTimestamp(),
      })
      setPostText('')
      setFeedback({ type: 'success', text: 'Tu publicación ya está en el muro.' })
    } catch {
      setFeedback({ type: 'error', text: 'No se pudo publicar. Revisa las reglas de Firestore.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Muro Interactivo, inicio">
          <span className="brand-mark">M</span>
          <span>Muro Interactivo</span>
        </a>
        {user ? (
          <div className="session-actions">
            <span className="welcome">Hola, {user.displayName || 'usuario'}</span>
            <button className="button button-secondary" onClick={() => signOut(auth)}>Cerrar sesión</button>
          </div>
        ) : <span className="public-label">Muro público</span>}
      </header>

      <section className="hero" id="inicio">
        <p className="eyebrow">COMUNIDAD · IDEAS · CONVERSACIÓN</p>
        <h1>Un espacio para compartir lo que importa.</h1>
        <p>Lee las publicaciones de toda la comunidad. Crea tu cuenta para dejar la tuya.</p>
      </section>

      <section className="content-grid" aria-label="Contenido del muro">
        <div className="wall-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">EN TIEMPO REAL</p>
              <h2>El muro</h2>
            </div>
            <span className="post-count">{posts.length} {posts.length === 1 ? 'publicación' : 'publicaciones'}</span>
          </div>

          {loadingPosts ? <p className="empty-state">Cargando publicaciones…</p> : posts.length === 0 ? (
            <div className="empty-state"><strong>El muro está listo.</strong><br />Sé la primera persona en publicar algo.</div>
          ) : (
            <div className="post-list">
              {posts.map((post) => <article className="post-card" key={post.id}>
                <div className="avatar" aria-hidden="true">{post.authorName?.charAt(0).toUpperCase() || 'U'}</div>
                <div>
                  <div className="post-meta"><strong>{post.authorName || 'Usuario'}</strong><span>{formatDate(post.createdAt)}</span></div>
                  <p>{post.content}</p>
                </div>
              </article>)}
            </div>
          )}
        </div>

        <aside className="side-column">
          {!firebaseReady && <div className="setup-note"><strong>Configuración pendiente</strong><p>Copia `.env.example` como `.env.local` y agrega las credenciales de Firebase.</p></div>}
          {user ? (
            <form className="panel" onSubmit={handlePost}>
              <p className="eyebrow">NUEVA PUBLICACIÓN</p>
              <h2>Comparte una idea</h2>
              <label htmlFor="postText">¿Qué quieres decir?</label>
              <textarea id="postText" value={postText} onChange={(event) => setPostText(event.target.value)} maxLength="500" placeholder="Escribe aquí tu publicación..." required />
              <div className="form-footer"><span>{postText.length}/500</span><button className="button" disabled={submitting}>{submitting ? 'Publicando…' : 'Publicar'}</button></div>
            </form>
          ) : (
            <form className="panel" onSubmit={handleAuth}>
              <p className="eyebrow">{mode === 'login' ? 'BIENVENIDO DE NUEVO' : 'ÚNETE A LA COMUNIDAD'}</p>
              <h2>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
              {mode === 'register' && <div className="name-fields">
                <label>Nombre<input name="firstName" value={authForm.firstName} onChange={updateAuthForm} autoComplete="given-name" required /></label>
                <label>Apellido<input name="lastName" value={authForm.lastName} onChange={updateAuthForm} autoComplete="family-name" required /></label>
              </div>}
              <label>Usuario<input name="username" value={authForm.username} onChange={updateAuthForm} autoComplete="username" placeholder="ej. ana.perez" required /></label>
              <label>Clave<input name="password" type="password" value={authForm.password} onChange={updateAuthForm} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="6" required /></label>
              <button className="button button-full" disabled={submitting}>{submitting ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
              <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setFeedback({ type: '', text: '' }) }}>
                {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </form>
          )}
          {feedback.text && <div className={`feedback ${feedback.type}`} role="status">{feedback.text}</div>}
        </aside>
      </section>
    </main>
  )
}

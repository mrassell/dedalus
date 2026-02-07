import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <div className="backdrop"></div>
      <main className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-symbol">δ</span>
            <span className="logo-text">Dedalus</span>
          </div>
        </header>

        <section className="hero">
          <h1 className="title">
            Build something
            <span className="title-accent"> extraordinary</span>
          </h1>
          <p className="subtitle">
            A modern React template with Vite, TypeScript, and a distinctive aesthetic.
          </p>
        </section>

        <div className="card">
          <button onClick={() => setCount((c) => c + 1)} className="button">
            <span className="button-icon">⚡</span>
            Count is {count}
          </button>
          <p className="card-hint">
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>

        <section className="features">
          <div className="feature">
            <div className="feature-icon">⚛️</div>
            <h3>React 18</h3>
            <p>Latest React with concurrent features</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔷</div>
            <h3>TypeScript</h3>
            <p>Full type safety out of the box</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Vite</h3>
            <p>Lightning fast HMR and builds</p>
          </div>
        </section>

        <footer className="footer">
          <p>Ready to create something amazing</p>
        </footer>
      </main>
    </div>
  )
}

export default App


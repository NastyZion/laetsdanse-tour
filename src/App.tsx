import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './index.css'

gsap.registerPlugin(ScrollTrigger)

// ─── Constants ───────────────────────────────────────────────────────────────
const INTRO_FRAMES = 110   // /framesintro/google_001.jpg → google_110.jpg
const WALK_FRAMES = 139   // /frames/gravilliers_001.jpg → gravilliers_139.jpg
const TOTAL_FRAMES = INTRO_FRAMES + WALK_FRAMES  // 249

/** Returns the correct image path for global frame index 0–248 */
function framePath(index: number): string {
  if (index < INTRO_FRAMES) {
    return `/framesintro/google_${String(index + 1).padStart(3, '0')}.jpg`
  }
  const num = index - INTRO_FRAMES + 1
  return `/frames/gravilliers_${String(num).padStart(3, '0')}.jpg`
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  offsetX = 0,
  offsetY = 0
) {
  const cw = canvas.width
  const ch = canvas.height
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const scale = Math.max(cw / iw, ch / ih)
  const sw = iw * scale
  const sh = ih * scale
  const dx = (cw - sw) / 2 + offsetX * 0.015 * scale
  const dy = (ch - sh) / 2 + offsetY * 0.015 * scale
  ctx.clearRect(0, 0, cw, ch)
  ctx.drawImage(img, dx, dy, sw, sh)
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`
        glasscard
        bg-white/10 backdrop-blur-lg border border-white/20
        shadow-2xl text-white rounded-3xl p-8 max-w-lg text-center
        will-change-transform
        ${className}
      `}
    >
      {children}
    </div>
  )
}

// ─── Preloader ────────────────────────────────────────────────────────────────
function Preloader({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100)
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#fdf9f6' }}
    >
      <div className="mb-10 text-center">
        <p className="text-xs tracking-[0.35em] uppercase text-pink-400 font-medium mb-1">
          Studio
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-700">
          Laet's Danse
        </h1>
      </div>
      <div className="w-56 h-0.5 bg-pink-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-pink-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-4 text-sm text-pink-400 tracking-widest font-light tabular-nums">
        {pct} %
      </p>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const framesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null))
  const currentFrameRef = useRef({ value: 0 })
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const [loadProgress, setLoadProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)

  // ── Resize ──
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')
    const img = framesRef.current[Math.round(currentFrameRef.current.value)]
    if (ctx && img) drawCover(ctx, img, canvas, mouseRef.current.x, mouseRef.current.y)
  }, [])

  // ── Render ──
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const idx = Math.max(0, Math.min(Math.round(currentFrameRef.current.value), TOTAL_FRAMES - 1))
    const img = framesRef.current[idx]
    if (img) drawCover(ctx, img, canvas, mouseRef.current.x, mouseRef.current.y)
  }, [])

  // ── Preload all 249 frames ──
  useEffect(() => {
    let done = 0
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = framePath(i)
      const finish = () => {
        done++
        setLoadProgress(done / TOTAL_FRAMES)
        if (done === TOTAL_FRAMES) {
          setLoaded(true)
        }
      }
      img.onload = () => {
        framesRef.current[i] = img
        finish()
      }
      img.onerror = finish
    }
  }, [])

  // ── Setup GSAP + interactions after load ──
  useEffect(() => {
    if (!loaded) return

    resizeCanvas()
    renderFrame()
    window.addEventListener('resize', resizeCanvas)

    // ── RAF render loop ──
    const loop = () => {
      renderFrame()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // ── Mouse parallax: canvas offset + glass card 3D float ──
    const onMouseMove = (e: MouseEvent) => {
      const mx = e.clientX - window.innerWidth / 2
      const my = e.clientY - window.innerHeight / 2
      mouseRef.current.x = mx
      mouseRef.current.y = my

      // Move glass cards in the opposite direction for a 3D floating effect
      const cards = document.querySelectorAll<HTMLElement>('.glasscard')
      gsap.to(cards, {
        x: -mx * 0.03,
        y: -my * 0.03,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }
    window.addEventListener('mousemove', onMouseMove)

    // ── GSAP ScrollTrigger: frame scrub ──
    const tl = gsap.to(currentFrameRef.current, {
      value: TOTAL_FRAMES - 1,
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      },
    })

    // ── Glass card fade + slide on scroll ──
    cardRefs.current.forEach((card) => {
      if (!card) return
      gsap.fromTo(
        card,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 82%',
            end: 'top 45%',
            scrub: false,
            toggleActions: 'play none none reverse',
          },
        }
      )
    })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', onMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      tl.scrollTrigger?.kill()
      ScrollTrigger.getAll().forEach((st) => st.kill())
    }
  }, [loaded, renderFrame, resizeCanvas])

  return (
    <>
      {/* Fixed canvas background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: -10 }}
      />

      {/* Preloader */}
      {!loaded && <Preloader progress={loadProgress} />}

      {/* ── Scrollable container — 1000vh for a majestic slow scroll ── */}
      <div ref={containerRef} className="relative h-[1000vh]">

        {/* ── Section 0 — Intro (Survolez Paris...) ── */}
        <section className="h-screen flex items-center justify-center px-6">
          <GlassCard>
            <div ref={(el) => { cardRefs.current[0] = el }}>
              <h1 className="text-3xl font-bold text-pink-400 mb-2 drop-shadow">
                Survolez Paris…
              </h1>
              <p className="text-white/90 leading-relaxed drop-shadow">
                Direction le cœur historique du Marais.
              </p>
            </div>
          </GlassCard>
        </section>

        {/* ── HUGE Spacer — The "Google Maps Plunge" (approx 350vh of pure visuals) ── */}
        <div className="h-[350vh]" />

        {/* ── Section 1 — Bienvenue dans le Marais (Arrival in the street) ── */}
        <section className="h-screen flex items-center justify-center px-6">
          <GlassCard>
            <div ref={(el) => { cardRefs.current[1] = el }}>
              <h1 className="text-3xl font-bold text-pink-400 mb-2 drop-shadow">
                Bienvenue dans le Marais
              </h1>
              <p className="text-white/90 leading-relaxed drop-shadow">
                Plongez dans l'effervescence des petites rues parisiennes,
                direction votre bulle de bien-être.
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Spacer */}
        <div className="h-[50vh]" />

        {/* ── Section 2 — 20 rue des Gravilliers ── */}
        <section className="h-screen flex items-center justify-center px-6">
          <GlassCard>
            <div ref={(el) => { cardRefs.current[2] = el }}>
              <h2 className="text-2xl font-bold text-pink-400 mb-2 drop-shadow">
                Le 20 rue des Gravilliers
              </h2>
              <p className="text-white/90 leading-relaxed drop-shadow">
                Poussez la grande porte et laissez le bruit de la ville
                derrière vous…
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Spacer */}
        <div className="h-[50vh]" />

        {/* ── Section 3 — Havre de paix ── */}
        <section className="h-screen flex items-center justify-center px-6">
          <GlassCard>
            <div ref={(el) => { cardRefs.current[3] = el }}>
              <h2 className="text-2xl font-bold text-pink-400 mb-2 drop-shadow">
                Un havre de paix
              </h2>
              <p className="text-white/90 leading-relaxed drop-shadow">
                Avancez dans l'allée. Vous y êtes presque.
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Spacer */}
        <div className="h-[50vh]" />

        {/* ── Section 4 — CTA finale (Interphone) ── */}
        <section className="h-screen flex items-center justify-center px-6">
          <GlassCard>
            <div ref={(el) => { cardRefs.current[4] = el }}>
              <h1 className="text-4xl font-bold text-pink-400 mb-4 drop-shadow">
                Laet's Danse Studio
              </h1>
              <p className="mb-6 font-medium text-white/90 drop-shadow">
                Bâtiment A. Sonnez, on vous attend avec le sourire&nbsp;!
              </p>
              <a
                href="https://wa.me/33681178159"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                💬 Discutons sur WhatsApp
              </a>
            </div>
          </GlassCard>
        </section>

      </div>
    </>
  )
}

import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './index.css'

gsap.registerPlugin(ScrollTrigger)

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
const INTRO_FRAMES = 110
const WALK_FRAMES = 139
const TOTAL_FRAMES = INTRO_FRAMES + WALK_FRAMES

function framePath(index: number): string {
  if (index < INTRO_FRAMES) return `/framesintro/google_${String(index + 1).padStart(3, '0')}.jpg`
  const num = index - INTRO_FRAMES + 1
  return `/frames/gravilliers_${String(num).padStart(3, '0')}.jpg`
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvas: HTMLCanvasElement, offsetX = 0, offsetY = 0, zoom = 1) {
  const cw = canvas.width, ch = canvas.height
  const iw = img.naturalWidth, ih = img.naturalHeight
  const scale = Math.max(cw / iw, ch / ih) * zoom
  const sw = iw * scale, sh = ih * scale
  const dx = (cw - sw) / 2 + offsetX * 0.015 * scale
  const dy = (ch - sh) / 2 + offsetY * 0.015 * scale
  ctx.clearRect(0, 0, cw, ch)
  ctx.drawImage(img, dx, dy, sw, sh)
}

// ─── COMPOSANTS ─────────────────────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`glasscard bg-white/5 backdrop-blur-md border-[4px] border-[#ff007f] shadow-[0_0_25px_rgba(255,0,127,0.6)] text-white rounded-3xl p-8 max-w-lg text-center ${className}`}>
      {children}
    </div>
  )
}

function Preloader({ progress }: { progress: number }) {
  const pct = Math.min(100, Math.round(progress * 100))
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#fdf9f6' }}>
      <h1 className="text-3xl font-bold text-gray-700 mb-4 uppercase tracking-tighter">Laet's Danse</h1>
      <div className="w-56 h-1 bg-pink-100 rounded-full overflow-hidden">
        <div className="h-full bg-pink-400 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-4 text-pink-400 font-black">{pct}%</p>
    </div>
  )
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const framesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null))
  const currentFrameRef = useRef({ value: 0 })
  const zoomRef = useRef({ value: 1 })
  const mouseRef = useRef({ x: 0, y: 0 })
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastSectionRef = useRef<HTMLDivElement>(null)

  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const idx = Math.max(0, Math.min(Math.round(currentFrameRef.current.value), TOTAL_FRAMES - 1))
    const img = framesRef.current[idx]
    if (img) drawCover(ctx, img, canvas, mouseRef.current.x, mouseRef.current.y, zoomRef.current.value)
  }, [])

  useEffect(() => {
    let count = 0
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = framePath(i)
      const check = () => {
        count++; setLoadProgress(count / TOTAL_FRAMES)
        if (count === TOTAL_FRAMES) setLoaded(true)
      }
      img.onload = () => { framesRef.current[i] = img; check(); }
      img.onerror = check
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth
      canvasRef.current.height = window.innerHeight
    }
    gsap.ticker.add(render)

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX - window.innerWidth / 2
      mouseRef.current.y = e.clientY - window.innerHeight / 2
      gsap.to('.glasscard', {
        x: mouseRef.current.x * 0.04, y: mouseRef.current.y * 0.04,
        rotateY: mouseRef.current.x * 0.02, rotateX: -mouseRef.current.y * 0.02,
        duration: 0.7
      })
    }
    window.addEventListener('mousemove', onMove)

    // 1. TIMELINE VIDEO
    const vTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      }
    })

    vTl.to(currentFrameRef.current, { value: INTRO_FRAMES, ease: 'none', duration: 3 })
    vTl.to(currentFrameRef.current, { value: INTRO_FRAMES + 13, ease: 'none', duration: 6 }, "marais")
    vTl.to(zoomRef.current, { value: 1.15, ease: 'power1.inOut', duration: 6 }, "marais")
    vTl.to(currentFrameRef.current, { value: TOTAL_FRAMES - 1, ease: 'none', duration: 10 }, "walk")
    vTl.to(zoomRef.current, { value: 1.35, duration: 4 }, "walk+=6") // Zoom vers l'interphone à la fin
    vTl.to(zoomRef.current, { value: 1, duration: 2 }, "walk")

    // 2. ANIMATIONS DES CARTES (0 à 3)
    cardRefs.current.slice(0, 4).forEach((card) => {
      if (!card) return
      gsap.fromTo(card,
        { opacity: 0, y: 100, scale: 0.85 },
        {
          opacity: 1, y: 0, scale: 1,
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            end: 'top 45%',
            scrub: 1,
          }
        }
      )
    })

    // 3. CAS PARTICULIER : DERNIÈRE CARTE (FIXÉE AU CENTRE)
    if (lastSectionRef.current && cardRefs.current[4]) {
      const lastCard = cardRefs.current[4];

      gsap.timeline({
        scrollTrigger: {
          trigger: lastSectionRef.current,
          start: "top 40%",   // Déclenche l'apparition
          end: "bottom top", // Garde la carte jusqu'à la fin du scroll
          pin: lastCard,     // Épingle la carte
          pinSpacing: false,
          scrub: 1,
          onEnter: () => {
            // Assure le centrage exact lors de l'épinglage
            gsap.set(lastCard, { top: '50%', yPercent: -50, position: 'fixed' });
          }
        }
      })
        .fromTo(lastCard,
          { opacity: 0, scale: 0.7 },
          { opacity: 1, scale: 1, duration: 1 }
        );
    }

    return () => {
      window.removeEventListener('mousemove', onMove)
      gsap.ticker.remove(render)
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [loaded, render])

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: -10 }} />
      {!loaded && <Preloader progress={loadProgress} />}

      <style dangerouslySetInnerHTML={{
        __html: `
        .text-neon { font-weight: 900 !important; text-shadow: 0 0 15px rgba(255,0,127,0.5), 0 2px 10px rgba(0,0,0,0.8); }
        .desc-neon { font-weight: 800 !important; text-shadow: 0 2px 10px rgba(0,0,0,0.9); }
      `}} />

      <div ref={containerRef} className="relative h-[1100vh]">

        {/* 0. Intro */}
        <section className="h-screen flex items-center justify-center">
          <div ref={el => { cardRefs.current[0] = el }}>
            <GlassCard>
              <h1 className="text-4xl text-neon text-pink-400 mb-2">Survolez Paris…</h1>
              <p className="text-xl desc-neon">Direction le cœur historique du Marais.</p>
            </GlassCard>
          </div>
        </section>

        {/* Spacer pour Bienvenue (sur gravilliers_001) */}
        <div className="h-[210vh]" />

        {/* 1. Marais */}
        <section className="h-screen flex items-center justify-center">
          <div ref={el => { cardRefs.current[1] = el }}>
            <GlassCard>
              <h1 className="text-4xl text-neon text-pink-400 mb-2">Bienvenue dans le Marais</h1>
              <p className="text-xl desc-neon">Plongez dans l'effervescence des rues parisiennes.</p>
            </GlassCard>
          </div>
        </section>

        <div className="h-[100vh]" />

        {/* 2. Adresse */}
        <section className="h-screen flex items-center justify-center">
          <div ref={el => { cardRefs.current[2] = el }}>
            <GlassCard>
              <h2 className="text-3xl text-neon text-pink-400 mb-2">Le 20 rue des Gravilliers</h2>
              <p className="text-xl desc-neon">Poussez la grande porte de la Maison du Peps...</p>
            </GlassCard>
          </div>
        </section>

        <div className="h-[100vh]" />

        {/* 3. Havre de paix */}
        <section className="h-screen flex items-center justify-center">
          <div ref={el => { cardRefs.current[3] = el }}>
            <GlassCard>
              <h2 className="text-3xl text-neon text-pink-400 mb-2">Un havre de paix</h2>
              <p className="text-xl desc-neon">Avancez dans l'allée pavée. Vous y êtes presque.</p>
            </GlassCard>
          </div>
        </section>

        <div className="h-[100vh]" />

        {/* 4. Final - ÉPINGLÉ AU CENTRE */}
        <section ref={lastSectionRef} className="h-screen flex items-center justify-center relative">
          <div ref={el => { cardRefs.current[4] = el }} className="z-20">
            <GlassCard>
              <h1 className="text-5xl text-neon text-pink-400 mb-4 uppercase tracking-tighter leading-none">Laet's Danse Studio</h1>
              <p className="mb-6 text-xl desc-neon uppercase">Bâtiment A. Sonnez, on vous attend !</p>
              <a href="https://wa.me/33681178159" target="_blank" rel="noopener noreferrer" className="inline-block bg-green-500 text-white font-black py-4 px-10 rounded-full text-xl shadow-lg">
                💬 WhatsApp
              </a>
            </GlassCard>
          </div>
        </section>

        {/* Espace de fin pour voir l'interphone derrière la carte fixe */}
        <div className="h-[150vh]" />
      </div>
    </>
  )
}
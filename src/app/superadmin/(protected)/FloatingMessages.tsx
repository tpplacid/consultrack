'use client'

import { useEffect, useRef, useState } from 'react'

const MESSAGES = [
  'Good morning, chief ☀️',
  'All systems nominal 🟢',
  'Ship it. 🚀',
  'You built this 👑',
  'Revenue goes brrr 📈',
  'Another day, another feature 🛠️',
  'Orgs are live ✅',
  'Caffeine → Code → Ship ☕',
  'Keep shipping 💪',
  'Consultrackk is cooking 🔥',
  'Bug? What bug? 🐛',
  'The pipeline never sleeps 🌙',
  'Multi-tenant and thriving 🏢',
  'Good vibes only ✨',
  'Superadmin status: 😎',
  'Push to main, pray to gods 🙏',
]

interface Bubble {
  id: number
  msg: string
  x: number
  y: number
  duration: number
  delay: number
  size: number
  color: string
}

const COLORS = [
  'rgba(6,182,212,0.35)',   // cyan
  'rgba(168,85,247,0.35)',  // violet
  'rgba(236,72,153,0.35)',  // pink
  'rgba(34,197,94,0.35)',   // green
  'rgba(251,191,36,0.35)',  // amber
  'rgba(99,102,241,0.35)',  // indigo
]

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

export function FloatingMessages({ enabled }: { enabled: boolean }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const counterRef = useRef(0)

  useEffect(() => {
    if (!enabled) { setBubbles([]); return }

    function spawnBubble() {
      counterRef.current += 1
      const id = counterRef.current
      const bubble: Bubble = {
        id,
        msg: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
        x: randomBetween(3, 85),
        y: randomBetween(10, 85),
        duration: randomBetween(12, 22),
        delay: 0,
        size: randomBetween(10, 12),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
      setBubbles(prev => [...prev.slice(-12), bubble]) // cap at 12 visible
    }

    // Initial burst
    for (let i = 0; i < 5; i++) {
      setTimeout(spawnBubble, i * 800)
    }

    // Ongoing spawn
    const interval = setInterval(spawnBubble, randomBetween(4000, 8000))
    return () => clearInterval(interval)
  }, [enabled])

  if (!enabled || bubbles.length === 0) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {bubbles.map(b => (
        <div
          key={b.id}
          className="absolute whitespace-nowrap rounded-full px-3 py-1 font-medium select-none"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            fontSize: b.size,
            background: b.color,
            color: '#fff',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: `floatBubble ${b.duration}s ease-in-out forwards`,
            animationDelay: `${b.delay}s`,
          }}
        >
          {b.msg}
        </div>
      ))}

      <style>{`
        @keyframes floatBubble {
          0%   { opacity: 0; transform: translateY(0px) scale(0.85); }
          10%  { opacity: 1; }
          80%  { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(-60px) scale(1.05); }
        }
      `}</style>
    </div>
  )
}

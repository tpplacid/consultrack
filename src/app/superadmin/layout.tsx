import { Geist } from 'next/font/google'

export const dynamic = 'force-dynamic'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`relative min-h-screen text-white sa-root-bg ${geist.className}`}
      style={{ fontFamily: 'var(--font-geist, system-ui, sans-serif)' }}>
      {children}

      <style>{`
        .sa-root-bg {
          background:
            linear-gradient(125deg,
              #050510 0%,
              #0d0820 16%,
              #1a0530 34%,
              #050518 52%,
              #001428 70%,
              #200522 86%,
              #050510 100%);
          background-size: 280% 280%;
          animation: sa-grad-shift 32s ease-in-out infinite;
        }
        .sa-root-bg::before {
          content: '';
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 18% 22%, rgba(99,102,241,0.18) 0%, transparent 38%),
            radial-gradient(circle at 82% 75%, rgba(236,72,153,0.13) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10) 0%, transparent 48%);
          animation: sa-blobs-float 26s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes sa-grad-shift {
          0%   { background-position:   0%   0%; }
          25%  { background-position:  80%  30%; }
          50%  { background-position: 100% 100%; }
          75%  { background-position:  20%  80%; }
          100% { background-position:   0%   0%; }
        }
        @keyframes sa-blobs-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(3%, -2%) scale(1.05); }
          66%      { transform: translate(-2%, 3%) scale(0.97); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sa-root-bg, .sa-root-bg::before { animation: none; }
        }
      `}</style>
    </div>
  )
}

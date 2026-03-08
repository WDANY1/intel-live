import dynamic from 'next/dynamic'

// Dynamically import the dashboard (client-only — uses WebGL, Three.js, browser APIs)
const LiveIntelDashboard = dynamic(
  () => import('@/components/LiveIntelDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen flex items-center justify-center bg-[#060A0F]">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-2 border-[#00E5FF]/30 mx-auto mb-4"
            style={{
              borderTopColor: '#00E5FF',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
            className="text-[#00E5FF] text-sm tracking-[4px] mb-2"
          >
            INTEL LIVE
          </div>
          <div
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
            className="text-[rgba(229,231,235,0.2)] text-[0.6rem] tracking-[2px]"
          >
            INITIALIZING COMMAND CENTER...
          </div>
        </div>
      </div>
    ),
  }
)

export default function Home() {
  return <LiveIntelDashboard />
}

import { StatusBar, ios } from './shared'

/**
 * "WebView" mode — unsupported content shown in embedded webview
 * with an info banner warning about display issues.
 * Reuses the course unit layout from CourseContentScreen.
 */
export function WebViewUnitScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />
      {/* Nav bar */}
      <div className="relative flex items-center justify-center" style={{ padding: '4px 20px 8px' }}>
        <div className="absolute left-5 flex items-center gap-1">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke={ios.accent} strokeWidth="2"><path d="M8 2L2 8l6 6"/></svg>
          <span style={{ fontSize: 14, color: ios.accent }}>Back</span>
        </div>
        <span className="font-semibold" style={{ fontSize: 14, color: ios.textPrimary }}>Course Unit</span>
      </div>

      {/* Simulated webview content with overlay info badge — edge to edge like Course Features */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="h-full overflow-hidden"
          style={{
            backgroundColor: '#fff',
            padding: 14,
          }}
        >
          <div style={{ height: 14, width: '85%', background: '#e5e7eb', borderRadius: 3, marginBottom: 10 }} />
          <div style={{ height: 14, width: '60%', background: '#e5e7eb', borderRadius: 3, marginBottom: 10 }} />
          <div style={{ height: 14, width: '75%', background: '#e5e7eb', borderRadius: 3, marginBottom: 16 }} />
          <div style={{ height: 80, background: '#f3f4f6', borderRadius: 6, marginBottom: 14 }} />
          <div style={{ height: 14, width: '90%', background: '#e5e7eb', borderRadius: 3, marginBottom: 10 }} />
          <div style={{ height: 14, width: '45%', background: '#e5e7eb', borderRadius: 3, marginBottom: 16 }} />
          <div style={{ height: 14, width: '70%', background: '#e5e7eb', borderRadius: 3, marginBottom: 10 }} />
          <div style={{ height: 14, width: '55%', background: '#e5e7eb', borderRadius: 3 }} />
        </div>

        {/* Floating info badge — top-left over webview */}
        <div
          className="absolute flex items-center gap-1.5"
          style={{
            top: 6,
            left: 6,
            padding: '4px 8px',
            borderRadius: 6,
            backgroundColor: `${ios.accent}cc`,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="flex flex-shrink-0 items-center justify-center"
            style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #fff', fontSize: 7, fontWeight: 700, color: '#fff' }}
          >
            i
          </div>
          <span style={{ fontSize: 8, color: '#fff', whiteSpace: 'nowrap' }}>May display incorrectly</span>
        </div>
      </div>
    </div>
  )
}

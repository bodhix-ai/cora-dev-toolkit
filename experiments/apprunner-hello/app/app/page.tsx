export default function Home() {
  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        👋 Hello from App Runner!
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666' }}>
        This is a minimal Next.js app deployed to AWS App Runner
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <p><strong>Health Check Endpoint:</strong> <code>/api/health</code></p>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      </div>
    </main>
  )
}
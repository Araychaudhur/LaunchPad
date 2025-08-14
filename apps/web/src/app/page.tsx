export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>{process.env.NEXT_PUBLIC_APP_NAME || "LaunchPad"}</h1>
      <p>Web is up. Use the link below to hit the API through the edge proxy.</p>
      <p>
        <a href="/api/health" target="_blank" rel="noreferrer">Check API health</a>
      </p>
      <ul>
        <li><a href="http://localhost:9090" target="_blank">Prometheus</a></li>
        <li><a href="http://localhost:3002" target="_blank">Grafana</a></li>
        <li><a href="http://localhost:1080" target="_blank">MailDev</a></li>
      </ul>
    </main>
  );
}

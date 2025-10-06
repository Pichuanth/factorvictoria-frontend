// frontend/src/components/BetAdvice.jsx
export default function BetAdvice({ picks = [] }) {
  // picks: [{ label: 'Over 0.5', prob: 0.88 }, ...]
  const fuertes = picks.filter(p => p.prob >= 0.8);
  return (
    <div style={{ padding: 12, border: "1px solid #eaeaea", borderRadius: 8, marginBottom: 12 }}>
      <h3>¿Qué apostar?</h3>
      {fuertes.length === 0 ? (
        <p className="muted">Aún sin picks ≥ 80%. Cuando integremos cuotas/odds, se mostrarán aquí.</p>
      ) : (
        <ul>
          {fuertes.map((p, i) => (
            <li key={i}>{p.label} — {(p.prob*100).toFixed(0)}%</li>
          ))}
        </ul>
      )}
      <small className="muted">Si la suma no llega a cuota 10, se propondrá una combinación alternativa.</small>
    </div>
  );
}

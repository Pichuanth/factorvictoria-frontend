export default function TierTeasers({ current = "x10", options = [], onUpgrade }) {
  return (
    <div className="tiers">
      {options.map(opt => {
        const isCurrent = opt.tier === current;
        const locked = !isCurrent && !!opt.locked;
        return (
          <div
            key={opt.tier}
            className={`tier ${isCurrent ? "current" : ""} ${locked ? "locked" : ""}`}
            title={locked ? "Mejora de plan" : ""}
          >
            <div className="tier-top">
              <div className="tier-mult">{opt.tier}</div>
              {isCurrent ? <div className="ok">✓</div> : locked ? <span role="img" aria-label="lock">🔒</span> : null}
            </div>
            <div className="tier-price">{opt.price}</div>
            <div className="muted" style={{ minHeight: 20 }}>{isCurrent ? "Incluido" : " "}</div>
            {!isCurrent && (
              <button className="btn-upgrade" onClick={() => onUpgrade?.(opt.tier)}>
                Mejorar
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

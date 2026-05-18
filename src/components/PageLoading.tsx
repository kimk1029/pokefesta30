export function PageLoading() {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 360,
        display: 'grid',
        placeItems: 'center',
        padding: 28,
        background:
          'radial-gradient(circle at 50% 28%, rgba(255,210,63,.38), transparent 34%), linear-gradient(180deg, var(--paper), var(--pap2))',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          maxWidth: 260,
          padding: '24px 18px 20px',
          background: 'rgba(255,255,255,.72)',
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.92),6px 6px 0 var(--ink)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink)',
          letterSpacing: 1,
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 116,
            height: 116,
            backgroundImage: 'url(/app-icon.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            animation: 'pf-splash-pop 1.15s steps(6) infinite',
            boxShadow: '0 0 0 3px var(--ink), 6px 6px 0 var(--ink)',
          }}
        />
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            letterSpacing: 0.4,
            color: 'var(--red-dk)',
            textShadow: '1px 1px 0 var(--gold)',
          }}
        >
          포케페스타30
        </div>
        <div
          aria-hidden
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 4,
            width: 92,
            marginTop: 2,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                height: 8,
                background: i < 3 ? 'var(--red)' : 'var(--gold)',
                boxShadow: '0 0 0 1px var(--ink)',
                animation: `pf-splash-bar .9s steps(2) ${i * 0.08}s infinite`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            color: 'var(--ink3)',
            fontSize: 8,
            letterSpacing: 1.6,
            marginTop: 2,
          }}
        >
          PRICE CHECK...
        </div>
        <div
          aria-hidden
          style={{
            position: 'relative',
            width: 44,
            height: 44,
            marginTop: 2,
          }}
        >
          <div
            className="pf-pokeball-spinner"
            style={{ position: 'absolute', inset: 0, margin: 'auto', animationDuration: '1s' }}
          />
        </div>
      </div>
    </div>
  );
}

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
          justifyContent: 'center',
          gap: 14,
          width: 120,
          height: 120,
          fontFamily: 'var(--f1)',
          fontSize: 10,
          color: 'var(--ink)',
          letterSpacing: 1,
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'relative',
            width: 56,
            height: 56,
          }}
        >
          <div
            className="pf-pokeball-spinner"
            style={{
              position: 'absolute',
              inset: 0,
              width: 56,
              height: 56,
              margin: 'auto',
              animationDuration: '0.9s',
            }}
          />
        </div>
      </div>
    </div>
  );
}

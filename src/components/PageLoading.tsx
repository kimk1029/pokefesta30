export function PageLoading() {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 200,
        display: 'grid',
        placeItems: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink3)',
          letterSpacing: 2,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid var(--ink)',
            background: `linear-gradient(to bottom,
              var(--red) 0,var(--red) 46%,
              var(--ink) 46%,var(--ink) 54%,
              var(--white) 54%,var(--white) 100%)`,
            position: 'relative',
            animation: 'pf-ball-spin 1s linear infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--white)',
              border: '2px solid var(--ink)',
              transform: 'translate(-50%,-50%)',
            }}
          />
        </div>
        <div>LOADING...</div>
      </div>
    </div>
  );
}

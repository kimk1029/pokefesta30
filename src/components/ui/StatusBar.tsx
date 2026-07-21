export function StatusBar() {
  return (
    <div className="status">
      <span>ARVOTCG</span>
      <span style={{ fontFamily: 'var(--f1)', fontSize: 8 }}>
        v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1'}
      </span>
    </div>
  );
}

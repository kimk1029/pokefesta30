export function PixelKarp({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 20 14"
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
    >
      <g fill="#1A1A2E">
        <rect x="5" y="2" width="1" height="1" />
        <rect x="6" y="1" width="6" height="1" />
        <rect x="12" y="2" width="1" height="1" />
        <rect x="4" y="3" width="1" height="1" />
        <rect x="13" y="3" width="1" height="1" />
        <rect x="3" y="4" width="1" height="1" />
        <rect x="14" y="4" width="1" height="1" />
        <rect x="2" y="5" width="1" height="1" />
        <rect x="15" y="5" width="1" height="1" />
        <rect x="2" y="6" width="1" height="1" />
        <rect x="15" y="6" width="1" height="1" />
        <rect x="16" y="6" width="1" height="1" />
        <rect x="17" y="7" width="1" height="1" />
        <rect x="18" y="8" width="1" height="1" />
        <rect x="17" y="9" width="1" height="1" />
        <rect x="16" y="9" width="1" height="1" />
        <rect x="2" y="7" width="1" height="1" />
        <rect x="3" y="8" width="1" height="1" />
        <rect x="4" y="9" width="1" height="1" />
        <rect x="5" y="10" width="1" height="1" />
        <rect x="6" y="11" width="7" height="1" />
        <rect x="13" y="10" width="1" height="1" />
        <rect x="14" y="9" width="1" height="1" />
        <rect x="15" y="8" width="1" height="1" />
      </g>
      <g fill="#FB923C">
        <rect x="6" y="2" width="6" height="1" />
        <rect x="5" y="3" width="8" height="1" />
        <rect x="4" y="4" width="10" height="1" />
        <rect x="3" y="5" width="12" height="1" />
        <rect x="3" y="6" width="12" height="1" />
        <rect x="3" y="7" width="14" height="1" />
        <rect x="4" y="8" width="14" height="1" />
        <rect x="5" y="9" width="11" height="1" />
        <rect x="6" y="10" width="7" height="1" />
      </g>
      <g fill="#FFD23F">
        <rect x="7" y="3" width="3" height="1" />
        <rect x="6" y="4" width="4" height="1" />
      </g>
      <g fill="#FFFFFF">
        <rect x="11" y="4" width="2" height="2" />
      </g>
      <g fill="#1A1A2E">
        <rect x="12" y="4" width="1" height="1" />
      </g>
      <g fill="#1A1A2E">
        <rect x="13" y="6" width="2" height="1" />
      </g>
      <g fill="#FFD23F">
        <rect x="17" y="8" width="1" height="1" />
      </g>
    </svg>
  );
}

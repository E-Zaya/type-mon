import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          fontSize: 96,
          fontWeight: 400,
          color: '#1D9E75',
          fontFamily: 'sans-serif',
        }}
      >
        T
      </div>
    ),
    { ...size }
  )
}

import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          fontSize: 18,
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

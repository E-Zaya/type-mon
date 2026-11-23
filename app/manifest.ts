import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TypeMon — Латин үсгээр бичиж, Кириллээр илгээ',
    short_name: 'TypeMon',
    description:
      'Латин үсгээр бичвэл Кирилл болгоно. Монголчуудад зориулсан үнэгүй хэрэгсэл.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f4ef',
    theme_color: '#1a1a1a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

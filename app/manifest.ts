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
    // Installed on Android, TypeMon appears in the share sheet of every app:
    // shared Latin text lands in ?text= and is converted at once.
    share_target: {
      action: '/',
      method: 'GET',
      params: { text: 'text', title: 'title', url: 'url' },
    },
    background_color: '#f5f4ef',
    theme_color: '#1a1a1a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

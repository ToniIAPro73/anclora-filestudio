'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ backgroundColor: '#0d0f12', color: '#f4f1ea', fontFamily: 'sans-serif', margin: 0, padding: '2rem', textAlign: 'center' }}>
        <h2>Anclora FileStudio — Error inesperado</h2>
        <p style={{ color: '#a8a29e' }}>{error?.message || 'Error del sistema'}</p>
      </body>
    </html>
  );
}

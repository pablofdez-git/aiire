// Service Worker básico para activar la instalación de la PWA
self.addEventListener('install', (e) => {
  console.log('🤖 PWA: Service Worker Instalado');
});

self.addEventListener('activate', (e) => {
  console.log('🤖 PWA: Service Worker Activo');
});

// Escucha las peticiones para que la app responda de forma fluida
self.addEventListener('fetch', (e) => {
  // Aquí en el futuro se puede programar la caché offline
});

# PWA Setup Guide - PastryApp

## ✅ Archivos Implementados

La aplicación ya está configurada como PWA. Los siguientes archivos han sido creados:

### Archivos principales:
- ✅ `app/manifest.ts` - Web App Manifest
- ✅ `public/sw.js` - Service Worker
- ✅ `components/pwa-installer.tsx` - Registrador de Service Worker
- ✅ `components/pwa-install-prompt.tsx` - Prompt de instalación
- ✅ `app/offline/page.tsx` - Página offline
- ✅ `app/layout.tsx` - Metadata y viewport actualizados

## 📱 Íconos PWA

Los íconos están copiados desde `Logo_Pastry-06.jpg` pero necesitan ser redimensionados apropiadamente.

### Tamaños requeridos:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 180x180 (Apple Touch Icon)
- 192x192 (Android)
- 384x384
- 512x512 (Splash screen)

### Cómo generar los íconos:

#### Opción 1: Usar herramienta online
1. Ve a https://www.pwabuilder.com/imageGenerator
2. Sube `public/Logo_Pastry-06.jpg`
3. Descarga los íconos generados
4. Reemplaza los archivos en `public/icons/`

#### Opción 2: Usar ImageMagick (si tienes instalado)
```bash
# Instalar ImageMagick si no lo tienes
brew install imagemagick

# Generar todos los tamaños
cd public
convert Logo_Pastry-06.jpg -resize 72x72 icons/icon-72x72.png
convert Logo_Pastry-06.jpg -resize 96x96 icons/icon-96x96.png
convert Logo_Pastry-06.jpg -resize 128x128 icons/icon-128x128.png
convert Logo_Pastry-06.jpg -resize 144x144 icons/icon-144x144.png
convert Logo_Pastry-06.jpg -resize 152x152 icons/icon-152x152.png
convert Logo_Pastry-06.jpg -resize 180x180 icons/icon-180x180.png
convert Logo_Pastry-06.jpg -resize 192x192 icons/icon-192x192.png
convert Logo_Pastry-06.jpg -resize 384x384 icons/icon-384x384.png
convert Logo_Pastry-06.jpg -resize 512x512 icons/icon-512x512.png
```

#### Opción 3: Usar Sharp (Node.js)
```bash
# Instalar sharp
pnpm add -D sharp

# Crear script para generar íconos
node scripts/generate-icons.js
```

## 🧪 Testing

### 1. Desarrollo local
```bash
pnpm dev
```

### 2. Build de producción (requerido para PWA)
```bash
pnpm build
pnpm start
```

### 3. Verificar en Chrome DevTools
1. Abre Chrome DevTools (F12)
2. Ve a la pestaña "Application"
3. Verifica:
   - **Manifest**: Debería mostrar todos los detalles del manifest
   - **Service Workers**: Debería estar registrado y activo
   - **Storage**: Verifica el cache storage

### 4. Lighthouse Audit
1. En Chrome DevTools, ve a "Lighthouse"
2. Selecciona "Progressive Web App"
3. Click en "Generate report"
4. Objetivo: Score > 90

### 5. Probar instalación
- **Desktop (Chrome/Edge)**: Click en el ícono de instalación en la barra de direcciones
- **Mobile**: Abre el menú del navegador → "Agregar a pantalla de inicio"

## 🚀 Deploy

### Requisitos para PWA en producción:
1. ✅ HTTPS obligatorio (Vercel/Netlify lo proveen automáticamente)
2. ✅ Service Worker registrado
3. ✅ Manifest válido
4. ✅ Íconos en tamaños correctos

### Deploy en Vercel:
```bash
# Ya está configurado, solo hacer push
git push origin pwa
```

## 🔧 Configuración Adicional

### Personalizar colores
Edita `app/manifest.ts` y `app/layout.tsx`:
```typescript
theme_color: '#3b82f6'  // Azul actual
background_color: '#ffffff'
```

### Estrategia de caché
Edita `public/sw.js` para personalizar qué se cachea:
```javascript
const STATIC_CACHE_URLS = [
  '/',
  '/login',
  '/offline',
  // Agrega más rutas aquí
];
```

## 📋 Checklist PWA

- [x] Web App Manifest configurado
- [x] Service Worker implementado
- [x] HTTPS habilitado (en producción)
- [x] Viewport meta tag
- [x] Theme color configurado
- [x] Apple touch icon
- [ ] Íconos redimensionados correctamente (pendiente)
- [x] Página offline
- [x] Install prompt
- [ ] Lighthouse audit > 90 (verificar después de íconos)

## 🐛 Troubleshooting

### Service Worker no se registra
- Verifica que estés en HTTPS (o localhost)
- Revisa la consola del navegador
- Limpia cache y cookies

### Manifest no se detecta
- Verifica que `app/manifest.ts` existe
- Build la app en producción
- Revisa Chrome DevTools > Application > Manifest

### No aparece el prompt de instalación
- Solo aparece si se cumplen criterios de PWA
- No aparecerá si ya está instalada
- Puede estar bloqueado si se dismissó antes

## 📚 Recursos

- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Can I Use - Service Worker](https://caniuse.com/serviceworkers)

# Optimización de Imágenes - Documentación

## Resumen

Sistema de compresión automática de imágenes implementado para el módulo **Núcleo** con optimización de carga en **E-commerce**.

## Características Implementadas

### 1. Compresión Automática en Núcleo

Cuando se suben imágenes al módulo Núcleo:

- **Conversión automática a JPG**: Todas las imágenes se convierten a formato JPEG
- **Tamaño máximo: 50 KB**: Compresión iterativa hasta alcanzar el objetivo
- **Dimensiones máximas: 1200x1200px**: Mantiene aspect ratio
- **Calidad adaptativa**: Ajusta calidad automáticamente (85% inicial, reduce hasta 10% si es necesario)

#### Archivo: `lib/image-compression.ts`

```typescript
compressImage(file, {
  maxSizeKB: 50,        // Máximo 50KB
  maxWidth: 1200,       // Máximo 1200px ancho
  maxHeight: 1200,      // Máximo 1200px alto
  quality: 0.85,        // Calidad inicial 85%
  format: 'jpeg'        // Formato JPG
})
```

#### Modificado: `hooks/use-product-media.ts`

- Comprime automáticamente antes de subir a Supabase Storage
- Muestra notificación con tamaño original → comprimido
- Muestra porcentaje de reducción
- Guarda archivo como `.jpg`

### 2. Optimización de Carga en E-commerce

#### Componente: `components/ecommerce/OptimizedImage.tsx`

Características:
- **Lazy Loading**: Carga las imágenes cuando están cerca del viewport
- **Blur Placeholder**: Muestra placeholder animado mientras carga
- **Fallback Graceful**: Muestra icono de imagen si falla la carga
- **Hardware Acceleration**: Usa `transform: translateZ(0)` para mejor performance
- **Transición Suave**: Fade-in animado cuando la imagen carga

#### Implementado en: `components/ecommerce/ProductVariant.tsx`

Reemplaza tags `<img>` por `<OptimizedImage>` con:
- Carga diferida automática (lazy loading)
- Animación de carga
- Fallback a placeholder

## Flujo de Trabajo

### Subida de Imagen en Núcleo

1. Usuario selecciona imagen (cualquier formato: JPG, PNG, HEIC, etc.)
2. Sistema muestra: "Comprimiendo imagen (X.XX MB)..."
3. Compresión automática:
   - Convierte a JPG
   - Redimensiona a máx 1200x1200px
   - Comprime hasta 50KB o menos
4. Sube archivo comprimido a Supabase Storage
5. Muestra notificación: "Imagen subida (XX.X KB, Y% más pequeña)"
6. Guarda referencia en tabla `product_media`

### Carga en E-commerce

1. E-commerce consulta productos con sus `product_media`
2. Componente `OptimizedImage` carga imágenes:
   - Muestra placeholder mientras carga
   - Carga lazy (solo cuando está cerca de verse)
   - Transición suave al cargar
   - Si falla, muestra icono de fallback

## Beneficios

### Performance
- **Reducción de ancho de banda**: Imágenes ~50KB vs varios MB
- **Carga más rápida**: Lazy loading + imágenes pequeñas
- **Mejor UX**: Placeholders evitan layout shift

### Almacenamiento
- **Ahorro en Supabase Storage**: Hasta 95% reducción de espacio
- **Costos reducidos**: Menos GB almacenados y transferidos

### Mobile-First
- **Datos móviles**: Consume mínimos datos en redes 3G/4G
- **Carga rápida**: Páginas se cargan rápido incluso con conexión lenta

## Ejemplos

### Antes
```
Imagen Original: 3.5 MB (PNG)
Transferencia E-commerce: 3.5 MB por imagen
100 productos = 350 MB transferidos
```

### Después
```
Imagen Original: 3.5 MB (PNG)
  ↓ Compresión automática
Imagen Almacenada: 45 KB (JPG)
  ↓ Lazy loading en E-commerce
Transferencia: 45 KB solo cuando se ve
100 productos visibles = 4.5 MB transferidos (98% reducción)
```

## Configuración

Para ajustar parámetros de compresión, editar `hooks/use-product-media.ts`:

```typescript
const compressedFile = await compressImage(file, {
  maxSizeKB: 50,      // Cambiar tamaño objetivo
  maxWidth: 1200,     // Cambiar dimensiones máximas
  maxHeight: 1200,
  quality: 0.85,      // Cambiar calidad inicial
  format: 'jpeg'      // Mantener JPG para web
})
```

## Notas Técnicas

- Las imágenes con transparencia se convierten a JPG con fondo blanco
- El algoritmo intenta hasta 8 veces reducir calidad para alcanzar objetivo
- Si no alcanza 50KB, sube la imagen con la mejor compresión posible
- Lazy loading funciona automáticamente con Intersection Observer API
- Compatible con todos los navegadores modernos

## Optimización de Queries en Vista de Fotos

### Problema Resuelto
Cuando hay más de 130 productos, la consulta con `.in('product_id', [...])` generaba una URL de ~20KB que causaba:
- **Stalled 1.8 minutos** en el navegador
- Timeout en peticiones
- Experiencia de usuario pésima

### Solución Implementada
```typescript
// Si hay > 50 productos:
if (productIds.length > 50) {
  // Estrategia: Traer TODAS las fotos y filtrar en cliente
  const allPhotos = await supabase
    .from('product_media')
    .select('product_id, file_url, is_primary')
    .eq('media_type', 'image')

  // Filtrar en cliente
  const photos = allPhotos.filter(p => productIds.includes(p.product_id))
}
// Si hay <= 50 productos: usar .in() normal
```

**Resultados**:
- Query pasa de 1.8 minutos → **< 1 segundo**
- URL corta y manejable
- Mejor performance general

## Próximas Mejoras (Opcional)

- [ ] Generar thumbnails automáticos (por ejemplo 200x200px)
- [ ] Soporte WebP para navegadores compatibles
- [ ] CDN para distribución global
- [ ] Progressive JPEG para mejor experiencia de carga

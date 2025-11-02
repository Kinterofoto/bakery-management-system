# Configuración de Supabase Storage para Evidencias de Entrega

Este documento explica cómo configurar el bucket de almacenamiento para las evidencias de entrega en Supabase.

## 📋 Pasos para configurar el bucket

### ⚠️ IMPORTANTE: Ejecutar en este orden

### 1. Acceder al Dashboard de Supabase
- Ve a [supabase.com](https://supabase.com) y accede a tu proyecto
- Navega a **Storage** en el menú lateral

### 2. Crear el bucket manualmente
- Haz clic en **"Create bucket"**
- **Nombre**: `evidencia_de_entrega`
- **Público**: ✅ Activar (importante para que las imágenes sean accesibles)
- **Límite de tamaño de archivo**: 50MB
- **Tipos de archivo permitidos**: Solo imágenes (JPEG, PNG, WebP)

### 3. Ejecutar script para corregir políticas
Una vez creado el bucket, ejecutar:
```sql
-- Ejecutar en: Dashboard > SQL Editor
-- Archivo: /scripts/29-fix-storage-policies.sql
```

### ❌ Problema común: Error 403 "Unauthorized"
Si ves el error "new row violates row-level security policy":
1. **Verificar** que el bucket existe y es público
2. **Ejecutar** el script `29-fix-storage-policies.sql`
3. **Reiniciar** la aplicación

### 4. Verificar permisos
El bucket debe tener las siguientes políticas de seguridad:
- ✅ **Usuarios autenticados pueden subir** archivos
- ✅ **Usuarios autenticados pueden ver** archivos  
- ✅ **Acceso público de lectura** (para mostrar imágenes)

## 🔧 Configuración de políticas de seguridad

### Política para uploads (INSERT)
```sql
CREATE POLICY "Allow authenticated users to upload evidence" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'evidencia_de_entrega'
);
```

### Política para lectura autenticada (SELECT)
```sql
CREATE POLICY "Allow authenticated users to view evidence" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'evidencia_de_entrega'
);
```

### Política para lectura pública (SELECT)
```sql
CREATE POLICY "Allow public read access to evidence" ON storage.objects
FOR SELECT TO public USING (
  bucket_id = 'evidencia_de_entrega'
);
```

## ✅ Verificar funcionamiento

### 1. En el Dashboard
- Ve a **Storage > evidencia_de_entrega**
- Debería aparecer el bucket vacío inicialmente

### 2. En la aplicación
- Ve a **Rutas > Gestionar Entrega**
- Sube una imagen de prueba
- Verifica que aparezca la vista previa
- Verifica que el archivo aparezca en el Dashboard de Supabase

## 📁 Estructura de archivos

Los archivos se guardan con el formato:
```
evidencia_de_entrega/
├── evidence_delivery_1730901234567.jpg
├── evidence_delivery_1730901245678.png
└── evidence_delivery_1730901256789.webp
```

- **Prefijo**: `evidence_delivery_`
- **Timestamp**: Marca temporal en milisegundos
- **Extensión**: Según el tipo de archivo original

## 🚨 Troubleshooting

### Error: "Bucket does not exist"
- Verificar que el bucket se creó correctamente
- Verificar el nombre exacto: `evidencia_de_entrega`

### Error: "Permission denied"
- Verificar que las políticas de seguridad están configuradas
- Verificar que el usuario está autenticado

### Error: "File type not allowed"
- Solo se permiten: JPEG, PNG, JPG, WebP
- Verificar que el archivo no excede 50MB

### La imagen no se muestra
- Verificar que el bucket es público
- Verificar la URL generada
- Revisar la consola del navegador para errores CORS
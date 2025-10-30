# Configuración de Autenticación Supabase

## Configuración de URLs de Redirección

Para que funcione correctamente la recuperación de contraseña, necesitas configurar las URLs de redirección en el dashboard de Supabase.

### Pasos:

1. **Accede al Dashboard de Supabase**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Configura las URLs de Redirección**
   - Ve a: `Authentication` → `URL Configuration`
   - En **Site URL**, ingresa: `https://soypastry.app`
   - En **Redirect URLs**, agrega las siguientes URLs:
     ```
     https://soypastry.app/reset-password
     https://soypastry.app/login
     http://localhost:3000/reset-password (para desarrollo)
     http://localhost:3000/login (para desarrollo)
     ```

3. **Configura Email Templates (Opcional)**
   - Ve a: `Authentication` → `Email Templates`
   - Selecciona: `Reset Password`
   - Personaliza el template del correo si lo deseas
   - El link de recuperación debe apuntar a: `{{ .SiteURL }}/reset-password`

4. **Variables de Entorno**
   - Asegúrate de tener configurada la variable `NEXT_PUBLIC_SITE_URL` en tu `.env.local`:
     ```
     NEXT_PUBLIC_SITE_URL=https://soypastry.app
     ```
   - Para desarrollo local:
     ```
     NEXT_PUBLIC_SITE_URL=http://localhost:3000
     ```

## Flujo de Recuperación de Contraseña

1. Usuario hace clic en "¿Olvidaste tu contraseña?" en `/login`
2. Ingresa su email
3. Supabase envía un correo con un enlace de recuperación
4. El enlace redirige a `/reset-password` con un token en la URL
5. Usuario ingresa su nueva contraseña
6. Se actualiza la contraseña y redirige a `/login`

## Validación de Contraseña

La nueva contraseña debe cumplir con:
- Mínimo 8 caracteres
- Al menos una letra mayúscula
- Al menos una letra minúscula
- Al menos un número

## Troubleshooting

### El link del email redirige a login en lugar de reset-password
- Verifica que hayas agregado `https://soypastry.app/reset-password` a las Redirect URLs en Supabase
- Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurado correctamente

### "Sesión expirada"
- Los enlaces de recuperación expiran después de 1 hora por defecto
- El usuario debe solicitar un nuevo enlace desde `/login`

### El correo no llega
- Verifica la configuración SMTP en Supabase
- Revisa la carpeta de spam
- Verifica que el email existe en la base de datos de usuarios

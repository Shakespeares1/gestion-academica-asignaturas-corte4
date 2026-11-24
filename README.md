# Gestión Académica de Asignaturas · Corte 4

Ejercicio 10. Aplicación Android hecha con Apache Cordova, HTML, CSS y JavaScript. Reutiliza la API Spring Boot del Corte 3 y los flujos de gestión académica de la app Kodular del Corte 2.

## Funcionalidades

| Requisito | Implementación |
| --- | --- |
| Base de datos relacional | PostgreSQL. Flyway prepara las tablas `asignaturas` y `usuarios` y sus restricciones. |
| CRUD de asignaturas | Un administrador crea, consulta, actualiza y elimina asignaturas. Un usuario regular consulta el catálogo. |
| CRUD de usuarios | El registro crea cuentas. Un administrador lista, consulta, edita nombre, username y correo, cambia rol/estado y elimina cuentas. PostgreSQL guarda la contraseña como hash BCrypt. |
| Login | Correo y contraseña. La app conserva en memoria el JWT mientras dura la sesión. |
| Recuperación | Se envía un enlace de un solo uso al correo registrado. La pantalla web permite establecer una contraseña nueva. |
| Reportes de asignaturas | Carrera, semestre y área. Rango de créditos, profesor y nombre. |
| Reportes de usuarios | Rol y estado. Rango de fechas de registro en UTC. |

En Android, **Asignaturas** y **Usuarios** abren las listas. Pulsa **Ver detalle** para consultar, editar o eliminar. En **Reportes**, selecciona uno de los cuatro informes, escribe los parámetros y pulsa **Consultar reporte**. Activa la cuenta de administrador para recorrer todas las funciones.

## 1. Preparar el backend

Requisitos de backend: Java 21 y PostgreSQL. Desde la raíz, compila y prueba:

```powershell
cd backend
$env:RUN_POSTGRES_INTEGRATION = "false"
.\mvnw.cmd clean verify
```

En macOS o Linux usa `bash ./mvnw`. Las pruebas por defecto usan H2 aislado. Para arrancar la API usa PostgreSQL dedicado para el Corte 4 y configura estas variables de entorno según [backend/.env.example](backend/.env.example).

| Variables | Configuración |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Acceso a PostgreSQL. URL JDBC con `sslmode=require`. Una base dedicada recién creada permite aplicar V1 a V3 automáticamente. |
| `JWT_SECRET_BASE64` | Al menos 32 bytes aleatorios codificados en Base64. |
| `CORS_ALLOWED_ORIGINS` | `https://localhost`, origen del WebView Android configurado en Cordova. |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | Proveedor SMTP con STARTTLS, normalmente en el puerto 587. El alojamiento de la API debe permitir la conexión SMTP saliente. |
| `MAIL_FROM` | Remitente aprobado por el proveedor. |
| `APP_MAIL_RESET_URL` | URL pública HTTPS de la pantalla de cambio. Usa `https://TU_API/app/index.html`. El servidor añade el token. |

Puedes usar PostgreSQL alojado, por ejemplo un proyecto dedicado en Supabase. Conserva las credenciales fuera del repositorio. Genera la clave JWT en PowerShell con `$env:JWT_SECRET_BASE64 = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`.

Arranca el JAR desde `backend` con `java -jar target/gestion-asignaturas-api-0.0.1-SNAPSHOT.jar`. Para desplegar en un proveedor con Docker, usa `backend/Dockerfile` y el directorio raíz del repositorio como contexto. La API escucha por defecto en el puerto 10000 con el perfil prod. Comprueba `/actuator/health` y abre `/app/index.html` para probar la interfaz web y la pantalla de restablecimiento. Crea el primer administrador en la base dedicada siguiendo [el procedimiento de bootstrap](backend/OPERATIONS.md). Facilita al tutor el acceso a una cuenta de evaluación por un canal privado.

## 2. Compilar e instalar en Android

Requisitos del cliente: Node.js, JDK 17, Gradle disponible en PATH, Android SDK Platform 35 y Build Tools 35.0.0. Configura `JAVA_HOME` y `ANDROID_HOME`. Consulta la [guía oficial de Cordova](https://cordova.apache.org/archive/docs/en/13.x-2025.11/guide/platforms/android/).

1. Edita `mobile/www/config.js` y coloca la URL HTTPS de la API desplegada. El APK preliminar apunta al servicio de la Unidad 3, que respondió HTTP 503 durante la prueba. Actualiza la URL y vuelve a compilar para la entrega.
2. Desde la raíz, ejecuta:

   ```powershell
   cd mobile
   npm ci
   npm run apk
   ```

3. El APK de prueba sale en `mobile/platforms/android/app/build/outputs/apk/debug/app-debug.apk` con relación a la raíz. Cópialo a `entrega/GestionAcademica-Corte4.apk`. Instálalo en un Android 7.0 o superior con `adb install -r <ruta-al-apk>` o abre el APK en el teléfono.
4. Prueba las dos operaciones CRUD completas, los cuatro reportes con filtros, el login y un cambio de contraseña desde un correo real. Ten a mano una cuenta con rol ADMIN y otra de prueba con correo accesible.

## 3. Publicar por Git

Crea un repositorio **público** vacío llamado `gestion-academica-asignaturas-corte4` desde tu cuenta de GitHub asociada al correo institucional. Si partiste del ZIP, ejecuta todos los comandos desde la carpeta extraída. Si ya tienes el commit local, empieza con `git remote add`.

```bash
git init -b main
git config --local user.name "Tu nombre completo"
git config --local user.email "Tu correo institucional"
git add .
git diff --cached --stat
git commit -m "Entrega del Corte 4: Gestión Académica de Asignaturas"
git remote add origin https://github.com/TU_USUARIO/gestion-academica-asignaturas-corte4.git
git push -u origin main
```

La carpeta del APK debe estar entre los archivos de `git diff --cached --stat`. Abre la URL del repositorio y la del video en una ventana privada. Comprueba que el tutor pueda acceder al código, al APK y al video desde los enlaces que vas a poner en el PDF.

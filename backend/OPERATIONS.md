# Crear el primer administrador

1. Inicia la API con perfil `prod` sobre la base PostgreSQL dedicada para que Flyway aplique V1–V3. Comprueba que `/actuator/health` devuelva `UP`.
2. En una terminal interactiva con Java 21, entra en `backend`. Carga las variables de la misma base `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y la clave `JWT_SECRET_BASE64`. La URL JDBC debe incluir `sslmode=require`.
3. Especifica los datos del administrador y ejecuta el JAR ya compilado:

```powershell
$env:BOOTSTRAP_ADMIN_USERNAME = "admin.corte4"
$env:BOOTSTRAP_ADMIN_NAME = "Nombre del administrador"
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.org"
java -jar target/gestion-asignaturas-api-0.0.1-SNAPSHOT.jar --spring.profiles.active=admin-bootstrap --spring.main.web-application-type=none --spring.flyway.enabled=false --spring.jpa.hibernate.ddl-auto=validate --spring.sql.init.mode=never
```

El proceso pide la contraseña sin eco. Usa al menos 12 caracteres y como máximo 72 bytes UTF-8. La ejecución valida el esquema y usa un bloqueo transaccional para impedir que se creen dos administradores iniciales al mismo tiempo. Si ya existe un administrador, usa esa cuenta o su recuperación por correo.

Verifica el inicio de sesión con el correo elegido en la API desplegada. Conserva los datos de acceso del administrador fuera del repositorio.

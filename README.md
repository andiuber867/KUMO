# KUMO · Carta y administración

Proyecto modular con React, TypeScript y Vinext, preparado para Cloudflare Workers, D1 y R2.

## Dos vistas, una sola carta
- `/admin`: primero muestra el login de KUMO con usuario y contraseña. Una sesión válida abre el panel para crear, editar, eliminar y consultar productos. Permite subir fotos, establecer precio, descripción, categoría, porción, disponibilidad y la marca Nuevo.
- `/`: carta para los clientes. Solo muestra productos guardados desde el panel. Sin productos, presenta un estado vacío; no hay datos de ejemplo.
- El QR del panel apunta a `/`, nunca al administrador.
- Los cambios se sincronizan inmediatamente entre pestañas del mismo origen y se consultan cada 5 segundos en los demás dispositivos mientras la carta esté visible.
- Las novedades tienen borde destacado, brillo sobre la foto y etiqueta animada. Las entradas de sección, categorías y ventanas también se animan. Se respeta la preferencia de movimiento reducido.

## Estructura
- `app/`: páginas y endpoints HTTP.
- `features/auth/`: formulario de acceso de KUMO.
- `features/admin/`: panel, formulario de productos y QR.
- `features/menu/`: vista de clientes y filtros.
- `features/products/`: tipos, validación y repositorio de productos.
- `lib/server/`: sesiones, permisos y acceso a base de datos.
- `components/`: marca y controles accesibles.
- `db/` y `drizzle/`: esquema y migraciones versionadas.
- `public/`: logo y fotografías.

## Inicio local
Requiere Node 22.13 o posterior. En este equipo las dependencias y migraciones ya están instaladas.

```powershell
node scripts/run-framework.mjs dev
```

- Carta: http://localhost:5173/
- Administrador: http://localhost:5173/admin

La sesión dura 8 horas. Cerrar sesión vuelve al formulario e invalida el acceso en el servidor. No se utiliza ninguna cuenta externa para entrar al administrador.

## Instalación en otro equipo
```powershell
npm ci
node scripts/setup-admin.mjs
node scripts/run-framework.mjs build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fresh_madame_web.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_chilly_stepford_cuckoos.sql
node scripts/run-framework.mjs dev
```
Ejecutar cada migración una sola vez por base local.

## Cambiar acceso local
`node scripts/setup-admin.mjs` genera una contraseña nueva y la muestra una sola vez. Se puede indicar otro usuario: `node scripts/setup-admin.mjs restaurante`. Guarda las credenciales que muestra la terminal. La contraseña no se almacena en texto en la configuración: se guarda un hash PBKDF2 con salt aleatorio. Cambiar el hash invalida las sesiones anteriores.

## Alojamiento
Configurar `ADMIN_USERNAME`, `ADMIN_PASSWORD_SALT` y `ADMIN_PASSWORD_HASH` como variables del alojamiento; las dos últimas deben tratarse como secretos. Sin estos valores se rechaza el acceso. El servidor valida sesiones de 256 bits, conserva únicamente el hash del token, utiliza cookies HttpOnly y SameSite=Strict, y añade Secure en HTTPS. Hay un límite de 10 intentos por ventana de 15 minutos. Todas las escrituras y cargas requieren sesión válida y origen correcto.

La publicación de revisión mantiene acceso privado del proveedor de alojamiento. Esa puerta de acceso es independiente del login propio de KUMO. Para entregar el QR a clientes se requiere publicar el sitio con acceso público y generar el QR desde su dominio definitivo. Los datos locales y los del alojamiento son bases separadas.

## Verificación
Compilación de producción y TypeScript sin errores. Prueba integrada local: login incorrecto/correcto, panel protegido, permisos, origen, carga de foto, producto visible en carta, edición, novedades, disponibilidad, eliminación, conservación de datos previos y revocación de sesión al salir.

## Recursos
Logo original del usuario: KUMO LOGO.jfif.
Fotografía de portada de referencia: https://unsplash.com/photos/sushi-on-black-ceramic-plate-IFvjRdXhj_U
Recursos fotográficos adicionales: https://unsplash.com/photos/a-bowl-of-ramen-with-hard-boiled-eggs-and-meat-ZxR68e4KvEQ y https://unsplash.com/photos/a-black-plate-topped-with-dumplings-on-top-of-a-wooden-table-klTf2RN37Ts
Licencia: https://unsplash.com/license

Las fotos cargadas se conservan en R2. Las que se reemplazan o dejan de usarse no se eliminan automáticamente. No incluye pedidos, pagos ni inventario.

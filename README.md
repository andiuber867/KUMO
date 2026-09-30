# KUMO · Menú japonés

Proyecto modular con React, TypeScript y Vinext, preparado para Cloudflare Workers y Sites.

## Funciones
- `/`: carta de clientes, filtros por categoría y novedades, buscador, fichas de platos y vista móvil.
- `/admin`: administración protegida por cuenta autorizada de ChatGPT.
- Crear, editar y eliminar productos; precio en bolivianos, descripción, porción, categoría, foto, nuevo y disponibilidad.
- Imágenes JPG/PNG/WebP de hasta 5 MB, almacenadas en R2. Productos persistentes en D1.
- Código QR descargable de la dirección actual de la carta.
- Animaciones que respetan la preferencia de movimiento reducido.

## Estructura
- `app/`: páginas y endpoints HTTP.
- `features/menu/`: experiencia de clientes y filtros.
- `features/admin/`: administración, formulario y QR.
- `features/products/`: tipos, validación, catálogo de muestra y repositorio de datos.
- `lib/server/`: autorización y acceso a base de datos.
- `components/`: marca y controles accesibles reutilizables.
- `db/` y `drizzle/`: esquema y migraciones.
- `public/`: logo original y fotografías de referencia.

## Desarrollo local
Requiere Node 22.13 o posterior.

```powershell
npm ci
Copy-Item .env.example .env
node scripts/run-framework.mjs build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fresh_madame_web.sql
node scripts/run-framework.mjs dev
```

Abrir la dirección indicada por el servidor (normalmente http://127.0.0.1:5173).
En desarrollo, “Ingresar con ChatGPT” simula la cuenta `seedy@sites.test`; este mecanismo no forma parte del despliegue de producción. Ejecutar la migración inicial una sola vez por base local.

## Producción y acceso
Configurar `ADMIN_EMAIL` en las variables de Sites con el correo real de la cuenta de ChatGPT que administrará el restaurante. Admite varios correos separados por comas. Sin esta variable, el administrador permanece cerrado. La autorización se verifica en el servidor para todas las escrituras y cargas. La carta es independiente del inicio de sesión del administrador.

El primer despliegue es privado para revisión. Antes de imprimir el QR para clientes, cambiar la audiencia del sitio a pública y comprobar el enlace en un navegador sin sesión. Generar el QR desde el dominio publicado, nunca desde localhost.

Los platos, descripciones, precios y fotos iniciales son demostrativos. No son la carta confirmada del restaurante. Al guardar el primer producto real, desaparece toda la muestra; eliminar el último producto deja la carta vacía, sin recuperar los ejemplos.

## Validación realizada
TypeScript y compilación de producción. Prueba integrada local de permisos, origen de petición, validación de precios, carga y lectura de imágenes, creación, persistencia, actualización de precio/novedad/disponibilidad, eliminación y catálogo vacío. Revisión visual móvil y prueba de filtros WebMCP válidos e inválidos.

## Fotografías
Logo proporcionado por el usuario: KUMO LOGO.jfif.
Fotografías de referencia de Unsplash, descargadas localmente:
- Sushi: https://unsplash.com/photos/sushi-on-black-ceramic-plate-IFvjRdXhj_U
- Ramen, tommao wang: https://unsplash.com/photos/a-bowl-of-ramen-with-hard-boiled-eggs-and-meat-ZxR68e4KvEQ
- Gyoza, Mikey Frost: https://unsplash.com/photos/a-black-plate-topped-with-dumplings-on-top-of-a-wooden-table-klTf2RN37Ts
- Licencia: https://unsplash.com/license

Las imágenes subidas que se reemplazan o dejan de usarse no se borran automáticamente del almacenamiento; permite evitar que una referencia compartida pierda su foto. La primera versión no incluye pedidos, pagos ni inventario.

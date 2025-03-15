# Sistema de Gestión para Tienda de Ropa

Sistema completo de gestión para tiendas de ropa con integración de facturación electrónica AFIP, Tienda Nube y Mercado Libre.

## Características Principales

- Gestión de productos con variantes (talles y colores)
- Facturación electrónica AFIP
- Integración con Tienda Nube
- Integración con Mercado Libre
- Gestión de cuentas corrientes
- Control de stock
- Planes de pago

## Requisitos Previos

- Node.js >= 14.0.0
- PostgreSQL >= 12
- Certificados de AFIP para facturación electrónica
- Credenciales de Tienda Nube
- Credenciales de Mercado Libre

## Instalación

1. Clonar el repositorio:
```bash
git clone [url-del-repositorio]
cd clothing-store-management/backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```
Editar el archivo `.env` con las configuraciones correspondientes:
- Datos de conexión a PostgreSQL
- Credenciales de AFIP
- Credenciales de Tienda Nube
- Credenciales de Mercado Libre

4. Inicializar la base de datos:
```bash
# En desarrollo (crea datos de prueba)
npm run init-db:force

# En producción
npm run init-db
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## Estructura de la API

### Productos
- `GET /api/products` - Listar todos los productos
- `GET /api/products/:id` - Obtener un producto específico
- `POST /api/products` - Crear nuevo producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto
- `POST /api/products/variants/:variantId/stock` - Actualizar stock
- `POST /api/products/sync` - Sincronizar con plataformas externas

### Facturación
- `GET /api/invoices` - Listar todas las facturas
- `GET /api/invoices/:id` - Obtener una factura específica
- `POST /api/invoices` - Crear nueva factura
- `POST /api/invoices/:id/void` - Anular factura
- `GET /api/invoices/last-number` - Obtener último número de comprobante

### Cuentas Corrientes
- `GET /api/accounts` - Listar todas las cuentas
- `GET /api/accounts/:id` - Obtener una cuenta específica
- `POST /api/accounts` - Crear nueva cuenta
- `PUT /api/accounts/:id` - Actualizar cuenta
- `POST /api/accounts/:id/transactions` - Registrar transacción
- `POST /api/accounts/:id/payment-plans` - Crear plan de pagos
- `GET /api/accounts/:id/statement` - Obtener estado de cuenta

## Integraciones

### AFIP
La integración con AFIP requiere:
- Certificado digital
- Clave privada
- CUIT válido
- Configuración del entorno (testing/producción)

### Tienda Nube
Requiere las siguientes credenciales:
- Client ID
- Client Secret
- Store ID

### Mercado Libre
Requiere las siguientes credenciales:
- Client ID
- Client Secret
- Redirect URI

## Desarrollo

### Scripts Disponibles
- `npm run dev` - Ejecutar en modo desarrollo
- `npm start` - Ejecutar en producción
- `npm test` - Ejecutar tests
- `npm run init-db` - Inicializar base de datos
- `npm run init-db:force` - Reiniciar base de datos (¡borra datos existentes!)
- `npm run lint` - Verificar estilo de código
- `npm run lint:fix` - Corregir estilo de código

### Estructura del Proyecto
```
backend/
├── config/
│   ├── config.js
│   └── database.js
├── controllers/
│   ├── productController.js
│   ├── invoiceController.js
│   └── accountController.js
├── models/
│   ├── product.js
│   ├── invoice.js
│   └── account.js
├── routes/
│   ├── productRoutes.js
│   ├── invoiceRoutes.js
│   └── accountRoutes.js
├── services/
│   ├── afipService.js
│   ├── tiendaNubeService.js
│   └── mercadoLibreService.js
├── scripts/
│   └── initDb.js
├── app.js
└── package.json
```

## Contribución
1. Fork del repositorio
2. Crear rama para nueva funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia
[MIT](https://opensource.org/licenses/MIT)

## Soporte
Para soporte o consultas, por favor crear un issue en el repositorio.

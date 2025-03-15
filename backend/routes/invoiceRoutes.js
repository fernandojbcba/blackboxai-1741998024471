const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
// const { authenticate } = require('../middleware/auth'); // Para cuando implementemos autenticación

// Rutas públicas
router.get('/', invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.get('/last-number', invoiceController.getLastVoucherNumber);

// Rutas protegidas (requieren autenticación)
// router.use(authenticate);

// Gestión de facturas
router.post('/', invoiceController.createInvoice);
router.post('/:id/void', invoiceController.voidInvoice);

// Documentación de la API
/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Obtiene todas las facturas
 *     tags: [Invoices]
 *     responses:
 *       200:
 *         description: Lista de facturas
 *   post:
 *     summary: Crea una nueva factura
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - items
 *               - afipType
 *               - afipPointOfSale
 *             properties:
 *               clientId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productVariantId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *               afipType:
 *                 type: string
 *                 enum: [A, B, C]
 *               afipPointOfSale:
 *                 type: number
 * 
 * /api/invoices/{id}:
 *   get:
 *     summary: Obtiene una factura por ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 * 
 * /api/invoices/{id}/void:
 *   post:
 *     summary: Anula una factura
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 * 
 * /api/invoices/last-number:
 *   get:
 *     summary: Obtiene el último número de comprobante
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: pointOfSale
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: voucherType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [A, B, C]
 */

// Middleware de validación para crear factura
router.post('/', (req, res, next) => {
  const { clientId, items, afipType, afipPointOfSale } = req.body;

  // Validar campos requeridos
  if (!clientId || !items || !afipType || !afipPointOfSale) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos'
    });
  }

  // Validar items
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Debe incluir al menos un item'
    });
  }

  // Validar cada item
  for (const item of items) {
    if (!item.productVariantId || !item.quantity || !item.unitPrice) {
      return res.status(400).json({
        success: false,
        error: 'Datos de item inválidos'
      });
    }
    if (item.quantity <= 0 || item.unitPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad y precio deben ser mayores a 0'
      });
    }
  }

  // Validar tipo de factura
  if (!['A', 'B', 'C'].includes(afipType)) {
    return res.status(400).json({
      success: false,
      error: 'Tipo de factura inválido'
    });
  }

  // Validar punto de venta
  if (afipPointOfSale <= 0 || afipPointOfSale > 99999) {
    return res.status(400).json({
      success: false,
      error: 'Punto de venta inválido'
    });
  }

  next();
});

// Middleware de validación para anular factura
router.post('/:id/void', (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'ID de factura requerido'
    });
  }

  next();
});

module.exports = router;

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
// const { authenticate } = require('../middleware/auth'); // Para cuando implementemos autenticación

// Rutas públicas
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Rutas protegidas (requieren autenticación)
// router.use(authenticate);

// Gestión de productos
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Gestión de stock
router.post('/variants/:variantId/stock', productController.updateStock);

// Sincronización con plataformas externas
router.post('/sync', productController.syncProducts);

// Documentación de la API
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Obtiene todos los productos
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Lista de productos
 *   post:
 *     summary: Crea un nuevo producto
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - basePrice
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               basePrice:
 *                 type: number
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     size:
 *                       type: string
 *                     color:
 *                       type: string
 *                     stock:
 *                       type: number
 *                     price:
 *                       type: number
 * 
 * /api/products/{id}:
 *   get:
 *     summary: Obtiene un producto por ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *   put:
 *     summary: Actualiza un producto
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *   delete:
 *     summary: Elimina un producto
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 * 
 * /api/products/variants/{variantId}/stock:
 *   post:
 *     summary: Actualiza el stock de una variante
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - type
 *             properties:
 *               quantity:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [entrada, salida]
 *               description:
 *                 type: string
 * 
 * /api/products/sync:
 *   post:
 *     summary: Sincroniza productos con plataformas externas
 *     tags: [Products]
 */

module.exports = router;

const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
// const { authenticate } = require('../middleware/auth'); // Para cuando implementemos autenticación

// Rutas públicas
router.get('/', accountController.getAllAccounts);
router.get('/:id', accountController.getAccountById);
router.get('/:id/statement', accountController.getAccountStatement);

// Rutas protegidas (requieren autenticación)
// router.use(authenticate);

// Gestión de cuentas
router.post('/', accountController.createAccount);
router.put('/:id', accountController.updateAccount);

// Gestión de transacciones y planes de pago
router.post('/:id/transactions', accountController.createTransaction);
router.post('/:id/payment-plans', accountController.createPaymentPlan);

// Documentación de la API
/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Obtiene todas las cuentas corrientes
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: Lista de cuentas corrientes
 *   post:
 *     summary: Crea una nueva cuenta corriente
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - documentType
 *               - documentNumber
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 enum: [DNI, CUIT]
 *               documentNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [client, supplier]
 *               creditLimit:
 *                 type: number
 * 
 * /api/accounts/{id}:
 *   get:
 *     summary: Obtiene una cuenta por ID
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *   put:
 *     summary: Actualiza una cuenta
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 * 
 * /api/accounts/{id}/transactions:
 *   post:
 *     summary: Registra una nueva transacción
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - type
 *               - amount
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [debit, credit]
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               referenceNumber:
 *                 type: string
 * 
 * /api/accounts/{id}/payment-plans:
 *   post:
 *     summary: Crea un nuevo plan de pagos
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - totalAmount
 *               - numberOfInstallments
 *               - frequency
 *               - startDate
 *             properties:
 *               totalAmount:
 *                 type: number
 *               numberOfInstallments:
 *                 type: number
 *               frequency:
 *                 type: string
 *                 enum: [weekly, biweekly, monthly]
 *               startDate:
 *                 type: string
 *                 format: date
 * 
 * /api/accounts/{id}/statement:
 *   get:
 *     summary: Obtiene el estado de cuenta
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 */

// Middleware de validación para crear cuenta
router.post('/', (req, res, next) => {
  const { name, documentType, documentNumber, type } = req.body;

  // Validar campos requeridos
  if (!name || !documentType || !documentNumber || !type) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos'
    });
  }

  // Validar tipo de documento
  if (!['DNI', 'CUIT'].includes(documentType)) {
    return res.status(400).json({
      success: false,
      error: 'Tipo de documento inválido'
    });
  }

  // Validar tipo de cuenta
  if (!['client', 'supplier'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Tipo de cuenta inválido'
    });
  }

  // Validar formato de documento según tipo
  if (documentType === 'DNI' && !/^\d{8}$/.test(documentNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Número de DNI inválido'
    });
  }

  if (documentType === 'CUIT' && !/^\d{11}$/.test(documentNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Número de CUIT inválido'
    });
  }

  next();
});

// Middleware de validación para crear transacción
router.post('/:id/transactions', (req, res, next) => {
  const { type, amount, description } = req.body;

  // Validar campos requeridos
  if (!type || !amount || !description) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos'
    });
  }

  // Validar tipo de transacción
  if (!['debit', 'credit'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Tipo de transacción inválido'
    });
  }

  // Validar monto
  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'El monto debe ser mayor a 0'
    });
  }

  next();
});

// Middleware de validación para crear plan de pagos
router.post('/:id/payment-plans', (req, res, next) => {
  const { totalAmount, numberOfInstallments, frequency, startDate } = req.body;

  // Validar campos requeridos
  if (!totalAmount || !numberOfInstallments || !frequency || !startDate) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos'
    });
  }

  // Validar montos y cuotas
  if (totalAmount <= 0 || numberOfInstallments <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Montos y cuotas deben ser mayores a 0'
    });
  }

  // Validar frecuencia
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
    return res.status(400).json({
      success: false,
      error: 'Frecuencia inválida'
    });
  }

  // Validar fecha de inicio
  const startDateObj = new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Fecha de inicio inválida'
    });
  }

  next();
});

module.exports = router;

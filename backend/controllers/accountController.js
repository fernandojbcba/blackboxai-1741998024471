const { Account, AccountTransaction, PaymentPlan } = require('../models/account');
const { Invoice } = require('../models/invoice');

class AccountController {
  /**
   * Obtiene todas las cuentas corrientes
   */
  async getAllAccounts(req, res) {
    try {
      const accounts = await Account.findAll({
        where: { status: 'active' },
        include: [{
          model: AccountTransaction,
          as: 'transactions',
          limit: 5,
          order: [['date', 'DESC']]
        }]
      });

      res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      console.error('Error al obtener cuentas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener las cuentas corrientes'
      });
    }
  }

  /**
   * Obtiene una cuenta específica por ID
   */
  async getAccountById(req, res) {
    try {
      const account = await Account.findByPk(req.params.id, {
        include: [
          {
            model: AccountTransaction,
            as: 'transactions',
            order: [['date', 'DESC']],
            include: [{
              model: Invoice,
              as: 'invoice'
            }]
          },
          {
            model: PaymentPlan,
            as: 'paymentPlans',
            where: { status: 'active' },
            required: false
          }
        ]
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Cuenta no encontrada'
        });
      }

      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Error al obtener cuenta:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener la cuenta corriente'
      });
    }
  }

  /**
   * Crea una nueva cuenta corriente
   */
  async createAccount(req, res) {
    try {
      const {
        name,
        documentType,
        documentNumber,
        email,
        phone,
        address,
        type,
        creditLimit
      } = req.body;

      // Verificar si ya existe una cuenta con el mismo documento
      const existingAccount = await Account.findOne({
        where: { documentType, documentNumber }
      });

      if (existingAccount) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe una cuenta con este documento'
        });
      }

      const account = await Account.create({
        name,
        documentType,
        documentNumber,
        email,
        phone,
        address,
        type,
        creditLimit: creditLimit || 0,
        currentBalance: 0,
        status: 'active'
      });

      res.status(201).json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Error al crear cuenta:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear la cuenta corriente'
      });
    }
  }

  /**
   * Actualiza una cuenta corriente
   */
  async updateAccount(req, res) {
    try {
      const {
        name,
        email,
        phone,
        address,
        creditLimit,
        status
      } = req.body;

      const account = await Account.findByPk(req.params.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Cuenta no encontrada'
        });
      }

      await account.update({
        name,
        email,
        phone,
        address,
        creditLimit,
        status
      });

      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Error al actualizar cuenta:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar la cuenta corriente'
      });
    }
  }

  /**
   * Registra un nuevo movimiento en la cuenta
   */
  async createTransaction(req, res) {
    try {
      const accountId = req.params.id;
      const {
        type,
        amount,
        description,
        paymentMethod,
        referenceNumber
      } = req.body;

      const account = await Account.findByPk(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Cuenta no encontrada'
        });
      }

      // Calcular nuevo balance
      const newBalance = type === 'credit'
        ? account.currentBalance - amount
        : account.currentBalance + amount;

      // Verificar límite de crédito si es un débito
      if (type === 'debit' && newBalance > account.creditLimit) {
        return res.status(400).json({
          success: false,
          error: 'La operación excede el límite de crédito'
        });
      }

      // Crear transacción
      const transaction = await AccountTransaction.create({
        accountId,
        type,
        amount,
        description,
        paymentMethod,
        referenceNumber,
        balanceAfter: newBalance,
        createdBy: req.user.id // Asumiendo que hay un usuario autenticado
      });

      // Actualizar balance de la cuenta
      await account.update({
        currentBalance: newBalance,
        lastTransactionDate: new Date()
      });

      res.status(201).json({
        success: true,
        data: {
          transaction,
          newBalance
        }
      });
    } catch (error) {
      console.error('Error al crear transacción:', error);
      res.status(500).json({
        success: false,
        error: 'Error al registrar el movimiento'
      });
    }
  }

  /**
   * Crea un plan de pagos
   */
  async createPaymentPlan(req, res) {
    try {
      const accountId = req.params.id;
      const {
        totalAmount,
        numberOfInstallments,
        frequency,
        startDate
      } = req.body;

      const account = await Account.findByPk(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Cuenta no encontrada'
        });
      }

      // Calcular monto de cuota
      const installmentAmount = totalAmount / numberOfInstallments;

      const paymentPlan = await PaymentPlan.create({
        accountId,
        totalAmount,
        numberOfInstallments,
        installmentAmount,
        frequency,
        startDate: new Date(startDate),
        status: 'active'
      });

      res.status(201).json({
        success: true,
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error al crear plan de pagos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear el plan de pagos'
      });
    }
  }

  /**
   * Obtiene el estado de cuenta
   */
  async getAccountStatement(req, res) {
    try {
      const accountId = req.params.id;
      const { startDate, endDate } = req.query;

      const account = await Account.findByPk(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Cuenta no encontrada'
        });
      }

      // Construir condiciones de búsqueda
      const where = {
        accountId,
        date: {}
      };

      if (startDate) {
        where.date.$gte = new Date(startDate);
      }
      if (endDate) {
        where.date.$lte = new Date(endDate);
      }

      // Obtener transacciones
      const transactions = await AccountTransaction.findAll({
        where,
        order: [['date', 'ASC']],
        include: [{
          model: Invoice,
          as: 'invoice'
        }]
      });

      // Calcular totales
      const totals = transactions.reduce((acc, trans) => {
        if (trans.type === 'debit') {
          acc.debits += trans.amount;
        } else {
          acc.credits += trans.amount;
        }
        return acc;
      }, { debits: 0, credits: 0 });

      res.json({
        success: true,
        data: {
          account: {
            id: account.id,
            name: account.name,
            currentBalance: account.currentBalance
          },
          transactions,
          totals,
          period: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener estado de cuenta:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el estado de cuenta'
      });
    }
  }
}

module.exports = new AccountController();

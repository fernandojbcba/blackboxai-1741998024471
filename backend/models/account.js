const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Account extends Model {}

Account.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Datos del titular
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  documentType: {
    type: DataTypes.STRING, // DNI, CUIT, etc.
    allowNull: false
  },
  documentNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.STRING
  },
  // Datos de la cuenta
  type: {
    type: DataTypes.ENUM('client', 'supplier'),
    allowNull: false
  },
  creditLimit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  currentBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'closed'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT
  },
  // Campos de control
  lastTransactionDate: {
    type: DataTypes.DATE
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Account',
  tableName: 'accounts',
  indexes: [
    {
      unique: true,
      fields: ['documentType', 'documentNumber']
    }
  ]
});

// Modelo para los movimientos de la cuenta corriente
class AccountTransaction extends Model {}

AccountTransaction.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Referencias a documentos relacionados
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  paymentMethod: {
    type: DataTypes.STRING // efectivo, transferencia, cheque, etc.
  },
  referenceNumber: {
    type: DataTypes.STRING // número de cheque, transferencia, etc.
  },
  // Balance después de la transacción
  balanceAfter: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // Metadata adicional
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  // Campos de control
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'AccountTransaction',
  tableName: 'account_transactions'
});

// Modelo para los planes de pago
class PaymentPlan extends Model {}

PaymentPlan.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  numberOfInstallments: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  installmentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  frequency: {
    type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'defaulted', 'cancelled'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'PaymentPlan',
  tableName: 'payment_plans'
});

// Establecer relaciones
Account.hasMany(AccountTransaction, {
  foreignKey: 'accountId',
  as: 'transactions'
});

AccountTransaction.belongsTo(Account, {
  foreignKey: 'accountId',
  as: 'account'
});

Account.hasMany(PaymentPlan, {
  foreignKey: 'accountId',
  as: 'paymentPlans'
});

PaymentPlan.belongsTo(Account, {
  foreignKey: 'accountId',
  as: 'account'
});

module.exports = {
  Account,
  AccountTransaction,
  PaymentPlan
};

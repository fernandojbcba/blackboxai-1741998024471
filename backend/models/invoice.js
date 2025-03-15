const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Invoice extends Model {}

Invoice.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Datos de AFIP
  afipType: {
    type: DataTypes.STRING(2), // 'A', 'B', 'C', etc.
    allowNull: false
  },
  afipNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  afipPointOfSale: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cae: {
    type: DataTypes.STRING,
    allowNull: true // Será null hasta que AFIP lo genere
  },
  caeExpirationDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Datos del cliente
  clientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientDocType: {
    type: DataTypes.STRING, // DNI, CUIT, etc.
    allowNull: false
  },
  clientDocNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientAddress: {
    type: DataTypes.STRING
  },
  // Datos de la factura
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'error'),
    defaultValue: 'pending'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Campos de control
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
  modelName: 'Invoice',
  tableName: 'invoices'
});

// Modelo para los items de la factura
class InvoiceItem extends Model {}

InvoiceItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  productVariantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'product_variants',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'InvoiceItem',
  tableName: 'invoice_items'
});

// Establecer relaciones
Invoice.hasMany(InvoiceItem, {
  foreignKey: 'invoiceId',
  as: 'items'
});

InvoiceItem.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});

// Historial de eventos de la factura
class InvoiceEvent extends Model {}

InvoiceEvent.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING, // 'created', 'sent_to_afip', 'cae_received', 'error', etc.
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'InvoiceEvent',
  tableName: 'invoice_events'
});

// Establecer relaciones para eventos
Invoice.hasMany(InvoiceEvent, {
  foreignKey: 'invoiceId',
  as: 'events'
});

InvoiceEvent.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});

module.exports = {
  Invoice,
  InvoiceItem,
  InvoiceEvent
};

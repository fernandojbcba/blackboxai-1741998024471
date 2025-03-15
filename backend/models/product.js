const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Product extends Model {}

Product.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  brand: {
    type: DataTypes.STRING
  },
  supplier: {
    type: DataTypes.STRING
  },
  // Campos para integraciones
  tiendaNubeId: {
    type: DataTypes.STRING,
    unique: true
  },
  mercadoLibreId: {
    type: DataTypes.STRING,
    unique: true
  },
  // Campos de control
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  modelName: 'Product',
  tableName: 'products'
});

// Modelo para variantes de productos (combinaciones de talle y color)
class ProductVariant extends Model {}

ProductVariant.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  size: {
    type: DataTypes.STRING,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'ProductVariant',
  tableName: 'product_variants'
});

// Establecer relaciones
Product.hasMany(ProductVariant, {
  foreignKey: 'productId',
  as: 'variants'
});

ProductVariant.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

// Historial de movimientos de stock
class StockMovement extends Model {}

StockMovement.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  variantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'product_variants',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('entrada', 'salida'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING
  },
  documentNumber: {
    type: DataTypes.STRING
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'StockMovement',
  tableName: 'stock_movements'
});

// Establecer relaciones para movimientos de stock
ProductVariant.hasMany(StockMovement, {
  foreignKey: 'variantId',
  as: 'stockMovements'
});

StockMovement.belongsTo(ProductVariant, {
  foreignKey: 'variantId',
  as: 'variant'
});

module.exports = {
  Product,
  ProductVariant,
  StockMovement
};

const { sequelize } = require('../config/database');
const { Product, ProductVariant, StockMovement } = require('../models/product');
const { Invoice, InvoiceItem, InvoiceEvent } = require('../models/invoice');
const { Account, AccountTransaction, PaymentPlan } = require('../models/account');

async function initializeDatabase() {
  try {
    // Sincronizar todos los modelos con la base de datos
    console.log('Iniciando sincronización de la base de datos...');

    // Forzar recreación de tablas en desarrollo
    const force = process.env.NODE_ENV === 'development';

    // Sincronizar modelos en orden debido a las relaciones
    await sequelize.sync({ force });

    console.log('Base de datos sincronizada correctamente.');

    // Si estamos en desarrollo, crear algunos datos de prueba
    if (process.env.NODE_ENV === 'development') {
      console.log('Creando datos de prueba...');

      // Crear cuenta de prueba
      const account = await Account.create({
        name: 'Cliente de Prueba',
        documentType: 'DNI',
        documentNumber: '12345678',
        email: 'cliente@test.com',
        phone: '1234567890',
        address: 'Calle Falsa 123',
        type: 'client',
        creditLimit: 50000,
        status: 'active'
      });

      // Crear producto de prueba
      const product = await Product.create({
        name: 'Vestido Floral',
        description: 'Vestido de verano con estampado floral',
        basePrice: 15000,
        category: 'Vestidos',
        brand: 'Marca Test',
        supplier: 'Proveedor Test',
        isActive: true
      });

      // Crear variantes del producto
      const variant1 = await ProductVariant.create({
        productId: product.id,
        size: 'M',
        color: 'Azul',
        sku: 'VF-M-AZ',
        stock: 10,
        price: 15000
      });

      const variant2 = await ProductVariant.create({
        productId: product.id,
        size: 'L',
        color: 'Rojo',
        sku: 'VF-L-RO',
        stock: 8,
        price: 15000
      });

      // Crear movimiento de stock
      await StockMovement.create({
        variantId: variant1.id,
        type: 'entrada',
        quantity: 10,
        description: 'Stock inicial',
        date: new Date()
      });

      // Crear factura de prueba
      const invoice = await Invoice.create({
        clientId: account.id,
        clientName: account.name,
        clientDocType: account.documentType,
        clientDocNumber: account.documentNumber,
        clientAddress: account.address,
        afipType: 'B',
        afipPointOfSale: 1,
        afipNumber: 1,
        subtotal: 15000,
        tax: 3150,
        total: 18150,
        status: 'completed',
        date: new Date()
      });

      // Crear item de factura
      await InvoiceItem.create({
        invoiceId: invoice.id,
        productVariantId: variant1.id,
        description: 'Vestido Floral Azul Talle M',
        quantity: 1,
        unitPrice: 15000,
        subtotal: 15000,
        tax: 3150,
        total: 18150
      });

      // Crear evento de factura
      await InvoiceEvent.create({
        invoiceId: invoice.id,
        type: 'created',
        description: 'Factura creada correctamente',
        date: new Date()
      });

      // Crear transacción en cuenta corriente
      await AccountTransaction.create({
        accountId: account.id,
        type: 'debit',
        amount: 18150,
        description: 'Factura B 0001-00000001',
        invoiceId: invoice.id,
        paymentMethod: 'efectivo',
        balanceAfter: 18150,
        date: new Date(),
        createdBy: 'system'
      });

      // Crear plan de pagos
      await PaymentPlan.create({
        accountId: account.id,
        totalAmount: 18150,
        numberOfInstallments: 3,
        installmentAmount: 6050,
        frequency: 'monthly',
        startDate: new Date(),
        status: 'active'
      });

      console.log('Datos de prueba creados correctamente.');
    }

    console.log('Inicialización completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    process.exit(1);
  }
}

// Ejecutar la inicialización
initializeDatabase();

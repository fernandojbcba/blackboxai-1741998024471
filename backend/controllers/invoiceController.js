const { Invoice, InvoiceItem, InvoiceEvent } = require('../models/invoice');
const { Account, AccountTransaction } = require('../models/account');
const { ProductVariant } = require('../models/product');
const afipService = require('../services/afipService');

class InvoiceController {
  /**
   * Obtiene todas las facturas
   */
  async getAllInvoices(req, res) {
    try {
      const invoices = await Invoice.findAll({
        include: [
          {
            model: InvoiceItem,
            as: 'items'
          },
          {
            model: InvoiceEvent,
            as: 'events'
          }
        ],
        order: [['date', 'DESC']]
      });

      res.json({
        success: true,
        data: invoices
      });
    } catch (error) {
      console.error('Error al obtener facturas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener las facturas'
      });
    }
  }

  /**
   * Obtiene una factura específica por ID
   */
  async getInvoiceById(req, res) {
    try {
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [
          {
            model: InvoiceItem,
            as: 'items'
          },
          {
            model: InvoiceEvent,
            as: 'events',
            order: [['date', 'DESC']]
          }
        ]
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Factura no encontrada'
        });
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('Error al obtener factura:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener la factura'
      });
    }
  }

  /**
   * Crea una nueva factura electrónica
   */
  async createInvoice(req, res) {
    try {
      const {
        clientId,
        items,
        afipType,
        afipPointOfSale
      } = req.body;

      // Verificar cliente
      const client = await Account.findByPk(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado'
        });
      }

      // Verificar y calcular totales
      let subtotal = 0;
      let tax = 0;
      let total = 0;

      // Verificar stock y productos
      for (const item of items) {
        const variant = await ProductVariant.findByPk(item.productVariantId);
        if (!variant) {
          return res.status(404).json({
            success: false,
            error: `Variante de producto no encontrada: ${item.productVariantId}`
          });
        }

        if (variant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            error: `Stock insuficiente para el producto: ${variant.sku}`
          });
        }

        // Calcular importes
        const itemSubtotal = variant.price * item.quantity;
        const itemTax = itemSubtotal * 0.21; // IVA 21%
        
        subtotal += itemSubtotal;
        tax += itemTax;
        total += (itemSubtotal + itemTax);
      }

      // Crear factura en estado pendiente
      const invoice = await Invoice.create({
        clientId,
        clientName: client.name,
        clientDocType: client.documentType,
        clientDocNumber: client.documentNumber,
        clientAddress: client.address,
        afipType,
        afipPointOfSale,
        subtotal,
        tax,
        total,
        status: 'pending'
      });

      // Crear items de la factura
      await Promise.all(items.map(item =>
        InvoiceItem.create({
          invoiceId: invoice.id,
          ...item,
          subtotal: item.unitPrice * item.quantity,
          tax: item.unitPrice * item.quantity * 0.21,
          total: (item.unitPrice * item.quantity) * 1.21
        })
      ));

      // Registrar evento de creación
      await InvoiceEvent.create({
        invoiceId: invoice.id,
        type: 'created',
        description: 'Factura creada'
      });

      try {
        // Solicitar CAE a AFIP
        const afipResponse = await afipService.createVoucher({
          pointOfSale: afipPointOfSale,
          voucherType: afipType,
          documentType: client.documentType,
          documentNumber: client.documentNumber,
          total: total,
          subtotal: subtotal,
          tax: tax
        });

        // Actualizar factura con datos de AFIP
        await invoice.update({
          afipNumber: afipResponse.voucherNumber,
          cae: afipResponse.cae,
          caeExpirationDate: afipResponse.caeExpirationDate,
          status: 'completed'
        });

        // Registrar evento de CAE
        await InvoiceEvent.create({
          invoiceId: invoice.id,
          type: 'cae_received',
          description: 'CAE recibido de AFIP',
          metadata: afipResponse
        });

        // Actualizar stock
        for (const item of items) {
          const variant = await ProductVariant.findByPk(item.productVariantId);
          await variant.update({
            stock: variant.stock - item.quantity
          });
        }

        // Crear movimiento en cuenta corriente
        await AccountTransaction.create({
          accountId: clientId,
          type: 'debit',
          amount: total,
          description: `Factura ${afipType} ${afipPointOfSale}-${afipResponse.voucherNumber}`,
          invoiceId: invoice.id,
          createdBy: req.user.id, // Asumiendo que hay un usuario autenticado
          balanceAfter: client.currentBalance + total
        });

        // Actualizar saldo del cliente
        await client.update({
          currentBalance: client.currentBalance + total,
          lastTransactionDate: new Date()
        });

      } catch (afipError) {
        console.error('Error con AFIP:', afipError);
        
        // Actualizar estado de la factura
        await invoice.update({
          status: 'error',
          errorMessage: afipError.message
        });

        // Registrar evento de error
        await InvoiceEvent.create({
          invoiceId: invoice.id,
          type: 'error',
          description: 'Error al procesar con AFIP',
          metadata: { error: afipError.message }
        });

        return res.status(500).json({
          success: false,
          error: 'Error al procesar la factura con AFIP',
          invoice: invoice.id
        });
      }

      // Recargar factura con todas las relaciones
      const createdInvoice = await Invoice.findByPk(invoice.id, {
        include: [
          {
            model: InvoiceItem,
            as: 'items'
          },
          {
            model: InvoiceEvent,
            as: 'events',
            order: [['date', 'DESC']]
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: createdInvoice
      });

    } catch (error) {
      console.error('Error al crear factura:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear la factura'
      });
    }
  }

  /**
   * Anula una factura
   */
  async voidInvoice(req, res) {
    try {
      const invoice = await Invoice.findByPk(req.params.id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Factura no encontrada'
        });
      }

      if (invoice.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Solo se pueden anular facturas completadas'
        });
      }

      // Crear nota de crédito en AFIP
      try {
        const afipResponse = await afipService.createVoucher({
          pointOfSale: invoice.afipPointOfSale,
          voucherType: 'NC' + invoice.afipType, // NC = Nota de Crédito
          documentType: invoice.clientDocType,
          documentNumber: invoice.clientDocNumber,
          total: invoice.total,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          relatedVouchers: [{
            type: invoice.afipType,
            number: invoice.afipNumber,
            pointOfSale: invoice.afipPointOfSale
          }]
        });

        // Registrar nota de crédito
        await InvoiceEvent.create({
          invoiceId: invoice.id,
          type: 'voided',
          description: 'Factura anulada con nota de crédito',
          metadata: afipResponse
        });

        // Actualizar cuenta corriente
        const client = await Account.findByPk(invoice.clientId);
        if (client) {
          await AccountTransaction.create({
            accountId: invoice.clientId,
            type: 'credit',
            amount: invoice.total,
            description: `Anulación Factura ${invoice.afipType} ${invoice.afipPointOfSale}-${invoice.afipNumber}`,
            invoiceId: invoice.id,
            createdBy: req.user.id,
            balanceAfter: client.currentBalance - invoice.total
          });

          await client.update({
            currentBalance: client.currentBalance - invoice.total,
            lastTransactionDate: new Date()
          });
        }

        // Restaurar stock
        const items = await InvoiceItem.findAll({
          where: { invoiceId: invoice.id }
        });

        for (const item of items) {
          const variant = await ProductVariant.findByPk(item.productVariantId);
          if (variant) {
            await variant.update({
              stock: variant.stock + item.quantity
            });
          }
        }

        res.json({
          success: true,
          message: 'Factura anulada correctamente'
        });

      } catch (afipError) {
        console.error('Error al anular en AFIP:', afipError);
        return res.status(500).json({
          success: false,
          error: 'Error al anular la factura en AFIP'
        });
      }

    } catch (error) {
      console.error('Error al anular factura:', error);
      res.status(500).json({
        success: false,
        error: 'Error al anular la factura'
      });
    }
  }

  /**
   * Obtiene el último número de comprobante
   */
  async getLastVoucherNumber(req, res) {
    try {
      const { pointOfSale, voucherType } = req.query;

      const lastNumber = await afipService.getLastVoucher(
        parseInt(pointOfSale),
        voucherType
      );

      res.json({
        success: true,
        data: {
          pointOfSale,
          voucherType,
          lastNumber
        }
      });
    } catch (error) {
      console.error('Error al obtener último número:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener último número de comprobante'
      });
    }
  }
}

module.exports = new InvoiceController();

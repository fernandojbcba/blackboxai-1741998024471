const { Product, ProductVariant, StockMovement } = require('../models/product');
const tiendaNubeService = require('../services/tiendaNubeService');
const mercadoLibreService = require('../services/mercadoLibreService');

class ProductController {
  /**
   * Obtiene todos los productos con sus variantes
   */
  async getAllProducts(req, res) {
    try {
      const products = await Product.findAll({
        include: [{
          model: ProductVariant,
          as: 'variants'
        }],
        where: {
          isActive: true
        }
      });

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los productos'
      });
    }
  }

  /**
   * Obtiene un producto específico por ID
   */
  async getProductById(req, res) {
    try {
      const product = await Product.findOne({
        where: {
          id: req.params.id,
          isActive: true
        },
        include: [{
          model: ProductVariant,
          as: 'variants',
          include: [{
            model: StockMovement,
            as: 'stockMovements',
            limit: 10,
            order: [['date', 'DESC']]
          }]
        }]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el producto'
      });
    }
  }

  /**
   * Crea un nuevo producto con sus variantes
   */
  async createProduct(req, res) {
    try {
      const {
        name,
        description,
        basePrice,
        category,
        brand,
        supplier,
        variants
      } = req.body;

      // Crear producto base
      const product = await Product.create({
        name,
        description,
        basePrice,
        category,
        brand,
        supplier
      });

      // Crear variantes
      if (variants && variants.length > 0) {
        await Promise.all(variants.map(variant =>
          ProductVariant.create({
            ...variant,
            productId: product.id
          })
        ));
      }

      // Recargar producto con variantes
      const createdProduct = await Product.findByPk(product.id, {
        include: [{
          model: ProductVariant,
          as: 'variants'
        }]
      });

      // Sincronizar con plataformas externas si está configurado
      try {
        if (process.env.SYNC_TIENDANUBE === 'true') {
          await tiendaNubeService.createOrUpdateProduct(createdProduct, createdProduct.variants);
        }
        if (process.env.SYNC_MERCADOLIBRE === 'true') {
          await mercadoLibreService.createOrUpdateProduct(createdProduct, createdProduct.variants);
        }
      } catch (syncError) {
        console.error('Error en sincronización:', syncError);
        // No fallamos la creación del producto si falla la sincronización
      }

      res.status(201).json({
        success: true,
        data: createdProduct
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear el producto'
      });
    }
  }

  /**
   * Actualiza un producto existente
   */
  async updateProduct(req, res) {
    try {
      const productId = req.params.id;
      const {
        name,
        description,
        basePrice,
        category,
        brand,
        supplier,
        variants
      } = req.body;

      // Verificar si el producto existe
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado'
        });
      }

      // Actualizar producto base
      await product.update({
        name,
        description,
        basePrice,
        category,
        brand,
        supplier
      });

      // Actualizar o crear variantes
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          if (variant.id) {
            // Actualizar variante existente
            await ProductVariant.update(variant, {
              where: { id: variant.id, productId }
            });
          } else {
            // Crear nueva variante
            await ProductVariant.create({
              ...variant,
              productId
            });
          }
        }
      }

      // Recargar producto con variantes actualizadas
      const updatedProduct = await Product.findByPk(productId, {
        include: [{
          model: ProductVariant,
          as: 'variants'
        }]
      });

      // Sincronizar con plataformas externas
      try {
        if (process.env.SYNC_TIENDANUBE === 'true') {
          await tiendaNubeService.createOrUpdateProduct(updatedProduct, updatedProduct.variants);
        }
        if (process.env.SYNC_MERCADOLIBRE === 'true') {
          await mercadoLibreService.createOrUpdateProduct(updatedProduct, updatedProduct.variants);
        }
      } catch (syncError) {
        console.error('Error en sincronización:', syncError);
      }

      res.json({
        success: true,
        data: updatedProduct
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar el producto'
      });
    }
  }

  /**
   * Actualiza el stock de una variante
   */
  async updateStock(req, res) {
    try {
      const { variantId } = req.params;
      const { quantity, type, description } = req.body;

      const variant = await ProductVariant.findByPk(variantId);
      if (!variant) {
        return res.status(404).json({
          success: false,
          error: 'Variante no encontrada'
        });
      }

      // Calcular nuevo stock
      const newStock = type === 'entrada' 
        ? variant.stock + quantity 
        : variant.stock - quantity;

      // Validar stock negativo
      if (newStock < 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay suficiente stock disponible'
        });
      }

      // Registrar movimiento
      await StockMovement.create({
        variantId,
        type,
        quantity,
        description
      });

      // Actualizar stock
      await variant.update({ stock: newStock });

      // Sincronizar con plataformas externas
      try {
        const product = await Product.findByPk(variant.productId);
        
        if (process.env.SYNC_TIENDANUBE === 'true') {
          await tiendaNubeService.updateProductStock(product.id, variantId, newStock);
        }
        if (process.env.SYNC_MERCADOLIBRE === 'true') {
          await mercadoLibreService.updateStock(product.id, variantId, newStock);
        }
      } catch (syncError) {
        console.error('Error en sincronización de stock:', syncError);
      }

      res.json({
        success: true,
        data: {
          variantId,
          newStock,
          movement: {
            type,
            quantity,
            description
          }
        }
      });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar el stock'
      });
    }
  }

  /**
   * Elimina un producto (soft delete)
   */
  async deleteProduct(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado'
        });
      }

      // Realizar soft delete
      await product.update({ isActive: false });

      res.json({
        success: true,
        message: 'Producto eliminado correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar el producto'
      });
    }
  }

  /**
   * Sincroniza productos con plataformas externas
   */
  async syncProducts(req, res) {
    try {
      const results = {
        tiendaNube: null,
        mercadoLibre: null
      };

      if (process.env.SYNC_TIENDANUBE === 'true') {
        try {
          results.tiendaNube = await tiendaNubeService.syncProductsFromTiendaNube();
        } catch (error) {
          console.error('Error sincronizando con Tienda Nube:', error);
          results.tiendaNube = { error: error.message };
        }
      }

      if (process.env.SYNC_MERCADOLIBRE === 'true') {
        try {
          // Implementar sincronización con Mercado Libre
          results.mercadoLibre = { message: 'Sincronización con Mercado Libre no implementada' };
        } catch (error) {
          console.error('Error sincronizando con Mercado Libre:', error);
          results.mercadoLibre = { error: error.message };
        }
      }

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error en sincronización:', error);
      res.status(500).json({
        success: false,
        error: 'Error al sincronizar productos'
      });
    }
  }
}

module.exports = new ProductController();

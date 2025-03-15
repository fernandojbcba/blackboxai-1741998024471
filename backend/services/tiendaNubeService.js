const axios = require('axios');
const config = require('../config/config')[process.env.NODE_ENV || 'development'].tiendaNube;
const { Product, ProductVariant } = require('../models/product');

class TiendaNubeService {
  constructor() {
    this.apiUrl = 'https://api.tiendanube.com/v1';
    this.storeId = config.storeId;
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authentication': `Bearer ${config.clientSecret}`,
        'User-Agent': 'Clothing Store Management System',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Sincroniza productos desde Tienda Nube hacia la base de datos local
   */
  async syncProductsFromTiendaNube() {
    try {
      const response = await this.client.get(`/${this.storeId}/products`);
      const products = response.data;

      for (const tnProduct of products) {
        await this.syncSingleProduct(tnProduct);
      }

      return {
        success: true,
        message: `${products.length} productos sincronizados correctamente`
      };
    } catch (error) {
      console.error('Error al sincronizar productos desde Tienda Nube:', error);
      throw error;
    }
  }

  /**
   * Sincroniza un único producto desde Tienda Nube
   */
  async syncSingleProduct(tnProduct) {
    try {
      // Buscar o crear el producto base
      const [product, created] = await Product.findOrCreate({
        where: { tiendaNubeId: tnProduct.id.toString() },
        defaults: {
          name: tnProduct.name.es,
          description: tnProduct.description.es,
          basePrice: tnProduct.price,
          category: tnProduct.categories[0]?.name || 'Sin categoría',
          brand: tnProduct.brand || null
        }
      });

      // Si el producto ya existía, actualizar sus datos
      if (!created) {
        await product.update({
          name: tnProduct.name.es,
          description: tnProduct.description.es,
          basePrice: tnProduct.price,
          category: tnProduct.categories[0]?.name || 'Sin categoría',
          brand: tnProduct.brand || null
        });
      }

      // Sincronizar variantes
      await this.syncProductVariants(product, tnProduct.variants);

      return product;
    } catch (error) {
      console.error('Error al sincronizar producto individual:', error);
      throw error;
    }
  }

  /**
   * Sincroniza las variantes de un producto
   */
  async syncProductVariants(product, tnVariants) {
    try {
      for (const tnVariant of tnVariants) {
        const [variant, created] = await ProductVariant.findOrCreate({
          where: {
            productId: product.id,
            size: tnVariant.values.find(v => v.name === 'Talle')?.value || 'Único',
            color: tnVariant.values.find(v => v.name === 'Color')?.value || 'Único'
          },
          defaults: {
            sku: tnVariant.sku,
            stock: tnVariant.stock,
            price: tnVariant.price || product.basePrice
          }
        });

        if (!created) {
          await variant.update({
            sku: tnVariant.sku,
            stock: tnVariant.stock,
            price: tnVariant.price || product.basePrice
          });
        }
      }
    } catch (error) {
      console.error('Error al sincronizar variantes:', error);
      throw error;
    }
  }

  /**
   * Actualiza el stock de un producto en Tienda Nube
   */
  async updateProductStock(productId, variantId, newStock) {
    try {
      const product = await Product.findOne({
        where: { id: productId },
        include: [{
          model: ProductVariant,
          as: 'variants',
          where: { id: variantId }
        }]
      });

      if (!product || !product.tiendaNubeId) {
        throw new Error('Producto no encontrado o no sincronizado con Tienda Nube');
      }

      const variant = product.variants[0];
      const tnVariantId = variant.tiendaNubeId;

      await this.client.put(`/${this.storeId}/products/${product.tiendaNubeId}/variants/${tnVariantId}`, {
        stock: newStock
      });

      return {
        success: true,
        message: 'Stock actualizado correctamente en Tienda Nube'
      };
    } catch (error) {
      console.error('Error al actualizar stock en Tienda Nube:', error);
      throw error;
    }
  }

  /**
   * Sincroniza pedidos desde Tienda Nube
   */
  async syncOrders(fromDate = null) {
    try {
      let params = {};
      if (fromDate) {
        params.created_at_min = fromDate.toISOString();
      }

      const response = await this.client.get(`/${this.storeId}/orders`, { params });
      const orders = response.data;

      // Procesar cada pedido
      for (const order of orders) {
        await this.processOrder(order);
      }

      return {
        success: true,
        message: `${orders.length} pedidos sincronizados correctamente`
      };
    } catch (error) {
      console.error('Error al sincronizar pedidos de Tienda Nube:', error);
      throw error;
    }
  }

  /**
   * Procesa un pedido individual de Tienda Nube
   */
  async processOrder(order) {
    try {
      // Aquí implementar la lógica para procesar el pedido
      // Por ejemplo, crear una factura, actualizar stock, etc.
      console.log(`Procesando pedido ${order.id} de Tienda Nube`);

      // Implementar lógica específica según necesidades
      // - Crear factura
      // - Actualizar stock
      // - Registrar en cuenta corriente si aplica
      // - etc.

    } catch (error) {
      console.error(`Error al procesar pedido ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Crea o actualiza un producto en Tienda Nube
   */
  async createOrUpdateProduct(product, variants) {
    try {
      const productData = {
        name: { es: product.name },
        description: { es: product.description },
        price: product.basePrice,
        categories: [{ name: product.category }],
        brand: product.brand,
        variants: variants.map(variant => ({
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
          values: [
            { name: 'Talle', value: variant.size },
            { name: 'Color', value: variant.color }
          ]
        }))
      };

      let response;
      if (product.tiendaNubeId) {
        // Actualizar producto existente
        response = await this.client.put(
          `/${this.storeId}/products/${product.tiendaNubeId}`,
          productData
        );
      } else {
        // Crear nuevo producto
        response = await this.client.post(
          `/${this.storeId}/products`,
          productData
        );
        // Actualizar el ID de Tienda Nube en la base de datos local
        await product.update({ tiendaNubeId: response.data.id.toString() });
      }

      return {
        success: true,
        tiendaNubeId: response.data.id,
        message: product.tiendaNubeId ? 'Producto actualizado' : 'Producto creado'
      };
    } catch (error) {
      console.error('Error al crear/actualizar producto en Tienda Nube:', error);
      throw error;
    }
  }
}

module.exports = new TiendaNubeService();

const axios = require('axios');
const config = require('../config/config')[process.env.NODE_ENV || 'development'].mercadoLibre;
const { Product, ProductVariant } = require('../models/product');

class MercadoLibreService {
  constructor() {
    this.baseUrl = 'https://api.mercadolibre.com';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiration = null;
  }

  /**
   * Inicializa o refresca el token de acceso
   */
  async initialize() {
    try {
      if (this.accessToken && this.tokenExpiration && new Date() < this.tokenExpiration) {
        return true;
      }

      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        await this.getNewAccessToken();
      }

      return true;
    } catch (error) {
      console.error('Error al inicializar servicio de Mercado Libre:', error);
      throw error;
    }
  }

  /**
   * Obtiene un nuevo token de acceso
   */
  async getNewAccessToken() {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: 'authorization_code', // Este código se obtiene del proceso de autorización
        redirect_uri: config.redirectUri
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiration = new Date(Date.now() + response.data.expires_in * 1000);

      return true;
    } catch (error) {
      console.error('Error al obtener token de acceso:', error);
      throw error;
    }
  }

  /**
   * Refresca el token de acceso usando el refresh token
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token`, {
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: this.refreshToken
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiration = new Date(Date.now() + response.data.expires_in * 1000);

      return true;
    } catch (error) {
      console.error('Error al refrescar token:', error);
      throw error;
    }
  }

  /**
   * Crea el cliente HTTP con el token de acceso actual
   */
  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Publica o actualiza un producto en Mercado Libre
   */
  async createOrUpdateProduct(product, variants) {
    try {
      await this.initialize();
      const client = this.getClient();

      const mlProduct = this.formatProductForML(product, variants);

      let response;
      if (product.mercadoLibreId) {
        // Actualizar producto existente
        response = await client.put(`/items/${product.mercadoLibreId}`, mlProduct);
      } else {
        // Crear nuevo producto
        response = await client.post('/items', mlProduct);
        // Actualizar el ID de ML en la base de datos local
        await product.update({ mercadoLibreId: response.data.id });
      }

      // Actualizar variaciones si existen
      if (variants.length > 1) {
        await this.updateProductVariations(product.mercadoLibreId, variants);
      }

      return {
        success: true,
        mercadoLibreId: response.data.id,
        message: product.mercadoLibreId ? 'Producto actualizado' : 'Producto creado'
      };
    } catch (error) {
      console.error('Error al crear/actualizar producto en Mercado Libre:', error);
      throw error;
    }
  }

  /**
   * Formatea un producto para Mercado Libre
   */
  formatProductForML(product, variants) {
    // Implementar la transformación del producto al formato de ML
    return {
      title: product.name,
      category_id: "CATEGORY_ID", // Requiere mapeo de categorías
      price: product.basePrice,
      currency_id: "ARS",
      available_quantity: variants.reduce((total, variant) => total + variant.stock, 0),
      buying_mode: "buy_it_now",
      condition: "new",
      listing_type_id: "gold_special",
      description: {
        plain_text: product.description
      },
      attributes: [
        {
          id: "BRAND",
          value_name: product.brand
        }
        // Agregar más atributos según necesidad
      ],
      variations: variants.map(variant => ({
        attribute_combinations: [
          {
            id: "SIZE",
            value_name: variant.size
          },
          {
            id: "COLOR",
            value_name: variant.color
          }
        ],
        price: variant.price,
        available_quantity: variant.stock,
        seller_custom_field: variant.sku
      }))
    };
  }

  /**
   * Actualiza las variaciones de un producto
   */
  async updateProductVariations(mlProductId, variants) {
    try {
      await this.initialize();
      const client = this.getClient();

      const variations = variants.map(variant => ({
        attribute_combinations: [
          {
            id: "SIZE",
            value_name: variant.size
          },
          {
            id: "COLOR",
            value_name: variant.color
          }
        ],
        price: variant.price,
        available_quantity: variant.stock,
        seller_custom_field: variant.sku
      }));

      await client.put(`/items/${mlProductId}/variations`, { variations });

      return true;
    } catch (error) {
      console.error('Error al actualizar variaciones:', error);
      throw error;
    }
  }

  /**
   * Actualiza el stock de un producto
   */
  async updateStock(productId, variantId, newStock) {
    try {
      await this.initialize();
      const client = this.getClient();

      const product = await Product.findOne({
        where: { id: productId },
        include: [{
          model: ProductVariant,
          as: 'variants',
          where: { id: variantId }
        }]
      });

      if (!product || !product.mercadoLibreId) {
        throw new Error('Producto no encontrado o no sincronizado con Mercado Libre');
      }

      const variant = product.variants[0];
      
      // Si el producto tiene variaciones
      if (variant.mercadoLibreVariationId) {
        await client.put(`/items/${product.mercadoLibreId}/variations/${variant.mercadoLibreVariationId}`, {
          available_quantity: newStock
        });
      } else {
        // Si el producto no tiene variaciones
        await client.put(`/items/${product.mercadoLibreId}`, {
          available_quantity: newStock
        });
      }

      return {
        success: true,
        message: 'Stock actualizado correctamente en Mercado Libre'
      };
    } catch (error) {
      console.error('Error al actualizar stock en Mercado Libre:', error);
      throw error;
    }
  }

  /**
   * Sincroniza pedidos desde Mercado Libre
   */
  async syncOrders(fromDate = null) {
    try {
      await this.initialize();
      const client = this.getClient();

      let params = {
        seller: config.sellerId,
        order_status: 'paid'
      };

      if (fromDate) {
        params.date_from = fromDate.toISOString().split('T')[0];
      }

      const response = await client.get('/orders/search', { params });
      const orders = response.data.results;

      // Procesar cada pedido
      for (const order of orders) {
        await this.processOrder(order);
      }

      return {
        success: true,
        message: `${orders.length} pedidos sincronizados correctamente`
      };
    } catch (error) {
      console.error('Error al sincronizar pedidos de Mercado Libre:', error);
      throw error;
    }
  }

  /**
   * Procesa un pedido individual
   */
  async processOrder(order) {
    try {
      // Aquí implementar la lógica para procesar el pedido
      // Por ejemplo:
      // - Crear factura
      // - Actualizar stock
      // - Registrar en cuenta corriente si aplica
      console.log(`Procesando pedido ${order.id} de Mercado Libre`);

      // Implementar lógica específica según necesidades

    } catch (error) {
      console.error(`Error al procesar pedido ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene las preguntas sin responder
   */
  async getUnansweredQuestions() {
    try {
      await this.initialize();
      const client = this.getClient();

      const response = await client.get('/questions/search', {
        params: {
          seller: config.sellerId,
          status: 'UNANSWERED'
        }
      });

      return response.data.questions;
    } catch (error) {
      console.error('Error al obtener preguntas:', error);
      throw error;
    }
  }

  /**
   * Responde una pregunta
   */
  async answerQuestion(questionId, answer) {
    try {
      await this.initialize();
      const client = this.getClient();

      await client.post('/answers', {
        question_id: questionId,
        text: answer
      });

      return {
        success: true,
        message: 'Pregunta respondida correctamente'
      };
    } catch (error) {
      console.error('Error al responder pregunta:', error);
      throw error;
    }
  }
}

module.exports = new MercadoLibreService();

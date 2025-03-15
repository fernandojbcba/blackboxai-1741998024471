const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/config')[process.env.NODE_ENV || 'development'].afip;

class AfipService {
  constructor() {
    this.token = null;
    this.sign = null;
    this.expirationTime = null;
    this.wsaaWsdl = config.environment === 'production'
      ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl'
      : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl';
    this.wsfeWsdl = config.environment === 'production'
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL';
  }

  async initialize() {
    try {
      // Verificar si ya tenemos un token válido
      if (this.token && this.expirationTime && new Date() < this.expirationTime) {
        return true;
      }

      // Obtener nuevo token y sign
      const loginTicket = await this.getLoginTicket();
      if (!loginTicket) {
        throw new Error('No se pudo obtener el ticket de login de AFIP');
      }

      this.token = loginTicket.token;
      this.sign = loginTicket.sign;
      this.expirationTime = loginTicket.expirationTime;

      return true;
    } catch (error) {
      console.error('Error al inicializar el servicio de AFIP:', error);
      throw error;
    }
  }

  async getLoginTicket() {
    try {
      // Leer certificado y clave privada
      const cert = fs.readFileSync(path.resolve(config.certPath));
      const privateKey = fs.readFileSync(path.resolve(config.keyPath));

      // Generar TRA (Ticket de Requerimiento de Acceso)
      const tra = this.generateTRA();

      // Firmar el TRA
      const cms = this.signTRA(tra, cert, privateKey);

      // Enviar solicitud a AFIP
      const response = await axios.post(this.wsaaWsdl, {
        loginCms: {
          in0: cms
        }
      });

      // Procesar respuesta
      return this.parseLoginResponse(response.data);
    } catch (error) {
      console.error('Error al obtener ticket de login:', error);
      throw error;
    }
  }

  generateTRA() {
    // Implementar generación de XML para TRA
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas

    return `<?xml version="1.0" encoding="UTF-8"?>
      <loginTicketRequest version="1.0">
        <header>
          <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
          <generationTime>${now.toISOString()}</generationTime>
          <expirationTime>${expires.toISOString()}</expirationTime>
        </header>
        <service>wsfe</service>
      </loginTicketRequest>`;
  }

  signTRA(tra, cert, privateKey) {
    // Implementar firma del TRA usando certificado y clave privada
    // Esta es una implementación simplificada, se debe usar una biblioteca de firma digital
    return 'signed_tra_content';
  }

  parseLoginResponse(response) {
    // Implementar parsing de la respuesta de login
    // Retornar objeto con token, sign y expirationTime
    return {
      token: 'sample_token',
      sign: 'sample_sign',
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  async getLastVoucher(pointOfSale, voucherType) {
    try {
      await this.initialize();

      const response = await axios.post(this.wsfeWsdl, {
        FECompUltimoAutorizado: {
          Auth: {
            Token: this.token,
            Sign: this.sign,
            Cuit: config.cuit
          },
          PtoVta: pointOfSale,
          CbteTipo: voucherType
        }
      });

      return response.data.FECompUltimoAutorizadoResult.CbteNro;
    } catch (error) {
      console.error('Error al obtener último comprobante:', error);
      throw error;
    }
  }

  async createVoucher(invoiceData) {
    try {
      await this.initialize();

      const lastVoucher = await this.getLastVoucher(
        invoiceData.pointOfSale,
        invoiceData.voucherType
      );

      const voucherNumber = lastVoucher + 1;

      const request = this.formatVoucherRequest(invoiceData, voucherNumber);

      const response = await axios.post(this.wsfeWsdl, {
        FECAESolicitar: {
          Auth: {
            Token: this.token,
            Sign: this.sign,
            Cuit: config.cuit
          },
          FeCAEReq: request
        }
      });

      return this.parseVoucherResponse(response.data);
    } catch (error) {
      console.error('Error al crear comprobante:', error);
      throw error;
    }
  }

  formatVoucherRequest(invoiceData, voucherNumber) {
    // Implementar formateo de datos para solicitud de CAE
    return {
      FeCabReq: {
        CantReg: 1,
        PtoVta: invoiceData.pointOfSale,
        CbteTipo: invoiceData.voucherType
      },
      FeDetReq: {
        FECAEDetRequest: {
          Concepto: 1, // Productos
          DocTipo: invoiceData.documentType,
          DocNro: invoiceData.documentNumber,
          CbteDesde: voucherNumber,
          CbteHasta: voucherNumber,
          CbteFch: this.formatDate(new Date()),
          ImpTotal: invoiceData.total,
          ImpTotConc: 0,
          ImpNeto: invoiceData.subtotal,
          ImpOpEx: 0,
          ImpIVA: invoiceData.tax,
          MonId: 'PES',
          MonCotiz: 1
        }
      }
    };
  }

  parseVoucherResponse(response) {
    // Implementar parsing de respuesta de AFIP
    // Retornar objeto con CAE y fecha de vencimiento
    return {
      success: true,
      cae: response.FECAESolicitarResult.FeDetResp[0].CAE,
      caeExpirationDate: response.FECAESolicitarResult.FeDetResp[0].CAEFchVto,
      voucherNumber: response.FECAESolicitarResult.FeDetResp[0].CbteDesde
    };
  }

  formatDate(date) {
    // Formato AAAAMMDD requerido por AFIP
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
}

module.exports = new AfipService();

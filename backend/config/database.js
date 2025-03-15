const { Sequelize } = require('sequelize');
const config = require('./config')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true, // Habilita createdAt y updatedAt por defecto
      underscored: true, // Usa snake_case en lugar de camelCase para nombres de columnas
    }
  }
);

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    return true;
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error);
    return false;
  }
};

// Función para sincronizar los modelos con la base de datos
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Base de datos sincronizada correctamente.');
    return true;
  } catch (error) {
    console.error('Error al sincronizar la base de datos:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};

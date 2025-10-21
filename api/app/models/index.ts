import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const db: any = {};

let sequelize: Sequelize;

// Heroku automatically provides DATABASE_URL
if (process.env.DATABASE_URL) {
  // Production: Use Heroku's DATABASE_URL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Heroku uses self-signed certificates
      }
    },
    logging: false // Disable SQL logging in production
  });
} else {
  // Development: Use local config or environment variables
  const dbName = process.env.DB_NAME || 'herolog_dev';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');

  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: console.log // Enable logging in development
  });
}

// Load all models
fs
  .readdirSync(__dirname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    (file.slice(-3) === '.js' || file.slice(-3) === '.ts') &&
    !file.endsWith('.d.ts')
  )
  .forEach((file) => {
    const modelFactory = require(path.join(__dirname, file));
    const model = modelFactory.default || modelFactory;
    const initializedModel = model(sequelize, DataTypes);
    db[initializedModel.name] = initializedModel;
  });

// Set up associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export = db;
import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';

const basename = path.basename(__filename);

interface DbInterface {
  [key: string]: any;
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
}

const db: DbInterface = {} as DbInterface;
let sequelize: Sequelize;

console.log('🔧 Initializing Sequelize...');

// Heroku automatically provides DATABASE_URL
if (process.env.DATABASE_URL) {
  console.log('📦 Using DATABASE_URL for production');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  console.log('📦 Using local database configuration');
  const dbName = process.env.DB_NAME || 'herolog_dev';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');
  
  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: console.log
  });
}

console.log('📂 Loading models from:', __dirname);
console.log('📄 Basename:', basename);

// Load all models
const files = fs.readdirSync(__dirname);
console.log('📋 Files in models directory:', files);

files
  .filter(file => {
    const isNotIndex = file !== basename;
    const isNotDeclaration = !file.endsWith('.d.ts');
    const isJsOrTs = file.slice(-3) === '.js' || file.slice(-3) === '.ts';
    const isNotHidden = file.indexOf('.') !== 0;
    
    return isNotHidden && isNotIndex && isNotDeclaration && isJsOrTs;
  })
  .forEach((file) => {
    try {
      console.log(`🔄 Loading model from file: ${file}`); // ✅ Fixed
      const modelPath = path.join(__dirname, file);
      const modelModule = require(modelPath);
      const modelFactory = modelModule.default || modelModule;
      
      if (typeof modelFactory !== 'function') {
        console.error(`❌ ${file} does not export a function`); // ✅ Fixed
        return;
      }
      
      const initializedModel = modelFactory(sequelize, DataTypes);
      db[initializedModel.name] = initializedModel;
      console.log(`✅ Loaded model: ${initializedModel.name}`); // ✅ Fixed
    } catch (error) {
      console.error(`❌ Error loading model from ${file}:`, error); // ✅ Fixed
    }
  });

// Set up associations
console.log('🔗 Setting up associations...');
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    console.log(`🔗 Setting up associations for: ${modelName}`); // ✅ Fixed
    db[modelName].associate(db);
  }
});

const modelNames = Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize');
console.log(`📦 Total models loaded: ${modelNames.length}`, modelNames); // ✅ Fixed

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
import { Sequelize, DataTypes } from 'sequelize';
import createUsersModel, { UsersModel } from './users';
import createCollectionPublishersModel, { CollectionPublishersModel } from './collectionpublishers';
import createComicBookTitlesModel, { ComicBookTitlesModel } from './comicbooktitles';
import createComicBooksModel, { ComicBooksModel } from './comicbooks';
import createSaleListsModel, { SaleListsModel } from './salelists';
import createWishListsModel, { WishListsModel } from './wishlists';
import createMessagingsModel, { MessagingsModel } from './messagings';
import createCollectionAnalysesModel, { CollectionAnalysesModel } from './collectionanalyses';

/** Every model, by name; passed to each model's associate() */
export interface Models {
  Users: UsersModel;
  CollectionPublishers: CollectionPublishersModel;
  ComicBookTitles: ComicBookTitlesModel;
  ComicBooks: ComicBooksModel;
  SaleLists: SaleListsModel;
  WishLists: WishListsModel;
  Messagings: MessagingsModel;
  CollectionAnalyses: CollectionAnalysesModel;
}

export interface Db extends Models {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
}

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

// Each model is listed here so its exact type is known everywhere it's used.
// To add a model, import its factory above and add it to Models and below.
const models: Models = {
  Users: createUsersModel(sequelize, DataTypes),
  CollectionPublishers: createCollectionPublishersModel(sequelize, DataTypes),
  ComicBookTitles: createComicBookTitlesModel(sequelize, DataTypes),
  ComicBooks: createComicBooksModel(sequelize, DataTypes),
  SaleLists: createSaleListsModel(sequelize, DataTypes),
  WishLists: createWishListsModel(sequelize, DataTypes),
  Messagings: createMessagingsModel(sequelize, DataTypes),
  CollectionAnalyses: createCollectionAnalysesModel(sequelize, DataTypes),
};

// Set up associations
models.Users.associate(models);
models.CollectionPublishers.associate(models);
models.ComicBookTitles.associate(models);
models.ComicBooks.associate(models);
models.SaleLists.associate(models);
models.WishLists.associate(models);
models.Messagings.associate(models);

const db: Db = { ...models, sequelize, Sequelize };

console.log(`📦 Total models loaded: ${Object.keys(models).length}`, Object.keys(models));

export default db;
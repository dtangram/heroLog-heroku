import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

interface Models {
  Users?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

interface SaleListsModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

const createSaleListsModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): SaleListsModel => {
  const SaleLists = sequelize.define('SaleLists', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
      validate: {
        isUUID: { args: 4, msg: 'ID not valid, please try again' },
      },
    },
    comicBookTitle: {
      type: dataTypes.STRING,
      field: 'comic_book_title',  // ✅ Map to actual DB column
      validate: {
        len: { args: [1, 500], msg: 'Comic book title is required' },
      },
    },
    comicIssue: {
      type: dataTypes.INTEGER,
      field: 'comic_issue',  // ✅ Map to actual DB column
    },
    comicBookVolume: {
      type: dataTypes.INTEGER,
      field: 'comic_book_volume',  // ✅ Map to actual DB column
      validate: {
        min: { args: [1], msg: 'Comic book volume must be 1 or greater' },
      },
    },
    comicBookYear: {
      type: dataTypes.INTEGER,
      field: 'comic_book_year',  // ✅ Map to actual DB column
      validate: {
        min: { args: [1900], msg: 'Year must be 1900 or later' },
        max: { args: [new Date().getFullYear() + 1], msg: 'Year cannot be in the future' },
      },
    },
    comicBookPublisher: {
      type: dataTypes.STRING,
      field: 'comic_book_publisher',  // ✅ Map to actual DB column
      validate: {
        len: { args: [2, 500], msg: 'Comic book publisher is required' },
      },
    },
    comicBookCover: {
      type: dataTypes.STRING,
      field: 'comic_book_cover',  // ✅ Map to actual DB column
    },
    type: {
      type: dataTypes.ENUM('regular', 'variant'),
      validate: {
        isIn: {
          args: [['regular', 'variant']],
          msg: 'Comic Book must be regular or variant',
        },
      },
    },
    saleUsersId: {
      type: dataTypes.UUID,
      field: 'sale_users_id',  // ✅ Map to actual DB column
      allowNull: true,
      validate: {
        isUUID: { args: 4, msg: 'Invalid user ID' },
      },
    },
  }, {
    underscored: true,  // ✅ Auto-convert camelCase to snake_case for timestamps
    tableName: 'SaleLists',  // ✅ Explicit table name
  }) as SaleListsModel;
  
  SaleLists.associate = (models: Models) => {
    if (models.Users) {
      SaleLists.belongsTo(models.Users, { 
        foreignKey: 'saleUsersId' 
      });
    }
  };
  
  return SaleLists;
};

export = createSaleListsModel;
import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

// Type for the models object passed to associate
interface Models {
  Users?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

// Extended model type that includes the associate method
interface WishListsModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

// The actual model factory function - direct TypeScript conversion
const createWishListsModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): WishListsModel => {
  const WishLists = sequelize.define('WishLists', {
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
      validate: {
        len: { args: [1, 500], msg: 'Comic book title is required' },
      },
    },
    comicIssue: {
      type: dataTypes.INTEGER,
    },
    comicBookVolume: {
      type: dataTypes.INTEGER,
      validate: {
        min: { args: [1], msg: 'Comic book volume must be 1 or greater' },
      },
    },
    comicBookYear: {
      type: dataTypes.INTEGER,
      validate: {
        min: { args: [1900], msg: 'Year must be 1900 or later' },
        max: { args: [new Date().getFullYear() + 1], msg: 'Year cannot be in the future' },
      },
    },
    comicBookPublisher: {
      type: dataTypes.STRING,
      validate: {
        len: { args: [2, 500], msg: 'Comic book publisher is required' },
      },
    },
    comicBookCover: {
      type: dataTypes.STRING,
    },
    type: {
      type: dataTypes.ENUM('regular', 'variant'),
      allowNull: false,
      defaultValue: 'regular',
      validate: {
        isIn: {
          args: [['regular', 'variant']],
          msg: 'Comic Book must be regular or variant',
        },
      },
    },
    wishUsersId: {
      type: dataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: { args: 4, msg: 'Invalid user ID' },
      },
    },
  }, {}) as WishListsModel;
  
  WishLists.associate = (models: Models) => {
    if (models.Users) {
      WishLists.belongsTo(models.Users, { 
        foreignKey: 'wishUsersId' 
      });
    }
  };
  
  return WishLists;
};

export = createWishListsModel;
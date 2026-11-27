import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { Models } from '.';

export type WishListType = 'regular' | 'variant';

export interface WishListAttributes {
  id: string;
  comicBookTitle: string | null;
  comicIssue: number | null;
  comicBookVolume: number | null;
  comicBookYear: number | null;
  comicBookPublisher: string | null;
  comicBookCover: string | null;
  type: WishListType;
  wishUsersId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WishListCreationAttributes = Optional<
  WishListAttributes,
  | 'id' | 'comicBookTitle' | 'comicIssue' | 'comicBookVolume' | 'comicBookYear' | 'comicBookPublisher'
  | 'comicBookCover' | 'type' | 'wishUsersId' | 'createdAt' | 'updatedAt'
>;

/** A saved row as the API sends it */
export type WishListJson = WishListAttributes;

export interface WishListInstance extends Model<WishListAttributes, WishListCreationAttributes>, WishListAttributes {}

export interface WishListsModel extends ModelStatic<WishListInstance> {
  associate: (models: Models) => void;
}

// The actual model factory function - direct TypeScript conversion
const createWishListsModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): WishListsModel => {
  const WishLists = sequelize.define<WishListInstance>('WishLists', {
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
    // Sequelize sets these itself; they're listed so their types are known
    createdAt: {
      type: dataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: dataTypes.DATE,
      allowNull: false,
    },
  }, {});
  
  const associate = (models: Models): void => {
    if (models.Users) {
      WishLists.belongsTo(models.Users, { 
        foreignKey: 'wishUsersId' 
      });
    }
  };
  
  return Object.assign(WishLists, { associate });
};

export default createWishListsModel;
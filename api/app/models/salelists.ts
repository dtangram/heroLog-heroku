import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { Models } from '.';

export type SaleListType = 'regular' | 'variant';

export interface SaleListAttributes {
  id: string;
  comicBookTitle: string | null;
  comicIssue: number | null;
  comicBookVolume: number | null;
  comicBookYear: number | null;
  comicBookPublisher: string | null;
  comicBookCover: string | null;
  type: SaleListType | null;
  /** Postgres DECIMAL comes back as text, e.g. "12.50"; it's saved from a number */
  price: string | number | null;
  comicCondition: string | null;
  saleUsersId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SaleListCreationAttributes = Optional<
  SaleListAttributes,
  | 'id' | 'comicBookTitle' | 'comicIssue' | 'comicBookVolume' | 'comicBookYear' | 'comicBookPublisher'
  | 'comicBookCover' | 'type' | 'price' | 'comicCondition' | 'saleUsersId' | 'createdAt' | 'updatedAt'
>;

/** A saved row as the API sends it */
export type SaleListJson = SaleListAttributes;

export interface SaleListInstance extends Model<SaleListAttributes, SaleListCreationAttributes>, SaleListAttributes {}

export interface SaleListsModel extends ModelStatic<SaleListInstance> {
  associate: (models: Models) => void;
}

const createSaleListsModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): SaleListsModel => {
  const SaleLists = sequelize.define<SaleListInstance>('SaleLists', {
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
      validate: {
        isIn: {
          args: [['regular', 'variant']],
          msg: 'Comic Book must be regular or variant',
        },
      },
    },
    // Asking price in dollars, e.g. 12.50 (null on listings made before prices existed)
    price: {
      type: dataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: { args: [0.01], msg: 'Price must be at least $0.01' },
        max: { args: [99999.99], msg: 'Price must be $99,999.99 or less' },
      },
    },
    // Standard comic grade name, e.g. "Near Mint"
    comicCondition: {
      type: dataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: {
          args: [['Mint', 'Near Mint', 'Very Fine', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor']],
          msg: 'Condition must be one of the standard comic grades',
        },
      },
    },
    saleUsersId: {
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
  }, {
    timestamps: true,  // ✅ Keep timestamps
    tableName: 'SaleLists',  // ✅ Explicit table name
  });
  
  const associate = (models: Models): void => {
    if (models.Users) {
      SaleLists.belongsTo(models.Users, { 
        foreignKey: 'saleUsersId' 
      });
    }
  };
  
  return Object.assign(SaleLists, { associate });
};

export default createSaleListsModel;
import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { Models } from '.';

export interface CollectionPublisherAttributes {
  id: string;
  publisherName: string;
  collectpubUsersId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CollectionPublisherCreationAttributes = Optional<CollectionPublisherAttributes, 'id' | 'collectpubUsersId' | 'createdAt' | 'updatedAt'>;

/** A saved row as the API sends it */
export type CollectionPublisherJson = CollectionPublisherAttributes;

export interface CollectionPublisherInstance extends Model<CollectionPublisherAttributes, CollectionPublisherCreationAttributes>, CollectionPublisherAttributes {}

export interface CollectionPublishersModel extends ModelStatic<CollectionPublisherInstance> {
  associate: (models: Models) => void;
}

// The actual model factory function
const createCollectionPublishersModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): CollectionPublishersModel => {
  const CollectionPublishers = sequelize.define<CollectionPublisherInstance>('CollectionPublishers', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
    },
    publisherName: {
      type: dataTypes.STRING(500),
      allowNull: false,
      validate: {
        len: { args: [2, 500], msg: 'Publisher name is required' },
      },
    },
    collectpubUsersId: {
      type: dataTypes.UUID,
      allowNull: true,
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
    tableName: 'CollectionPublishers',
    timestamps: true,
    underscored: false,  // CRITICAL: Set to false to match migration columns
    freezeTableName: true,  // CRITICAL: Prevent table name pluralization
  });
 
  const associate = (models: Models): void => {
    if (models.Users) {
      CollectionPublishers.belongsTo(models.Users, {
        foreignKey: 'collectpubUsersId',
        onDelete: 'SET NULL'
      });
    }
    if (models.ComicBookTitles) {
      CollectionPublishers.hasMany(models.ComicBookTitles, {
        foreignKey: 'collectpubId',
        onDelete: 'CASCADE'
      });
    }
  };
 
  return Object.assign(CollectionPublishers, { associate });
};

export default createCollectionPublishersModel;
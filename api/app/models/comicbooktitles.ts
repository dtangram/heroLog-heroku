import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { Models } from '.';

export interface ComicBookTitleAttributes {
  id: string;
  cbTitle: string;
  collectpubId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ComicBookTitleCreationAttributes = Optional<ComicBookTitleAttributes, 'id' | 'collectpubId' | 'createdAt' | 'updatedAt'>;

/** A saved row as the API sends it */
export type ComicBookTitleJson = ComicBookTitleAttributes;

export interface ComicBookTitleInstance extends Model<ComicBookTitleAttributes, ComicBookTitleCreationAttributes>, ComicBookTitleAttributes {}

export interface ComicBookTitlesModel extends ModelStatic<ComicBookTitleInstance> {
  associate: (models: Models) => void;
}

// The actual model factory function
const createComicBookTitlesModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): ComicBookTitlesModel => {
  const ComicBookTitles = sequelize.define<ComicBookTitleInstance>('ComicBookTitles', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
    },
    cbTitle: {
      type: dataTypes.STRING(500),
      allowNull: false,
      validate: {
        len: { args: [1, 500], msg: 'Comic Book title is required' },
      },
    },
    collectpubId: {
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
    tableName: 'ComicBookTitles',
    timestamps: true,
    underscored: false,  // CRITICAL: Set to false to match migration columns
    freezeTableName: true,  // CRITICAL: Prevent table name pluralization
  });
 
  const associate = (models: Models): void => {
    if (models.CollectionPublishers) {
      ComicBookTitles.belongsTo(models.CollectionPublishers, {
        foreignKey: 'collectpubId',
        onDelete: 'SET NULL'
      });
    }
    if (models.ComicBooks) {
      ComicBookTitles.hasMany(models.ComicBooks, {
        foreignKey: 'comicbooktitlerelId',
        onDelete: 'CASCADE'
      });
    }
  };
 
  return Object.assign(ComicBookTitles, { associate });
};

export default createComicBookTitlesModel;
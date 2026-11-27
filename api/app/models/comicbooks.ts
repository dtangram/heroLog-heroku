import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { Models } from '.';

export type ComicBookType = 'regular' | 'variant';

export interface ComicBookAttributes {
  id: string;
  title: string;
  comicIssue: string | null;
  author: string | null;
  penciler: string | null;
  coverartist: string | null;
  inker: string | null;
  volume: string | null;
  year: number | null;
  comicBookCover: string | null;
  type: ComicBookType;
  comicbooktitlerelId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ComicBookCreationAttributes = Optional<
  ComicBookAttributes,
  'id' | 'comicIssue' | 'author' | 'penciler' | 'coverartist' | 'inker' | 'volume' | 'year' | 'comicBookCover' | 'type' | 'createdAt' | 'updatedAt'
>;

/** A saved row as the API sends it */
export type ComicBookJson = ComicBookAttributes;

export interface ComicBookInstance extends Model<ComicBookAttributes, ComicBookCreationAttributes>, ComicBookAttributes {}

export interface ComicBooksModel extends ModelStatic<ComicBookInstance> {
  associate: (models: Models) => void;
}

// The actual model factory function
const createComicBooksModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): ComicBooksModel => {
  const ComicBooks = sequelize.define<ComicBookInstance>('ComicBooks', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
    },
    title: {
      type: dataTypes.STRING(500),
      allowNull: false,
      validate: {
        len: { args: [1, 500], msg: 'Comic Book title is required' },
      },
    },
    comicIssue: {
      type: dataTypes.STRING(50),
      allowNull: true,
    },
    author: {
      type: dataTypes.STRING(500),
      allowNull: true,
    },
    penciler: {
      type: dataTypes.STRING(500),
      allowNull: true,
    },
    coverartist: {
      type: dataTypes.STRING(500),
      allowNull: true,
    },
    inker: {
      type: dataTypes.STRING(500),
      allowNull: true,
    },
    volume: {
      type: dataTypes.STRING(50),
      allowNull: true,
    },
    year: {
      type: dataTypes.INTEGER,
      allowNull: true,
    },
    comicBookCover: {
      type: dataTypes.TEXT,
      allowNull: true,
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
    comicbooktitlerelId: {
      type: dataTypes.UUID,
      allowNull: false,
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
    tableName: 'ComicBooks',
    timestamps: true,
    underscored: false,  // CRITICAL: Set to false to match migration columns
    freezeTableName: true,  // CRITICAL: Prevent table name pluralization
  });
 
  const associate = (models: Models): void => {
    if (models.ComicBookTitles) {
      ComicBooks.belongsTo(models.ComicBookTitles, {
        foreignKey: 'comicbooktitlerelId',
        onDelete: 'CASCADE'
      });
    }
  };
 
  return Object.assign(ComicBooks, { associate });
};

export default createComicBooksModel;
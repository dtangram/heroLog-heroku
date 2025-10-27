import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

// Type for the models object passed to associate
interface Models {
  ComicBookTitles?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

// Extended model type that includes the associate method
interface ComicBooksModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

// The actual model factory function
const createComicBooksModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): ComicBooksModel => {
  const ComicBooks = sequelize.define('ComicBooks', {
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
  }, {
    tableName: 'ComicBooks',
    timestamps: true,
    underscored: false,  // CRITICAL: Set to false to match migration columns
    freezeTableName: true,  // CRITICAL: Prevent table name pluralization
  }) as ComicBooksModel;
 
  ComicBooks.associate = (models: Models) => {
    if (models.ComicBookTitles) {
      ComicBooks.belongsTo(models.ComicBookTitles, {
        foreignKey: 'comicbooktitlerelId',
        onDelete: 'CASCADE'
      });
    }
  };
 
  return ComicBooks;
};

// CHANGED: Use export default instead of export =
export default createComicBooksModel;
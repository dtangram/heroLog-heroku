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

// The actual model factory function - direct TypeScript conversion
const createComicBooksModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): ComicBooksModel => {
  const ComicBooks = sequelize.define('ComicBooks', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
      validate: {
        isUUID: { args: 4, msg: 'ID not valid, please try again' },
      },
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
      validate: {
        len: { args: [1, 500], msg: 'Comic Book author must be 1-500 characters' },
      },
    },
    penciler: {
      type: dataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: { args: [1, 500], msg: 'Comic Book penciler must be 1-500 characters' },
      },
    },
    coverartist: {
      type: dataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: { args: [1, 500], msg: 'Comic Book cover artist must be 1-500 characters' },
      },
    },
    inker: {
      type: dataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: { args: [1, 500], msg: 'Comic Book inker must be 1-500 characters' },
      },
    },
    volume: {
      type: dataTypes.STRING(50),
      allowNull: true,
    },
    year: {
      type: dataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: { args: [1900], msg: 'Year must be 1900 or later' },
        max: { args: [new Date().getFullYear() + 1], msg: 'Year cannot be in the future' },
      },
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
      validate: {
        isUUID: { args: 4, msg: 'Invalid comic book title ID' },
      },
    },
  }, {
    timestamps: true,
    underscored: true,
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

export = createComicBooksModel;
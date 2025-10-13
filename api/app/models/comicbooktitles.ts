import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

interface Models {
  CollectionPublishers?: ModelStatic<Model>;
  ComicBooks?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

interface ComicBookTitlesModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

const createComicBookTitlesModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): ComicBookTitlesModel => {
  const ComicBookTitles = sequelize.define('ComicBookTitles', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
      validate: {
        isUUID: { args: 4, msg: 'ID not valid, please try again' },
      },
    },
    cbTitle: {
      type: dataTypes.STRING,
      validate: {
        len: { args: [1, 500], msg: 'Comic Book title is required' },
      },
    },
    collectpubId: {
      type: dataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: { args: 4, msg: 'Invalid collection publisher ID' },
      },
    },
  }, {}) as ComicBookTitlesModel;
  
  ComicBookTitles.associate = (models: Models) => {
    if (models.CollectionPublishers) {
      ComicBookTitles.belongsTo(models.CollectionPublishers, {
        foreignKey: 'collectpubId'
      });
    }
    if (models.ComicBooks) {
      ComicBookTitles.hasMany(models.ComicBooks, {
        foreignKey: 'comicbooktitlerelId'
      });
    }
  };
  
  return ComicBookTitles;
};

export = createComicBookTitlesModel;
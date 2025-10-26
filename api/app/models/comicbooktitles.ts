import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

// Type for the models object passed to associate
interface Models {
  CollectionPublishers?: ModelStatic<Model>;
  ComicBooks?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

// Extended model type that includes the associate method
interface ComicBookTitlesModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

// The actual model factory function
const createComicBookTitlesModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): ComicBookTitlesModel => {
  const ComicBookTitles = sequelize.define('ComicBookTitles', {
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
  }, {
    tableName: 'ComicBookTitles',
    timestamps: true,
    underscored: false,  // CRITICAL: Set to false to match migration columns
    freezeTableName: true,  // CRITICAL: Prevent table name pluralization
  }) as ComicBookTitlesModel;
 
  ComicBookTitles.associate = (models: Models) => {
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
 
  return ComicBookTitles;
};

// CHANGED: Use export default instead of export =
export default createComicBookTitlesModel;
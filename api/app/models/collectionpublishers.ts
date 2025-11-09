import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

// Type for the models object passed to associate
interface Models {
  Users?: ModelStatic<Model>;
  ComicBookTitles?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

// Extended model type that includes the associate method
interface CollectionPublishersModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

// The actual model factory function
const createCollectionPublishersModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): CollectionPublishersModel => {
  const CollectionPublishers = sequelize.define('CollectionPublishers', {
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
  }, {
    tableName: 'CollectionPublishers',
    timestamps: true,
    underscored: false,  // CRITICAL: Set to false to match migration columns
    freezeTableName: true,  // CRITICAL: Prevent table name pluralization
  }) as CollectionPublishersModel;
 
  CollectionPublishers.associate = (models: Models) => {
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
 
  return CollectionPublishers;
};

// CHANGED: Use export default instead of export =
export default createCollectionPublishersModel;
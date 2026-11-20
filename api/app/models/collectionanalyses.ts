import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

// Type for the models object passed to associate
interface Models {
  Users?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

interface CollectionAnalysesModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

/**
 * A collector's saved AI analysis for Collection Intel (one per user).
 * See services/analysisCache.ts.
 */
const createCollectionAnalysesModel = (
  sequelize: Sequelize,
  dataTypes: typeof DataTypes
): CollectionAnalysesModel => {
  const CollectionAnalyses = sequelize.define('CollectionAnalyses', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
    },
    analysisUsersId: {
      type: dataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    factsHash: {
      type: dataTypes.STRING(64),
      allowNull: false,
    },
    analysis: {
      type: dataTypes.JSONB,
      allowNull: false,
    },
  }, {}) as CollectionAnalysesModel;

  CollectionAnalyses.associate = (models: Models) => {
    if (models.Users) {
      CollectionAnalyses.belongsTo(models.Users, {
        foreignKey: 'analysisUsersId',
        onDelete: 'CASCADE',
      });
    }
  };

  return CollectionAnalyses;
};

export = createCollectionAnalysesModel;
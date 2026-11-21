import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

type CollectionAnalysesModel = ModelStatic<Model>;

/**
 * A collector's saved AI analysis for Collection Intel (one per user).
 * See services/analysisCache.ts.
 *
 * analysisUsersId isn't linked to Users: guests use Intel with an anonymous
 * ID that has no account (like publishers' collectpubUsersId). Deleting an
 * account removes its analysis in controllers/user.ts.
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

  return CollectionAnalyses;
};

export = createCollectionAnalysesModel;
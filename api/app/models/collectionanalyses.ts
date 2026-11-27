import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { CollectionAnalysis } from '../services/collectionAnalysis';

export interface CollectionAnalysisAttributes {
  id: string;
  analysisUsersId: string;
  factsHash: string;
  analysis: CollectionAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

export type CollectionAnalysisCreationAttributes = Optional<CollectionAnalysisAttributes, 'id' | 'createdAt' | 'updatedAt'>;

/** A saved row as the API sends it */
export type CollectionAnalysisJson = CollectionAnalysisAttributes;

export interface CollectionAnalysisInstance extends Model<CollectionAnalysisAttributes, CollectionAnalysisCreationAttributes>, CollectionAnalysisAttributes {}

export type CollectionAnalysesModel = ModelStatic<CollectionAnalysisInstance>;

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
  const CollectionAnalyses = sequelize.define<CollectionAnalysisInstance>('CollectionAnalyses', {
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
    // Sequelize sets these itself; they're listed so their types are known
    createdAt: {
      type: dataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: dataTypes.DATE,
      allowNull: false,
    },
  }, {});

  return CollectionAnalyses;
};

export default createCollectionAnalysesModel;
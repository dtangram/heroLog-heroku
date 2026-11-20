'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('CollectionAnalyses', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    analysisUsersId: {
      allowNull: false,
      unique: true,
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },

    // SHA-256 of the facts sent to the AI (64 hex characters)
    factsHash: {
      allowNull: false,
      type: Sequelize.STRING(64),
    },

    // { summary, highlights, recommendations, observation }
    analysis: {
      allowNull: false,
      type: Sequelize.JSONB,
    },

    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },

    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),

  down: queryInterface => queryInterface.dropTable('CollectionAnalyses'),
};
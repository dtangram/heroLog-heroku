'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ComicBookTitles', 'collectpubId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'CollectionPublishers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('ComicBookTitles', 'collectpubId');
  }
};
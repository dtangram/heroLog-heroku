'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('CollectionPublishers', 'collectpubUsersId', {
      type: Sequelize.UUID,
      allowNull: true,  // Allow NULL values
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('CollectionPublishers', 'collectpubUsersId', {
      type: Sequelize.UUID,
      allowNull: false,  // Back to NOT NULL
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
};
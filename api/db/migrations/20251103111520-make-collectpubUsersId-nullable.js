'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the foreign key constraint
    await queryInterface.removeConstraint(
      'CollectionPublishers',
      'CollectionPublishers_collectpubUsersId_fkey'
    );
    
    // Make the column nullable
    await queryInterface.changeColumn('CollectionPublishers', 'collectpubUsersId', {
      type: Sequelize.UUID,
      allowNull: true,  // ✅ Allow null for anonymous users
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: make not nullable and add constraint back
    await queryInterface.changeColumn('CollectionPublishers', 'collectpubUsersId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
    
    await queryInterface.addConstraint('CollectionPublishers', {
      fields: ['collectpubUsersId'],
      type: 'foreign key',
      name: 'CollectionPublishers_collectpubUsersId_fkey',
      references: {
        table: 'Users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
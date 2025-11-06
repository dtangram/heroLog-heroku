'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns exist before trying to add them
    const tableDescription = await queryInterface.describeTable('WishLists');
    
    // Add comicIssue if it doesn't exist
    if (!tableDescription.comicIssue) {
      await queryInterface.addColumn('WishLists', 'comicIssue', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
    // Add comicBookVolume if it doesn't exist
    if (!tableDescription.comicBookVolume) {
      await queryInterface.addColumn('WishLists', 'comicBookVolume', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
    // Add comicBookYear if it doesn't exist
    if (!tableDescription.comicBookYear) {
      await queryInterface.addColumn('WishLists', 'comicBookYear', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
    // Add comicBookCover if it doesn't exist
    if (!tableDescription.comicBookCover) {
      await queryInterface.addColumn('WishLists', 'comicBookCover', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns in reverse order
    await queryInterface.removeColumn('WishLists', 'comicBookCover');
    await queryInterface.removeColumn('WishLists', 'comicBookYear');
    await queryInterface.removeColumn('WishLists', 'comicBookVolume');
    await queryInterface.removeColumn('WishLists', 'comicIssue');
  }
};
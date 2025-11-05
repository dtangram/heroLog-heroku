'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns exist before trying to add them
    const tableDescription = await queryInterface.describeTable('SaleLists');
    
    // Add comicIssue if it doesn't exist
    if (!tableDescription.comicIssue) {
      await queryInterface.addColumn('SaleLists', 'comicIssue', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
    // Add comicBookVolume if it doesn't exist
    if (!tableDescription.comicBookVolume) {
      await queryInterface.addColumn('SaleLists', 'comicBookVolume', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
    // Add comicBookYear if it doesn't exist
    if (!tableDescription.comicBookYear) {
      await queryInterface.addColumn('SaleLists', 'comicBookYear', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
    // Add comicBookCover if it doesn't exist
    if (!tableDescription.comicBookCover) {
      await queryInterface.addColumn('SaleLists', 'comicBookCover', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns in reverse order
    await queryInterface.removeColumn('SaleLists', 'comicBookCover');
    await queryInterface.removeColumn('SaleLists', 'comicBookYear');
    await queryInterface.removeColumn('SaleLists', 'comicBookVolume');
    await queryInterface.removeColumn('SaleLists', 'comicIssue');
  }
};
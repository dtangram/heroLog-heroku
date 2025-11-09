'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ComicBooks', 'comicIssue', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('ComicBooks', 'comicBookCover', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ComicBooks', 'comicIssue');
    await queryInterface.removeColumn('ComicBooks', 'comicBookCover');
  }
};
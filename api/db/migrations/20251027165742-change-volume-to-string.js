'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ComicBooks', 'volume', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ComicBooks', 'volume', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
'use strict';

/**
 * Adds a price and a condition to sale listings, so buyers can see what a
 * comic costs and what shape it's in without messaging the seller first.
 *
 * Both columns allow null: listings made before this change have neither.
 * New listings must include both (the API checks this).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('SaleLists');

    // Dollars and cents, e.g. 12.50
    if (!table.price) {
      await queryInterface.addColumn('SaleLists', 'price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    // A standard comic grade name, e.g. "Near Mint"
    if (!table.comicCondition) {
      await queryInterface.addColumn('SaleLists', 'comicCondition', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('SaleLists', 'comicCondition');
    await queryInterface.removeColumn('SaleLists', 'price');
  },
};
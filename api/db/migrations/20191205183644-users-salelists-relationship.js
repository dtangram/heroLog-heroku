module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn('SaleLists', 'saleUsersId', {
    type: Sequelize.UUID,
    references: {
      model: 'Users',
      key: 'id',
    },
  }),

  down: queryInterface => queryInterface.removeColumn('SaleLists', 'saleUsersId'),
};

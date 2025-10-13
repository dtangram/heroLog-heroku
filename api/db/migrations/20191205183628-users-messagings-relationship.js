module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn('Messagings', 'messageUsersId', {
    type: Sequelize.UUID,
    references: {
      model: 'Users',
      key: 'id',
    },
  }),

  down: queryInterface => queryInterface.removeColumn('Messagings', 'messageUsersId'),
};

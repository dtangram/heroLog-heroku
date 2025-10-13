module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn('WishLists', 'wishUsersId', {
    type: Sequelize.UUID,
    references: {
      model: 'Users',
      key: 'id',
    },
  }),

  down: queryInterface => queryInterface.removeColumn('WishLists', 'wishUsersId'),
};

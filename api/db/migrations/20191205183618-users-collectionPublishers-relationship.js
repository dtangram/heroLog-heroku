module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn('CollectionPublishers', 'collectpubUsersId', {
    type: Sequelize.UUID,
    references: {
      model: 'Users',
      key: 'id',
    },
  }),

  down: queryInterface => queryInterface.removeColumn('CollectionPublishers', 'collectpubUsersId'),
};

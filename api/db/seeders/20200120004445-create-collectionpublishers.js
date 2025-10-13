module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(
    'CollectionPublishers',
    [
      {
        id: '393feae4-c2cd-4db0-8dcb-9f2ff2e1c83e',
        publisherName: 'DC',
        createdAt: Sequelize.literal('NOW()'),
        updatedAt: Sequelize.literal('NOW()'),
      },
    ],
    {},
  ),

  down: queryInterface => queryInterface.bulkDelete('CollectionPublishers', null, {}),
};

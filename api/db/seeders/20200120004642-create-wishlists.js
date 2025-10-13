module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(
    'WishLists',
    [
      {
        id: '893098e0-0546-4395-9e8d-159041026bdb',
        comicBookTitle: 'Uncanny X-Men #141',
        comicBookVolume: '1',
        comicBookYear: '1992',
        comicBookPublisher: 'Marvel',
        type: 'regular',
        createdAt: Sequelize.literal('NOW()'),
        updatedAt: Sequelize.literal('NOW()'),
      },
    ],
    {},
  ),

  down: queryInterface => queryInterface.bulkDelete('WishLists', null, {}),
};

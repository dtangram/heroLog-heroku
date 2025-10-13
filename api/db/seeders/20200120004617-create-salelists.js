module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(
    'SaleLists',
    [
      {
        id: '7c630f4a-3408-4502-b96e-e372676457ec',
        comicBookTitle: 'Superman #75',
        comicBookVolume: '1',
        comicBookYear: '1992',
        comicBookPublisher: 'DC',
        type: 'variant',
        createdAt: Sequelize.literal('NOW()'),
        updatedAt: Sequelize.literal('NOW()'),
      },
    ],
    {},
  ),

  down: queryInterface => queryInterface.bulkDelete('SaleLists', null, {}),
};

module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(
    'ComicBookTitles',
    [
      {
        id: 'a2622195-d5cc-4669-831b-e83f1bd4fca0',
        cbTitle: 'Superman',
        createdAt: Sequelize.literal('NOW()'),
        updatedAt: Sequelize.literal('NOW()'),
      },
    ],
    {},
  ),

  down: queryInterface => queryInterface.bulkDelete('ComicBookTitles', null, {}),
};

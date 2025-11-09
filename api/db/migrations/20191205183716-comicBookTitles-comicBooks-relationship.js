module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn('ComicBooks', 'comicbooktitleId', {
    type: Sequelize.UUID,
    onDelete: 'CASCADE',
    references: {
      model: 'ComicBookTitles',
      key: 'id',
    },
  }),

  down: queryInterface => queryInterface.removeColumn('ComicBooks', 'comicbooktitleId'),
};

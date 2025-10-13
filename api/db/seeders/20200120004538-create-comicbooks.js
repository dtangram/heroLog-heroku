module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(
    'ComicBooks',
    [
      {
        id: 'd1622422-40b7-4c52-b57d-66e5b0456800',
        title: 'Batman',
        author: 'Jim Starlin',
        penciler: 'Jim Starlin',
        coverartist: 'Anthony Tollin',
        inker: 'Mike DeCarlo',
        volume: '1',
        year: '1988',
        type: 'regular',
        createdAt: Sequelize.literal('NOW()'),
        updatedAt: Sequelize.literal('NOW()'),
      },
    ],
    {},
  ),

  down: queryInterface => queryInterface.bulkDelete('ComicBooks', null, {}),
};

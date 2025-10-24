'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM "ComicBooks" WHERE id = 'd1622422-40b7-4c52-b57d-66e5b0456800';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert(
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
            comicbooktitlerelId: 'a2622195-d5cc-4669-831b-e83f1bd4fca0',  // Link to ComicBookTitle if needed
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      console.log('✅ ComicBook "Batman" created');
    } else {
      console.log('ℹ️  ComicBook "Batman" already exists, skipping...');
    }
  },

  down: queryInterface => queryInterface.bulkDelete('ComicBooks', {
    id: 'd1622422-40b7-4c52-b57d-66e5b0456800'
  }, {})
};
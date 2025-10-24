'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM "ComicBookTitles" WHERE id = 'a2622195-d5cc-4669-831b-e83f1bd4fca0';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert(
        'ComicBookTitles',
        [
          {
            id: 'a2622195-d5cc-4669-831b-e83f1bd4fca0',
            cbTitle: 'Superman',
            collectpubId: '393feae4-c2cd-4db0-8dcb-9f2ff2e1c83e',  // DC publisher ID
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      console.log('✅ ComicBookTitle "Superman" created');
    } else {
      console.log('ℹ️  ComicBookTitle "Superman" already exists, skipping...');
    }
  },

  down: queryInterface => queryInterface.bulkDelete('ComicBookTitles', {
    id: 'a2622195-d5cc-4669-831b-e83f1bd4fca0'
  }, {})
};
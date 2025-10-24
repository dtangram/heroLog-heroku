'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM "WishLists" WHERE id = '893098e0-0546-4395-9e8d-159041026bdb';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert(
        'WishLists',
        [
          {
            id: '893098e0-0546-4395-9e8d-159041026bdb',
            comicBookTitle: 'Uncanny X-Men #141',
            comicIssue: '141',  // Add if required
            comicBookVolume: '1',
            comicBookYear: '1992',
            comicBookPublisher: 'Marvel',
            comicBookCover: 'cover.jpg',  // Add if required
            type: 'regular',
            wishUsersId: '712acaa6-7f3e-4dd3-96c9-ce74650133c9',  // Your user ID
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      console.log('✅ WishList "Uncanny X-Men #141" created');
    } else {
      console.log('ℹ️  WishList "Uncanny X-Men #141" already exists, skipping...');
    }
  },

  down: queryInterface => queryInterface.bulkDelete('WishLists', {
    id: '893098e0-0546-4395-9e8d-159041026bdb'
  }, {})
};
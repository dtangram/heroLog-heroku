'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM "SaleLists" WHERE id = '7c630f4a-3408-4502-b96e-e372676457ec';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert(
        'SaleLists',
        [
          {
            id: '7c630f4a-3408-4502-b96e-e372676457ec',
            comicBookTitle: 'Superman #75',
            comicIssue: '75',  // Add if required
            comicBookVolume: '1',
            comicBookYear: '1992',
            comicBookPublisher: 'DC',
            comicBookCover: 'cover.jpg',  // Add if required
            type: 'variant',
            saleUsersId: '712acaa6-7f3e-4dd3-96c9-ce74650133c9',  // Your user ID
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      console.log('✅ SaleList "Superman #75" created');
    } else {
      console.log('ℹ️  SaleList "Superman #75" already exists, skipping...');
    }
  },

  down: queryInterface => queryInterface.bulkDelete('SaleLists', {
    id: '7c630f4a-3408-4502-b96e-e372676457ec'
  }, {})
};
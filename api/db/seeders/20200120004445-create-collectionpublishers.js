'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if this specific publisher already exists
    const existingPublishers = await queryInterface.sequelize.query(
      `SELECT id FROM "CollectionPublishers" WHERE id = '393feae4-c2cd-4db0-8dcb-9f2ff2e1c83e';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existingPublishers.length === 0) {
      // Only insert if publisher doesn't exist
      await queryInterface.bulkInsert(
        'CollectionPublishers',
        [
          {
            id: '393feae4-c2cd-4db0-8dcb-9f2ff2e1c83e',
            publisherName: 'DC',
            collectpubUsersId: '712acaa6-7f3e-4dd3-96c9-ce74650133c9',  // Your user ID
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      
      console.log('✅ CollectionPublisher "DC" created');
    } else {
      console.log('ℹ️  CollectionPublisher "DC" already exists, skipping...');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('CollectionPublishers', {
      id: '393feae4-c2cd-4db0-8dcb-9f2ff2e1c83e'
    }, {});
  }
};
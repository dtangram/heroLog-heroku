'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM "Messagings" WHERE id = '6c150dd1-232c-4e9d-84d6-27427bf4a93e';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert(
        'Messagings',
        [
          {
            id: '6c150dd1-232c-4e9d-84d6-27427bf4a93e',
            name: 'Thomas Johnson',
            email: 'tj@gmail.com',
            subject: 'Question about issue',  // Add subject if required
            message: 'Is this issue a reprint?',
            messageUsersId: '712acaa6-7f3e-4dd3-96c9-ce74650133c9',  // Your user ID
            userSent: '712acaa6-7f3e-4dd3-96c9-ce74650133c9',  // Your user ID
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      console.log('✅ Messaging from Thomas Johnson created');
    } else {
      console.log('ℹ️  Messaging from Thomas Johnson already exists, skipping...');
    }
  },

  down: queryInterface => queryInterface.bulkDelete('Messagings', {
    id: '6c150dd1-232c-4e9d-84d6-27427bf4a93e'
  }, {})
};
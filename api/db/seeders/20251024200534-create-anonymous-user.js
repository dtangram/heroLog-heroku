'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if anonymous user already exists
    const existingUsers = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE id = '00000000-0000-0000-0000-000000000001';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existingUsers.length === 0) {
      await queryInterface.bulkInsert('Users', [{
        id: '00000000-0000-0000-0000-000000000001',
        username: 'anonymous',
        firstname: 'Anonymous',
        lastname: 'User',
        email: 'anonymous@herolog.com',
        password: '$2b$10$K7L/4Y0BXZ5o9hN9Y6gXJOqX0C.qJ7Y5VwX3dZ1dXJ7Y5VwX3dZ1dX',
        type: 'regular',
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
      
      console.log('✅ Anonymous user created successfully');
    } else {
      console.log('ℹ️  Anonymous user already exists, skipping...');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', {
      id: '00000000-0000-0000-0000-000000000001'
    }, {});
  }
};
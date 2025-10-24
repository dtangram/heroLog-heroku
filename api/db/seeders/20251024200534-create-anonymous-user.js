'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if user already exists
    const existingUser = await queryInterface.rawSelect('Users', {
      where: {
        id: '00000000-0000-0000-0000-000000000001'
      }
    }, ['id']);

    if (!existingUser) {
      await queryInterface.bulkInsert('Users', [{
        id: '00000000-0000-0000-0000-000000000001',
        username: 'anonymous',
        firstname: 'Anonymous',
        lastname: 'User',
        email: 'anonymous@herolog.com',
        password: '$2b$10$XYZ...DisabledPassword',  // Hashed disabled password
        type: 'regular',
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', {
      id: '00000000-0000-0000-0000-000000000001'
    }, {});
  }
};
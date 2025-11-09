'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if this specific user already exists
    const existingUsers = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE id = '712acaa6-7f3e-4dd3-96c9-ce74650133c9';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existingUsers.length === 0) {
      // Hash the password
      const hashedPassword = await bcrypt.hash('1234abcdefghijklmn', 10);
      
      // Only insert if user doesn't exist
      await queryInterface.bulkInsert(
        'Users',
        [
          {
            id: '712acaa6-7f3e-4dd3-96c9-ce74650133c9',
            username: 'dtangram',
            firstname: 'Douglas',
            lastname: 'Angram',
            email: 'dtangram@gmail.com',
            password: hashedPassword,  // Now properly hashed
            accesstoken: 'abcd1234',
            type: 'regular',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );
      
      console.log('✅ User dtangram created');
    } else {
      console.log('ℹ️  User dtangram already exists, skipping...');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', {
      id: '712acaa6-7f3e-4dd3-96c9-ce74650133c9'
    }, {});
  }
};
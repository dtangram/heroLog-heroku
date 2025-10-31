'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('Users');
    
    if (!tableDescription.profile_pic) {
      await queryInterface.addColumn('Users', 'profile_pic', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'https://herologimages.s3.us-east-2.amazonaws.com/material-design-account-icon.png'
      });
      
      console.log('✅ Added profile_pic column to Users table');
    } else {
      console.log('ℹ️  profile_pic column already exists, skipping...');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Users');
    
    if (tableDescription.profile_pic) {
      await queryInterface.removeColumn('Users', 'profile_pic');
      console.log('✅ Removed profile_pic column from Users table');
    }
  }
};
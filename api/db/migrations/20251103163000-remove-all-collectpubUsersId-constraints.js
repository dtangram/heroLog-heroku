'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Get all foreign key constraints on collectpubUsersId
      const constraints = await queryInterface.sequelize.query(
        `SELECT conname 
         FROM pg_constraint 
         WHERE conrelid = 'CollectionPublishers'::regclass 
           AND contype = 'f' 
           AND conname LIKE '%collectpubUsersId%';`,
        { transaction, type: Sequelize.QueryTypes.SELECT }
      );

      console.log('Found constraints:', constraints);

      // Remove each constraint
      for (const constraint of constraints) {
        console.log('Removing constraint:', constraint.conname);
        await queryInterface.removeConstraint(
          'CollectionPublishers',
          constraint.conname,
          { transaction }
        );
      }

      // Also try removing by specific names in case query doesn't work
      const constraintNames = [
        'CollectionPublishers_collectpubUsersId_fkey',
        'CollectionPublishers_collectpubUsersId_fkey1'
      ];

      for (const name of constraintNames) {
        try {
          await queryInterface.sequelize.query(
            `ALTER TABLE "CollectionPublishers" DROP CONSTRAINT IF EXISTS "${name}";`,
            { transaction }
          );
          console.log('Removed constraint:', name);
        } catch (error) {
          console.log('Constraint not found or already removed:', name);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Don't recreate the constraint - leave it removed
    console.log('Down migration: leaving constraints removed');
  }
};
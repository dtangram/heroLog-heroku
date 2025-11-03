'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check both possible table names
      const tableNames = ['CollectionPublishers', 'collectionpublishers'];
      let actualTableName = null;

      for (const name of tableNames) {
        try {
          const result = await queryInterface.sequelize.query(
            `SELECT to_regclass('"${name}"')::text as exists;`,
            { transaction, type: Sequelize.QueryTypes.SELECT }
          );
          
          if (result[0] && result[0].exists) {
            actualTableName = name;
            console.log('Found table:', actualTableName);
            break;
          }
        } catch (error) {
          console.log('Table not found:', name);
        }
      }

      if (!actualTableName) {
        console.log('CollectionPublishers table not found, skipping migration');
        await transaction.commit();
        return;
      }

      // Get all foreign key constraints
      const constraints = await queryInterface.sequelize.query(
        `SELECT conname 
         FROM pg_constraint 
         WHERE conrelid = '"${actualTableName}"'::regclass 
           AND contype = 'f';`,
        { transaction, type: Sequelize.QueryTypes.SELECT }
      );

      console.log('Found constraints:', constraints);

      // Remove each constraint
      for (const constraint of constraints) {
        if (constraint.conname.includes('collectpubUsersId')) {
          console.log('Removing constraint:', constraint.conname);
          try {
            await queryInterface.sequelize.query(
              `ALTER TABLE "${actualTableName}" DROP CONSTRAINT IF EXISTS "${constraint.conname}";`,
              { transaction }
            );
          } catch (error) {
            console.log('Error removing constraint:', constraint.conname, error.message);
          }
        }
      }

      await transaction.commit();
      console.log('Migration complete');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Down migration: leaving constraints removed');
  }
};
'use strict';
module.exports = {
  up: async queryInterface => {
    const constraints = await queryInterface.sequelize.query(
      `SELECT conname
         FROM pg_constraint
        WHERE conrelid = '"CollectionAnalyses"'::regclass
          AND contype = 'f';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const { conname } of constraints) {
      await queryInterface.removeConstraint('CollectionAnalyses', conname);
    }
  },

  down: async queryInterface => {
    // Guest rows have no matching user; remove them so the key can return
    await queryInterface.sequelize.query(
      `DELETE FROM "CollectionAnalyses"
        WHERE "analysisUsersId" NOT IN (SELECT id FROM "Users");`
    );

    await queryInterface.addConstraint('CollectionAnalyses', {
      fields: ['analysisUsersId'],
      type: 'foreign key',
      references: { table: 'Users', field: 'id' },
      onDelete: 'CASCADE',
    });
  },
};
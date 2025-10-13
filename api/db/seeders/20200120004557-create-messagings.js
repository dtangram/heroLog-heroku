module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(
    'Messagings',
    [
      {
        id: '6c150dd1-232c-4e9d-84d6-27427bf4a93e',
        name: 'Thomas Johnson',
        email: 'tj@gmail.com',
        message: 'Is this issue a reprint?',
        createdAt: Sequelize.literal('NOW()'),
        updatedAt: Sequelize.literal('NOW()'),
      },
    ],
    {},
  ),

  down: queryInterface => queryInterface.bulkDelete('Messagings', null, {}),
};

module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(
    'Users',
    [
      {
        id: '712acaa6-7f3e-4dd3-96c9-ce74650133c9',
        username: 'dtangram',
        firstname: 'Douglas',
        lastname: 'Angram',
        email: 'dtangram@gmail.com',
        password: '1234abcdefghijklmn',
        accesstoken: 'abcd1234',
        type: 'regular',
        createdAt: Sequelize.literal('NOW()'),
        updatedAt: Sequelize.literal('NOW()'),
      },
    ],
    {},
  ),

  down: queryInterface => queryInterface.bulkDelete('Users', null, {}),
};

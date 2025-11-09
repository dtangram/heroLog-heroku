module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('Messagings', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    name: {
      type: Sequelize.STRING,
    },

    email: {
      type: Sequelize.STRING,

    },

    message: {
      type: Sequelize.STRING,
    },

    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },

    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),

  down: queryInterface => queryInterface.dropTable('Messagings'),
};

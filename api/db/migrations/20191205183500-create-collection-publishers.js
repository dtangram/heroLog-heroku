module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('CollectionPublishers', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    publisherName: {
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

  down: queryInterface => queryInterface.dropTable('CollectionPublishers'),
};

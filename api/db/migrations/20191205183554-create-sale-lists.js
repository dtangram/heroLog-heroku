module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('SaleLists', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    comicBookTitle: {
      type: Sequelize.STRING,
    },

    comicBookVolume: {
      type: Sequelize.INTEGER,
    },

    comicBookYear: {
      type: Sequelize.INTEGER,
    },

    comicBookPublisher: {
      type: Sequelize.STRING,
    },

    type: {
      type: Sequelize.ENUM('regular', 'variant'),
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

  down: queryInterface => queryInterface.dropTable('SaleLists'),
};

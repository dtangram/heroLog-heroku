module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('ComicBooks', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    title: {
      type: Sequelize.STRING,
    },

    author: {
      type: Sequelize.STRING,
    },

    penciler: {
      type: Sequelize.STRING,
    },

    coverartist: {
      type: Sequelize.STRING,
    },

    inker: {
      type: Sequelize.STRING,
    },

    volume: {
      type: Sequelize.INTEGER,
    },

    year: {
      type: Sequelize.INTEGER,
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

  down: queryInterface => queryInterface.dropTable('ComicBooks'),
};

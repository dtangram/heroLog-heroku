'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.renameColumn('ComicBooks', 'comicbooktitleId', 'comicbooktitlerelId');
  },

  down: async (queryInterface) => {
    await queryInterface.renameColumn('ComicBooks', 'comicbooktitlerelId', 'comicbooktitleId');
  }
};
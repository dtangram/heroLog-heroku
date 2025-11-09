import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

// Type for the models object passed to associate
interface Models {
  CollectionPublishers?: ModelStatic<Model>;
  SaleLists?: ModelStatic<Model>;
  Messagings?: ModelStatic<Model>;
  WishLists?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

// Extended model type that includes the associate method
interface UsersModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

// The actual model factory function - direct TypeScript conversion
const createUsersModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): UsersModel => {
  const Users = sequelize.define('Users', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
      validate: {
        isUUID: { args: 4, msg: 'ID not valid, please try again.' },
      },
    },
    username: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Username is required' },
      },
    },
    firstname: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'First name is required' },
      },
    },
    lastname: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Last name is required' },
      },
    },
    email: {
      type: dataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: { msg: 'Must be a valid email address' },
        notEmpty: { msg: 'Email is required' },
      },
    },
    accesstoken: {
      type: dataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: dataTypes.STRING,
      allowNull: true,
    },
    profilePic: {
      type: dataTypes.STRING,
      allowNull: true,
      field: 'profile_pic',
    },
    type: {
      type: dataTypes.ENUM('regular', 'fixer'),
      allowNull: false,
      defaultValue: 'regular',
      validate: {
        isIn: {
          args: [['regular', 'fixer']],
          msg: 'User type must be regular or fixer',
        },
      },
    },
  }, {}) as UsersModel;
  
  Users.associate = (models: Models) => {
    if (models.CollectionPublishers) {
      Users.hasMany(models.CollectionPublishers, { 
        foreignKey: 'collectpubUsersId' 
      });
    }
    if (models.SaleLists) {
      Users.hasMany(models.SaleLists, { 
        foreignKey: 'saleUsersId' 
      });
    }
    if (models.Messagings) {
      Users.hasMany(models.Messagings, { 
        foreignKey: 'messageUsersId' 
      });
    }
    if (models.WishLists) {
      Users.hasMany(models.WishLists, { 
        foreignKey: 'wishUsersId' 
      });
    }
  };
  
  return Users;
};

export = createUsersModel;
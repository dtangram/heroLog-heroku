import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { Models } from '.';

export type UserType = 'regular' | 'fixer';

export interface UserAttributes {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  accesstoken: string | null;
  password: string | null;
  profilePic: string | null;
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  'id' | 'accesstoken' | 'password' | 'profilePic' | 'type' | 'createdAt' | 'updatedAt'
>;

/** A saved row as the API sends it */
export type UserJson = UserAttributes;

export interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {}

export interface UsersModel extends ModelStatic<UserInstance> {
  associate: (models: Models) => void;
}

// The actual model factory function - direct TypeScript conversion
const createUsersModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): UsersModel => {
  const Users = sequelize.define<UserInstance>('Users', {
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
    // Sequelize sets these itself; they're listed so their types are known
    createdAt: {
      type: dataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: dataTypes.DATE,
      allowNull: false,
    },
  }, {});
  
  const associate = (models: Models): void => {
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
  
  return Object.assign(Users, { associate });
};

export default createUsersModel;
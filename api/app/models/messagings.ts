import { Sequelize, DataTypes, Model, ModelStatic, Optional } from 'sequelize';
import type { Models } from '.';

export interface MessagingAttributes {
  id: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  userSent: number | null;
  message: string | null;
  messageUsersId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MessagingCreationAttributes = Optional<
  MessagingAttributes,
  'id' | 'name' | 'email' | 'subject' | 'userSent' | 'message' | 'messageUsersId' | 'createdAt' | 'updatedAt'
>;

/** A saved row as the API sends it */
export type MessagingJson = MessagingAttributes;

export interface MessagingInstance extends Model<MessagingAttributes, MessagingCreationAttributes>, MessagingAttributes {}

export interface MessagingsModel extends ModelStatic<MessagingInstance> {
  associate: (models: Models) => void;
}

const createMessagingsModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): MessagingsModel => {
  const Messagings = sequelize.define<MessagingInstance>('Messagings', {
    id: {
      defaultValue: dataTypes.UUIDV4,
      primaryKey: true,
      type: dataTypes.UUID,
      validate: {
        isUUID: { args: 4, msg: 'ID not valid, please try again' },
      },
    },
    name: {
      type: dataTypes.STRING,
      validate: {
        len: { args: [3, 500], msg: 'Name is required' },
      },
    },
    email: {
      type: dataTypes.STRING,
      validate: {
        len: { args: [3, 500], msg: 'Email is required' },
      },
    },
    subject: {
      type: dataTypes.STRING,
    },
    userSent: {
      type: dataTypes.INTEGER,
    },
    message: {
      type: dataTypes.STRING,
      validate: {
        len: { args: [10, 500], msg: 'Message is required' },
      },
    },
    messageUsersId: {
      type: dataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: { args: 4, msg: 'Invalid user ID' },
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
    if (models.Users) {
      Messagings.belongsTo(models.Users, {
        foreignKey: 'messageUsersId'
      });
    }
  };
  
  return Object.assign(Messagings, { associate });
};

export default createMessagingsModel;
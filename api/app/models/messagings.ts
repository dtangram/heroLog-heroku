import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

interface Models {
  Users?: ModelStatic<Model>;
  [key: string]: ModelStatic<Model> | undefined;
}

interface MessagingsModel extends ModelStatic<Model> {
  associate: (models: Models) => void;
}

const createMessagingsModel = (sequelize: Sequelize, dataTypes: typeof DataTypes): MessagingsModel => {
  const Messagings = sequelize.define('Messagings', {
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
  }, {}) as MessagingsModel;
  
  Messagings.associate = (models: Models) => {
    if (models.Users) {
      Messagings.belongsTo(models.Users, {
        foreignKey: 'messageUsersId'
      });
    }
  };
  
  return Messagings;
};

export = createMessagingsModel;
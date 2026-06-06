import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FarmAttributes {
  id: string;
  userId: string;
  name: string;
  location: string;
  size: number;
  soilType?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FarmCreationAttributes extends Optional<FarmAttributes, 'id' | 'isActive'> {}

class Farm extends Model<FarmAttributes, FarmCreationAttributes> implements FarmAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public location!: string;
  public size!: number;
  public soilType?: string;
  public latitude?: number;
  public longitude?: number;
  public description?: string;
  public isActive!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Farm.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Farm size in hectares',
      validate: {
        min: 0,
      },
    },
    soilType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'farms',
    timestamps: true,
  }
);

export default Farm;

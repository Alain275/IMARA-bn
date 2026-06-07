import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AdviceAttributes {
  id: string;
  agronomistId: string;
  farmerId: string;
  farmId?: string;
  title: string;
  problem: string;
  recommendation: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  createdAt?: Date;
  updatedAt?: Date;
}

interface AdviceCreationAttributes extends Optional<AdviceAttributes, 'id' | 'status'> {}

class Advice extends Model<AdviceAttributes, AdviceCreationAttributes> implements AdviceAttributes {
  public id!: string;
  public agronomistId!: string;
  public farmerId!: string;
  public farmId?: string;
  public title!: string;
  public problem!: string;
  public recommendation!: string;
  public status!: 'pending' | 'in_progress' | 'resolved' | 'closed';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Advice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    agronomistId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    farmerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    farmId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'farms',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    problem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    recommendation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'pending',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'advice',
    timestamps: true,
  }
);

export default Advice;

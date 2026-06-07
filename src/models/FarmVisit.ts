import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FarmVisitAttributes {
  id: string;
  agronomistId: string;
  farmerId: string;
  farmId?: string;
  visitDate: Date;
  observations: string;
  recommendations: string;
  nextVisitDate?: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

interface FarmVisitCreationAttributes extends Optional<FarmVisitAttributes, 'id' | 'status'> {}

class FarmVisit extends Model<FarmVisitAttributes, FarmVisitCreationAttributes> implements FarmVisitAttributes {
  public id!: string;
  public agronomistId!: string;
  public farmerId!: string;
  public farmId?: string;
  public visitDate!: Date;
  public observations!: string;
  public recommendations!: string;
  public nextVisitDate?: Date;
  public status!: 'scheduled' | 'completed' | 'cancelled';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FarmVisit.init(
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
    visitDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    nextVisitDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
      defaultValue: 'scheduled',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'farm_visits',
    timestamps: true,
  }
);

export default FarmVisit;

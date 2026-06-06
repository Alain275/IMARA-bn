import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FarmerCropAttributes {
  id: string;
  userId: string;
  farmId?: string;
  cropId: string;
  plantingDate: Date;
  expectedHarvestDate?: Date;
  actualHarvestDate?: Date;
  areaPlanted: number;
  status: 'planned' | 'planted' | 'growing' | 'harvested' | 'failed';
  yield?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FarmerCropCreationAttributes extends Optional<FarmerCropAttributes, 'id' | 'status'> {}

class FarmerCrop extends Model<FarmerCropAttributes, FarmerCropCreationAttributes> implements FarmerCropAttributes {
  public id!: string;
  public userId!: string;
  public farmId?: string;
  public cropId!: string;
  public plantingDate!: Date;
  public expectedHarvestDate?: Date;
  public actualHarvestDate?: Date;
  public areaPlanted!: number;
  public status!: 'planned' | 'planted' | 'growing' | 'harvested' | 'failed';
  public yield?: number;
  public notes?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FarmerCrop.init(
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
    farmId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'farms',
        key: 'id',
      },
    },
    cropId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'crops',
        key: 'id',
      },
    },
    plantingDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expectedHarvestDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actualHarvestDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    areaPlanted: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Area in hectares',
    },
    status: {
      type: DataTypes.ENUM('planned', 'planted', 'growing', 'harvested', 'failed'),
      defaultValue: 'planned',
      allowNull: false,
    },
    yield: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Yield in tons or kg',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'farmer_crops',
    timestamps: true,
  }
);

export default FarmerCrop;

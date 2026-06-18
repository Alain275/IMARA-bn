import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FarmAttributes {
  id: string;
  userId: string;
  farmName: string;
  size: number; // in hectares
  location: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  soilType?: string;
  irrigationType?: 'rain-fed' | 'drip' | 'sprinkler' | 'flood' | 'none';
  currentCrop?: string;
  plantingDate?: Date;
  expectedHarvestDate?: Date;
  seedVariety?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'inactive' | 'fallow';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FarmCreationAttributes extends Optional<FarmAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Farm extends Model<FarmAttributes, FarmCreationAttributes> implements FarmAttributes {
  public id!: string;
  public userId!: string;
  public farmName!: string;
  public size!: number;
  public location!: string;
  public district!: string;
  public sector!: string;
  public cell!: string;
  public village!: string;
  public soilType?: string;
  public irrigationType?: 'rain-fed' | 'drip' | 'sprinkler' | 'flood' | 'none';
  public currentCrop?: string;
  public plantingDate?: Date;
  public expectedHarvestDate?: Date;
  public seedVariety?: string;
  public coordinates?: {
    latitude: number;
    longitude: number;
  };
  public status!: 'active' | 'inactive' | 'fallow';
  public notes?: string;

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
      onDelete: 'CASCADE',
    },
    farmName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sector: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cell: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    village: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    soilType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    irrigationType: {
      type: DataTypes.ENUM('rain-fed', 'drip', 'sprinkler', 'flood', 'none'),
      defaultValue: 'rain-fed',
    },
    currentCrop: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    plantingDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expectedHarvestDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    seedVariety: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'fallow'),
      defaultValue: 'active',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'farms',
    timestamps: true,
  }
);

export default Farm;

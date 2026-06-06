import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CropAttributes {
  id: string;
  name: string;
  scientificName?: string;
  category: string;
  description?: string;
  growthPeriod: number;
  waterNeed: 'low' | 'medium' | 'high';
  soilType?: string;
  optimalTemp?: string;
  season?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CropCreationAttributes extends Optional<CropAttributes, 'id'> {}

class Crop extends Model<CropAttributes, CropCreationAttributes> implements CropAttributes {
  public id!: string;
  public name!: string;
  public scientificName?: string;
  public category!: string;
  public description?: string;
  public growthPeriod!: number;
  public waterNeed!: 'low' | 'medium' | 'high';
  public soilType?: string;
  public optimalTemp?: string;
  public season?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Crop.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    scientificName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g., Cereals, Legumes, Vegetables',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    growthPeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Growth period in days',
    },
    waterNeed: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
    },
    soilType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    optimalTemp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'e.g., 20-30°C',
    },
    season: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'e.g., Season A, Season B',
    },
  },
  {
    sequelize,
    tableName: 'crops',
    timestamps: true,
  }
);

export default Crop;

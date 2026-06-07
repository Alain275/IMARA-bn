import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AgronomistProfileAttributes {
  id: string;
  userId: string;
  district: string;
  sector: string;
  specialization: string;
  yearsOfExperience: number;
  bio?: string;
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AgronomistProfileCreationAttributes extends Optional<AgronomistProfileAttributes, 'id' | 'isVerified'> {}

class AgronomistProfile extends Model<AgronomistProfileAttributes, AgronomistProfileCreationAttributes> implements AgronomistProfileAttributes {
  public id!: string;
  public userId!: string;
  public district!: string;
  public sector!: string;
  public specialization!: string;
  public yearsOfExperience!: number;
  public bio?: string;
  public isVerified!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AgronomistProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    district: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sector: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g., Crop Management, Soil Science, Pest Control',
    },
    yearsOfExperience: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'agronomist_profiles',
    timestamps: true,
  }
);

export default AgronomistProfile;

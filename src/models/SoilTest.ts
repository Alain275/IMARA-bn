import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SoilTestAttributes {
  id: string;
  userId: string;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter?: number;
  texture?: string;
  location?: string;
  notes?: string;
  testDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SoilTestCreationAttributes extends Optional<SoilTestAttributes, 'id' | 'testDate'> {}

// `declare` instead of `!` prevents ES2022 class-field initializers from
// shadowing Sequelize's prototype getters (which would make all reads return
// undefined when the controller accesses instance.ph directly).
class SoilTest extends Model<SoilTestAttributes, SoilTestCreationAttributes> implements SoilTestAttributes {
  declare public id: string;
  declare public userId: string;
  declare public ph: number;
  declare public nitrogen: number;
  declare public phosphorus: number;
  declare public potassium: number;
  declare public organicMatter: number | undefined;
  declare public texture: string | undefined;
  declare public location: string | undefined;
  declare public notes: string | undefined;
  declare public testDate: Date;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

SoilTest.init(
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
    ph: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 14,
      },
    },
    nitrogen: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Nitrogen level (mg/kg)',
    },
    phosphorus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Phosphorus level (mg/kg)',
    },
    potassium: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Potassium level (mg/kg)',
    },
    organicMatter: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Organic matter percentage',
    },
    texture: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'e.g., Clay Loam, Sandy',
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    testDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'soil_tests',
    timestamps: true,
  }
);

export default SoilTest;

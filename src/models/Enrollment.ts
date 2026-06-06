import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface EnrollmentAttributes {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completed: boolean;
  enrolledAt: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EnrollmentCreationAttributes extends Optional<EnrollmentAttributes, 'id' | 'progress' | 'completed' | 'enrolledAt'> {}

class Enrollment extends Model<EnrollmentAttributes, EnrollmentCreationAttributes> implements EnrollmentAttributes {
  public id!: string;
  public userId!: string;
  public courseId!: string;
  public progress!: number;
  public completed!: boolean;
  public enrolledAt!: Date;
  public completedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Enrollment.init(
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
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
    },
    progress: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    enrolledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'enrollments',
    timestamps: true,
  }
);

export default Enrollment;

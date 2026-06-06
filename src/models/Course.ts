import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CourseAttributes {
  id: string;
  title: string;
  description?: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  lessons: number;
  language: string;
  thumbnail?: string;
  instructor?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CourseCreationAttributes extends Optional<CourseAttributes, 'id'> {}

class Course extends Model<CourseAttributes, CourseCreationAttributes> implements CourseAttributes {
  public id!: string;
  public title!: string;
  public description?: string;
  public category!: string;
  public level!: 'beginner' | 'intermediate' | 'advanced';
  public duration!: number;
  public lessons!: number;
  public language!: string;
  public thumbnail?: string;
  public instructor?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Course.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration in minutes',
    },
    lessons: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'Kinyarwanda',
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    instructor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'courses',
    timestamps: true,
  }
);

export default Course;

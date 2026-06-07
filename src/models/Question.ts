import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface QuestionAttributes {
  id: string;
  farmerId: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  status: 'pending' | 'answered' | 'closed';
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface QuestionCreationAttributes extends Optional<QuestionAttributes, 'id' | 'status'> {}

class Question extends Model<QuestionAttributes, QuestionCreationAttributes> implements QuestionAttributes {
  public id!: string;
  public farmerId!: string;
  public question!: string;
  public answer?: string;
  public answeredBy?: string;
  public status!: 'pending' | 'answered' | 'closed';
  public category?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Question.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    farmerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    answeredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'answered', 'closed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'e.g., Crop Management, Pest Control, Soil Health',
    },
  },
  {
    sequelize,
    tableName: 'questions',
    timestamps: true,
  }
);

export default Question;

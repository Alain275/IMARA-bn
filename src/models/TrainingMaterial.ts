import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TrainingMaterialAttributes {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  category: string;
  language: string;
  isPublished: boolean;
  viewCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TrainingMaterialCreationAttributes extends Optional<TrainingMaterialAttributes, 'id' | 'isPublished' | 'viewCount'> {}

class TrainingMaterial extends Model<TrainingMaterialAttributes, TrainingMaterialCreationAttributes> implements TrainingMaterialAttributes {
  public id!: string;
  public createdBy!: string;
  public title!: string;
  public description!: string;
  public content?: string;
  public videoUrl?: string;
  public pdfUrl?: string;
  public category!: string;
  public language!: string;
  public isPublished!: boolean;
  public viewCount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TrainingMaterial.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pdfUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g., Crop Management, Pest Control, Soil Health, Market Access',
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en',
      comment: 'e.g., en, rw, fr',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'training_materials',
    timestamps: true,
  }
);

export default TrainingMaterial;

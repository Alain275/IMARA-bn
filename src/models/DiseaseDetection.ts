import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DiseaseDetectionAttributes {
  id: string;
  userId: string;
  cropId?: string;
  diseaseName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  imageUrl?: string;
  symptoms?: string;
  treatment?: string;
  prevention?: string;
  detectedAt: Date;
  aiPrediction?: string;
  aiConfidence?: number;
  verifiedBy?: string;
  verificationStatus: 'pending_review' | 'verified' | 'corrected';
  verificationNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DiseaseDetectionCreationAttributes extends Optional<DiseaseDetectionAttributes, 'id' | 'detectedAt'> {}

class DiseaseDetection extends Model<DiseaseDetectionAttributes, DiseaseDetectionCreationAttributes> implements DiseaseDetectionAttributes {
  public id!: string;
  public userId!: string;
  public cropId?: string;
  public diseaseName!: string;
  public confidence!: number;
  public severity!: 'low' | 'medium' | 'high';
  public imageUrl?: string;
  public symptoms?: string;
  public treatment?: string;
  public prevention?: string;
  public detectedAt!: Date;
  public aiPrediction?: string;
  public aiConfidence?: number;
  public verifiedBy?: string;
  public verificationStatus!: 'pending_review' | 'verified' | 'corrected';
  public verificationNotes?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DiseaseDetection.init(
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
    cropId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'crops',
        key: 'id',
      },
    },
    diseaseName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Confidence level (0-100%)',
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    treatment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prevention: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    detectedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    aiPrediction: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Original AI model prediction',
    },
    aiConfidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'AI prediction confidence (0-100%)',
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'Agronomist who verified the detection',
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending_review', 'verified', 'corrected'),
      defaultValue: 'pending_review',
      allowNull: false,
    },
    verificationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Agronomist notes on verification',
    },
  },
  {
    sequelize,
    tableName: 'disease_detections',
    timestamps: true,
  }
);

export default DiseaseDetection;

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DiseaseDetectionAttributes {
  id: string;
  userId: string;
  farmId?: string;
  cropId?: string;
  imageUrl?: string;
  
  // AI fields
  aiDisease: string;
  aiCrop: string;
  aiConfidence: number;
  aiModel: string;
  aiMode: string;
  demoMode: boolean;
  
  // Details
  symptoms?: string;
  treatment?: string;
  prevention?: string;
  
  // Verification
  status: 'pending_review' | 'verified' | 'rejected';
  verifiedDisease?: string;
  verifiedTreatment?: string;
  agronomistComment?: string;
  verifiedBy?: string;
  verifiedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

interface DiseaseDetectionCreationAttributes extends Optional<DiseaseDetectionAttributes, 'id' | 'status'> {}

class DiseaseDetection extends Model<DiseaseDetectionAttributes, DiseaseDetectionCreationAttributes> implements DiseaseDetectionAttributes {
  public id!: string;
  public userId!: string;
  public farmId?: string;
  public cropId?: string;
  public imageUrl?: string;
  
  public aiDisease!: string;
  public aiCrop!: string;
  public aiConfidence!: number;
  public aiModel!: string;
  public aiMode!: string;
  public demoMode!: boolean;

  public symptoms?: string;
  public treatment?: string;
  public prevention?: string;

  public status!: 'pending_review' | 'verified' | 'rejected';
  public verifiedDisease?: string;
  public verifiedTreatment?: string;
  public agronomistComment?: string;
  public verifiedBy?: string;
  public verifiedAt?: Date;

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
      allowNull: true,
      references: {
        model: 'crops',
        key: 'id',
      },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aiDisease: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Original AI model prediction',
    },
    aiCrop: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Crop predicted by AI',
    },
    aiConfidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'AI prediction confidence (0-100%)',
    },
    aiModel: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aiMode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    demoMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    status: {
      type: DataTypes.ENUM('pending_review', 'verified', 'rejected'),
      defaultValue: 'pending_review',
      allowNull: false,
    },
    verifiedDisease: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verifiedTreatment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    agronomistComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Agronomist notes on verification',
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
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'disease_detections',
    timestamps: true,
  }
);

export default DiseaseDetection;

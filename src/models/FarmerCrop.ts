import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FarmerCropAttributes {
  id: string;
  userId: string;
  farmId?: string;
  cropId: string;
  plantingDate: Date;
  expectedHarvestDate?: Date;
  actualHarvestDate?: Date;
  areaPlanted: number;
  status: 'planned' | 'planted' | 'growing' | 'harvested' | 'failed';
  yield?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FarmerCropC
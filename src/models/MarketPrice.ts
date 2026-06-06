import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MarketPriceAttributes {
  id: string;
  cropId: string;
  market: string;
  location: string;
  price: number;
  unit: string;
  currency: string;
  priceDate: Date;
  volume?: number;
  quality?: string;
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MarketPriceCreationAttributes extends Optional<MarketPriceAttributes, 'id' | 'currency' | 'priceDate'> {}

class MarketPrice extends Model<MarketPriceAttributes, MarketPriceCreationAttributes> implements MarketPriceAttributes {
  public id!: string;
  public cropId!: string;
  public market!: string;
  public location!: string;
  public price!: number;
  public unit!: string;
  public currency!: string;
  public priceDate!: Date;
  public volume?: number;
  public quality?: string;
  public source?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MarketPrice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cropId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'crops',
        key: 'id',
      },
    },
    market: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Market name',
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g., kg, ton',
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'RWF',
      allowNull: false,
    },
    priceDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    volume: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Trading volume',
    },
    quality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Data source',
    },
  },
  {
    sequelize,
    tableName: 'market_prices',
    timestamps: true,
  }
);

export default MarketPrice;

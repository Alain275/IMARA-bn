import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// User roles enum
export enum UserRole {
  FARMER = 'farmer',
  AGRO_DEALER = 'agro-dealer',
  AGRONOMIST = 'agronomist',
  ADMIN = 'admin',
  COOPERATIVE = 'cooperative'
}

// User attributes interface
export interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  location?: string;
  farmSize?: number;
  isEmailVerified: boolean;
  isActive: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  otp?: string;
  otpExpires?: Date;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isEmailVerified' | 'isActive'> {}

// User Model Class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare phone: string | undefined;
  declare role: UserRole;
  declare location: string | undefined;
  declare farmSize: number | undefined;
  declare isEmailVerified: boolean;
  declare isActive: boolean;
  declare emailVerificationToken: string | undefined;
  declare emailVerificationExpires: Date | undefined;
  declare passwordResetToken: string | undefined;
  declare passwordResetExpires: Date | undefined;
  declare otp: string | undefined;
  declare otpExpires: Date | undefined;
  declare lastLogin: Date | undefined;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Instance Methods

  /**
   * Compare password with hashed password
   */
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  /**
   * Hash password before saving
   */
  public async hashPassword(): Promise<void> {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  /**
   * Generate JWT token
   */
  public generateAuthToken(): string {
    return jwt.sign(
      { id: this.id, email: this.email, role: this.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Generate refresh token
   */
  public generateRefreshToken(): string {
    return jwt.sign(
      { id: this.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
  }

  /**
   * Generate email verification token
   */
  public generateEmailVerificationToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token;
  }

  /**
   * Generate password reset token
   */
  public generatePasswordResetToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return token;
  }

  /**
   * Generate OTP for email/phone verification
   */
  public generateOTP(): string {
    const otpLength = parseInt(process.env.OTP_LENGTH || '6');
    const otp = Math.floor(Math.random() * Math.pow(10, otpLength))
      .toString()
      .padStart(otpLength, '0');
    
    this.otp = otp;
    this.otpExpires = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_IN || '10') * 60 * 1000);
    return otp;
  }

  /**
   * Verify OTP
   */
  public verifyOTP(inputOTP: string): boolean {
    if (!this.otp || !this.otpExpires) {
      return false;
    }
    
    if (new Date() > this.otpExpires) {
      return false; // OTP expired
    }
    
    return this.otp === inputOTP;
  }

  /**
   * Clear OTP after verification
   */
  public clearOTP(): void {
    this.otp = undefined;
    this.otpExpires = undefined;
  }

  /**
   * Get public profile (without sensitive data)
   */
  public toJSON(): Partial<UserAttributes> {
    const values = { ...this.get() };
    delete values.password;
    delete values.emailVerificationToken;
    delete values.passwordResetToken;
    delete values.otp;
    return values;
  }
}

// Initialize User Model
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      set(value: string) {
        this.setDataValue('email', value.toLowerCase());
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100],
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^\+?[1-9]\d{1,14}$/,
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.FARMER,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    farmSize: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Farm size in hectares',
      validate: {
        min: 0,
      },
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otpExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        // Always hash on create — changed() returns false for new records
        await user.hashPassword();
      },
      beforeUpdate: async (user: User) => {
        // Only hash on update if password field actually changed
        if (user.changed('password') && user.password) {
          await user.hashPassword();
        }
      },
    },
  }
);

export default User;

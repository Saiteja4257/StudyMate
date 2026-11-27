import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    emailVerificationTokenHash: {
      type: String,
      default: undefined,
    },
    emailVerificationCodeHash: {
      type: String,
      default: undefined,
    },
    emailVerificationExpires: {
      type: Date,
      default: undefined,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);


export default mongoose.model("User", userSchema);
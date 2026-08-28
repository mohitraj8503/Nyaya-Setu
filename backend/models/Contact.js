const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    field: {
      type: String,
      trim: true,
      default: 'General Guidance Inquiry',
    },
    message: {
      type: String,
      required: [true, 'Please enter your message'],
      maxlength: 5000,
    },
    agreedTerms: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Responded', 'Archived'],
      default: 'New',
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Contact', contactSchema);

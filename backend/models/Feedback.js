const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    category: {
      type: String,
      default: 'General Guidance',
    },
    feedbackText: {
      type: String,
      maxlength: 1000,
    },
    citizenRole: {
      type: String,
      default: 'Citizen User',
    },
    helpful: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Feedback', feedbackSchema);

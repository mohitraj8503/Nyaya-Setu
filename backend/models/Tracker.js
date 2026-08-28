const mongoose = require('mongoose');

const trackerSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
    },
    portalName: {
      type: String,
      required: true,
      default: 'CPGRAMS',
    },
    portalRegistrationNumber: {
      type: String,
      default: '',
    },
    filingDate: {
      type: Date,
      default: Date.now,
    },
    currentStage: {
      type: String,
      enum: ['Complaint Drafted', 'Lodged on Official Portal', 'Under Department Review', 'Action Taken', 'Resolved / Closed'],
      default: 'Complaint Drafted',
    },
    timeline: [
      {
        stage: String,
        note: String,
        timestamp: { type: Date, default: Date.now },
      }
    ],
    reminderDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Tracker', trackerSchema);

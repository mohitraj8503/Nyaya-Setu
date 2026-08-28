const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a grievance category'],
      enum: [
        'Consumer Grievance & Refunds',
        'Public Infrastructure & Road Repair',
        'Electricity & Utility Issues',
        'Municipal Water Supply Problems',
        'Scheme & Benefit Discovery',
        'Digital Payment & Banking Issues',
        'Public Health & Hospital Guidance',
        'Student & Education Guidance',
        'Other Citizen Issue'
      ],
      default: 'Consumer Grievance & Refunds',
    },
    citizenName: {
      type: String,
      trim: true,
      default: 'Anonymous Citizen',
    },
    citizenEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    citizenPhone: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    incidentTitle: {
      type: String,
      required: [true, 'Please provide an incident title / summary'],
      trim: true,
      maxlength: 200,
    },
    incidentDescription: {
      type: String,
      required: [true, 'Please provide incident details'],
      maxlength: 5000,
    },
    incidentDate: {
      type: Date,
      default: Date.now,
    },
    opposingPartyOrDept: {
      type: String,
      trim: true,
      default: '',
    },
    orderOrReferenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    claimedAmount: {
      type: Number,
      default: 0,
    },
    officialPortal: {
      name: { type: String, default: 'CPGRAMS / National Consumer Helpline' },
      url: { type: String, default: 'https://pgportal.gov.in/' },
      helpline: { type: String, default: '1915 / 1800-11-4000' },
    },
    checklist: [
      {
        item: String,
        checked: { type: Boolean, default: false },
      }
    ],
    generatedDraftText: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Drafted', 'Guidance Generated', 'Action Pending', 'Submitted to Portal', 'Resolved'],
      default: 'Guidance Generated',
    },
    notes: [
      {
        text: String,
        createdAt: { type: Date, default: Date.now },
      }
    ]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Submission', submissionSchema);

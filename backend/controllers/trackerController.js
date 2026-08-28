const Tracker = require('../models/Tracker');
const Submission = require('../models/Submission');

// @desc    Get tracking timeline by code
// @route   GET /api/tracker/:trackingCode
exports.getTracker = async (req, res) => {
  try {
    const code = req.params.trackingCode.toUpperCase();
    const tracker = await Tracker.findOne({
      $or: [{ trackingCode: code }, { portalRegistrationNumber: code }]
    });

    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: `No active tracker found for code: ${req.params.trackingCode}`,
      });
    }

    const submission = await Submission.findOne({ trackingCode: tracker.trackingCode });

    res.status(200).json({
      success: true,
      data: {
        tracker,
        submission,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving tracker',
      error: error.message,
    });
  }
};

// @desc    Add milestone update to tracker
// @route   POST /api/tracker/:trackingCode/milestone
exports.addMilestone = async (req, res) => {
  try {
    const code = req.params.trackingCode.toUpperCase();
    const { stage, note, portalRegistrationNumber } = req.body;

    const updateData = {
      $push: {
        timeline: {
          stage: stage || 'Status Note',
          note: note || 'Timeline update logged by user',
          timestamp: new Date(),
        }
      }
    };

    if (stage) updateData.currentStage = stage;
    if (portalRegistrationNumber) updateData.portalRegistrationNumber = portalRegistrationNumber;

    const tracker = await Tracker.findOneAndUpdate(
      { trackingCode: code },
      updateData,
      { new: true }
    );

    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }

    res.status(200).json({
      success: true,
      data: tracker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error updating timeline milestone',
      error: error.message,
    });
  }
};

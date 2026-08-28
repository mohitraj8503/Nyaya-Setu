const Submission = require('../models/Submission');
const Contact = require('../models/Contact');
const Newsletter = require('../models/Newsletter');
const Tracker = require('../models/Tracker');
const Feedback = require('../models/Feedback');

// @desc    Get live metrics and statistics of runtime collected data
// @route   GET /api/stats
exports.getStats = async (req, res) => {
  try {
    const [
      totalSubmissions,
      totalContacts,
      totalSubscribers,
      totalFeedback,
      totalResolved,
      submissionsByCategory,
      submissionsByStatus,
      recentSubmissions,
      recentContacts,
      recentSubscribers,
      recentFeedback,
      feedbackAggregation,
    ] = await Promise.all([
      Submission.countDocuments(),
      Contact.countDocuments(),
      Newsletter.countDocuments(),
      Feedback.countDocuments(),
      Submission.countDocuments({ status: 'Resolved' }),
      Submission.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Submission.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Submission.find().sort({ createdAt: -1 }).limit(10),
      Contact.find().sort({ createdAt: -1 }).limit(10),
      Newsletter.find().sort({ createdAt: -1 }).limit(10),
      Feedback.find().sort({ createdAt: -1 }).limit(10),
      Feedback.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' }, total: { $sum: 1 } } },
      ]),
    ]);

    const avgRating = feedbackAggregation.length > 0
      ? Math.round(feedbackAggregation[0].avgRating * 10) / 10
      : 0;

    const uptimeSec = Math.round(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSubmissions,
          totalContacts,
          totalSubscribers,
          totalFeedback,
          totalResolved,
          avgFeedbackRating: avgRating,
          systemStatus: require('mongoose').connection.readyState === 1
            ? 'Online (MongoDB Connected)'
            : 'Degraded (No DB connection)',
          uptime: `${h}h ${m}m ${s}s`,
          nodeVersion: process.version,
        },
        categoryBreakdown: submissionsByCategory,
        statusBreakdown: submissionsByStatus,
        recentSubmissions,
        recentContacts,
        recentSubscribers,
        recentFeedback,
      },
    });
  } catch (error) {
    console.error('Error computing stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving statistics',
      error: error.message,
    });
  }
};

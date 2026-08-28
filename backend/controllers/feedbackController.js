const Feedback = require('../models/Feedback');

// @desc    Submit a feedback / rating
// @route   POST /api/feedback
exports.createFeedback = async (req, res) => {
  try {
    const { rating, category, feedbackText, citizenRole, helpful } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rating between 1 and 5.',
      });
    }

    const feedback = await Feedback.create({
      rating: Number(rating),
      category: category || 'General Guidance',
      feedbackText: feedbackText || '',
      citizenRole: citizenRole || 'Citizen User',
      helpful: helpful !== undefined ? Boolean(helpful) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! It helps us improve NyayaSetu.',
      data: feedback,
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving feedback.',
      error: error.message,
    });
  }
};

// @desc    Get all feedback entries with pagination
// @route   GET /api/feedback
exports.getFeedback = async (req, res) => {
  try {
    const { limit = 50, page = 1, minRating } = req.query;
    const query = {};
    if (minRating) query.rating = { $gte: Number(minRating) };

    const feedbackList = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Feedback.countDocuments(query);

    // Compute average rating
    const aggResult = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' }, total: { $sum: 1 } } },
    ]);
    const avgRating = aggResult.length > 0 ? Math.round(aggResult[0].avgRating * 10) / 10 : 0;

    res.status(200).json({
      success: true,
      count: feedbackList.length,
      total,
      avgRating,
      data: feedbackList,
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching feedback.',
      error: error.message,
    });
  }
};

// @desc    Delete a feedback entry by ID
// @route   DELETE /api/feedback/:id
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback entry not found.' });
    }
    res.status(200).json({ success: true, message: 'Feedback deleted successfully.' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting feedback.',
      error: error.message,
    });
  }
};

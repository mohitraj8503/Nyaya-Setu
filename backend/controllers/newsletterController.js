const Newsletter = require('../models/Newsletter');

// @desc    Subscribe to newsletter / updates
// @route   POST /api/newsletter
exports.subscribe = async (req, res) => {
  try {
    const { email, sourcePage } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to NyayaSetu updates!',
        data: existing,
      });
    }

    const subscriber = await Newsletter.create({
      email: email.toLowerCase(),
      sourcePage: sourcePage || 'Website Footer',
    });

    res.status(201).json({
      success: true,
      message: 'Subscribed successfully! Thank you for staying updated with NyayaSetu.',
      data: subscriber,
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing subscription.',
      error: error.message,
    });
  }
};

// @desc    Get all subscribers
// @route   GET /api/newsletter
exports.getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: subscribers.length,
      data: subscribers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching subscribers',
      error: error.message,
    });
  }
};

// @desc    Unsubscribe / delete a subscriber by ID
// @route   DELETE /api/newsletter/:id
exports.unsubscribe = async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found.' });
    }
    res.status(200).json({
      success: true,
      message: `${subscriber.email} has been unsubscribed successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error removing subscriber.',
      error: error.message,
    });
  }
};

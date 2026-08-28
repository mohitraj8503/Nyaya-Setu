const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const submissionController = require('../controllers/submissionController');
const newsletterController = require('../controllers/newsletterController');
const trackerController = require('../controllers/trackerController');
const statsController = require('../controllers/statsController');
const feedbackController = require('../controllers/feedbackController');
const adminAuth = require('../middleware/adminAuth');

const {
  validateContact,
  validateNewsletter,
  validateSubmission,
  validateFeedback,
} = require('../middleware/validate');

// ─────────────────────────────────────────
// DEVELOPER / ADMIN AUTH VERIFICATION
// ─────────────────────────────────────────
router.post('/admin/verify', (req, res) => {
  const { secret } = req.body;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Invalid developer secret key. Access denied.',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Developer authenticated successfully.',
  });
});

// ─────────────────────────────────────────
// CONTACT ROUTES (Public submit, Developer protected view/manage)
// ─────────────────────────────────────────
router.post('/contact', validateContact, contactController.createContact);
router.get('/contact', adminAuth, contactController.getContacts);
router.patch('/contact/:id', adminAuth, contactController.updateContactStatus);
router.delete('/contact/:id', adminAuth, contactController.deleteContact);

// ─────────────────────────────────────────
// GRIEVANCE / CITIZEN SUBMISSION ROUTES
// ─────────────────────────────────────────
router.post('/submissions', validateSubmission, submissionController.createSubmission);
router.get('/submissions', adminAuth, submissionController.getSubmissions);
router.get('/submissions/:trackingCode', submissionController.getSubmissionByCode);
router.patch('/submissions/:trackingCode', adminAuth, submissionController.updateSubmission);
router.delete('/submissions/:trackingCode', adminAuth, submissionController.deleteSubmission);

// ─────────────────────────────────────────
// NEWSLETTER SUBSCRIPTION ROUTES
// ─────────────────────────────────────────
router.post('/newsletter', validateNewsletter, newsletterController.subscribe);
router.get('/newsletter', adminAuth, newsletterController.getSubscribers);
router.delete('/newsletter/:id', adminAuth, newsletterController.unsubscribe);

// ─────────────────────────────────────────
// FEEDBACK / RATING ROUTES
// ─────────────────────────────────────────
router.post('/feedback', validateFeedback, feedbackController.createFeedback);
router.get('/feedback', adminAuth, feedbackController.getFeedback);
router.delete('/feedback/:id', adminAuth, feedbackController.deleteFeedback);

// ─────────────────────────────────────────
// TRACKER ROUTES
// ─────────────────────────────────────────
router.get('/tracker/:trackingCode', trackerController.getTracker);
router.post('/tracker/:trackingCode/milestone', adminAuth, trackerController.addMilestone);

// ─────────────────────────────────────────
// STATS & HEALTH (Protected stats for developer, public health check)
// ─────────────────────────────────────────
router.get('/stats', adminAuth, statsController.getStats);
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    uptimeFormatted: (() => {
      const s = Math.round(process.uptime());
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${h}h ${m}m ${sec}s`;
    })(),
    nodeVersion: process.version,
    db: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: require('mongoose').connection.name || 'nyayasetu',
  });
});

module.exports = router;

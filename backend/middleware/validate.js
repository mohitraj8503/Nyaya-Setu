/**
 * NyayaSetu Validation Middleware & Helpers
 * Provides reusable field validators for all routes
 */

// Email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Indian phone regex (10 digits, optional +91)
const PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

/**
 * Sanitize a string — trim and limit length
 */
const sanitizeStr = (str, maxLen = 5000) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLen);
};

/**
 * Validate contact form fields
 */
const validateContact = (req, res, next) => {
  const { name, email, message } = req.body;

  if (!name || sanitizeStr(name).length < 2) {
    return res.status(400).json({ success: false, message: 'Please provide a valid name (at least 2 characters).' });
  }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }
  if (!message || sanitizeStr(message).length < 10) {
    return res.status(400).json({ success: false, message: 'Please provide a message (at least 10 characters).' });
  }

  // Sanitize in place
  req.body.name = sanitizeStr(req.body.name, 100);
  req.body.email = req.body.email.trim().toLowerCase();
  req.body.message = sanitizeStr(req.body.message, 5000);
  if (req.body.field) req.body.field = sanitizeStr(req.body.field, 200);

  next();
};

/**
 * Validate newsletter subscription
 */
const validateNewsletter = (req, res, next) => {
  const { email } = req.body;
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address to subscribe.' });
  }
  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate grievance submission
 */
const validateSubmission = (req, res, next) => {
  const { incidentTitle, incidentDescription } = req.body;

  if (!incidentTitle || sanitizeStr(incidentTitle).length < 5) {
    return res.status(400).json({ success: false, message: 'Please provide an incident title (at least 5 characters).' });
  }
  if (!incidentDescription || sanitizeStr(incidentDescription).length < 20) {
    return res.status(400).json({ success: false, message: 'Please provide a detailed description (at least 20 characters).' });
  }

  // Sanitize
  req.body.incidentTitle = sanitizeStr(req.body.incidentTitle, 200);
  req.body.incidentDescription = sanitizeStr(req.body.incidentDescription, 5000);
  if (req.body.citizenName) req.body.citizenName = sanitizeStr(req.body.citizenName, 100);
  if (req.body.citizenEmail) req.body.citizenEmail = req.body.citizenEmail.trim().toLowerCase();
  if (req.body.opposingPartyOrDept) req.body.opposingPartyOrDept = sanitizeStr(req.body.opposingPartyOrDept, 300);

  next();
};

/**
 * Validate feedback submission
 */
const validateFeedback = (req, res, next) => {
  const { rating } = req.body;
  const r = Number(rating);
  if (!rating || isNaN(r) || r < 1 || r > 5) {
    return res.status(400).json({ success: false, message: 'Please provide a rating between 1 and 5.' });
  }
  if (req.body.feedbackText) req.body.feedbackText = sanitizeStr(req.body.feedbackText, 1000);
  next();
};

module.exports = {
  validateContact,
  validateNewsletter,
  validateSubmission,
  validateFeedback,
  sanitizeStr,
  EMAIL_REGEX,
  PHONE_REGEX,
};

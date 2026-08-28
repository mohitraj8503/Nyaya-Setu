const Contact = require('../models/Contact');

// @desc    Submit a new contact message
// @route   POST /api/contact
exports.createContact = async (req, res) => {
  try {
    const { name, email, field, message, agreedTerms } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name, email, and message.',
      });
    }

    const contact = await Contact.create({
      name,
      email,
      field: field || 'General Guidance Inquiry',
      message,
      agreedTerms: agreedTerms !== undefined ? agreedTerms : true,
      ipAddress: req.ip || req.connection.remoteAddress || '',
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been received by NyayaSetu.',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        field: contact.field,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting contact message.',
      error: error.message,
    });
  }
};

// @desc    Get all contact messages (with optional filter/pagination)
// @route   GET /api/contact
exports.getContacts = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const query = {};
    if (status) query.status = status;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      data: contacts,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contact messages.',
      error: error.message,
    });
  }
};

// @desc    Update contact status
// @route   PATCH /api/contact/:id
exports.updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(400).json({ success: false, message: 'Contact not found' });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error updating contact status',
      error: error.message,
    });
  }
};

// @desc    Delete a contact message by ID
// @route   DELETE /api/contact/:id
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.status(200).json({
      success: true,
      message: 'Contact message deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting contact message.',
      error: error.message,
    });
  }
};

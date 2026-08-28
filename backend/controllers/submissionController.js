const Submission = require('../models/Submission');
const Tracker = require('../models/Tracker');

// Category metadata and official mappings
const CATEGORY_MAP = {
  'Consumer Grievance & Refunds': {
    portal: {
      name: 'National Consumer Helpline (NCH 2.0) / INGRAM',
      url: 'https://consumerhelpline.gov.in/',
      helpline: '1915 or 1800-11-4000 (Toll Free) / SMS 8800001915',
    },
    defaultChecklist: [
      'Order confirmation / Invoice copy with GSTIN',
      'Transaction ID / Proof of payment (UPI / Card / NetBanking)',
      'Written email communications / Chat logs with seller/merchant',
      'Photographs or unboxing video of defective / undelivered product',
      'Formal notice / escalation request sent to company grievance officer'
    ]
  },
  'Public Infrastructure & Road Repair': {
    portal: {
      name: 'Centralized Public Grievance Redress and Monitoring System (CPGRAMS)',
      url: 'https://pgportal.gov.in/',
      helpline: '1800-11-0031 / Local Municipal Helpline',
    },
    defaultChecklist: [
      'High-resolution geotagged photographs of the pothole / damaged road / infrastructure',
      'Exact landmark, street name, ward number, and pincode',
      'Copy of previous complaint number / token given by local ward office (if any)',
      'Signature of locality residents / RWA letter (optional for higher priority)'
    ]
  },
  'Electricity & Utility Issues': {
    portal: {
      name: 'State Electricity Regulatory Commission / Electricity Consumer Ombudsman',
      url: 'https://pgportal.gov.in/',
      helpline: '1912 (National Power Emergency / Outage Helpline)',
    },
    defaultChecklist: [
      'Consumer Account Number (CA No. / Consumer ID) on bill',
      'Last 3 to 6 months electricity bill statements',
      'Payment receipts of disputed billing periods',
      'Previous written complaint / docket number lodged with local sub-station/junior engineer'
    ]
  },
  'Municipal Water Supply Problems': {
    portal: {
      name: 'Municipal Jal Board / Urban Development Authority Grievance Portal',
      url: 'https://pgportal.gov.in/',
      helpline: '1916 / Local Jal Board Toll-Free Helpline',
    },
    defaultChecklist: [
      'Consumer Water Connection K-Number / Consumer Number',
      'Photographs or video of water contamination or dry tap timing',
      'Latest paid water bill receipt',
      'Locality / Ward representative contact details'
    ]
  },
  'Scheme & Benefit Discovery': {
    portal: {
      name: 'myScheme – National Portal for Government Schemes',
      url: 'https://myscheme.gov.in/',
      helpline: '1800-11-5555 / 14443',
    },
    defaultChecklist: [
      'Aadhaar Card / Government Identity Proof',
      'Income Certificate issued by competent Revenue Authority (Tehsildar)',
      'Domicile / Residence Certificate of State',
      'Bank Account Passbook (Aadhaar linked for DBT benefits)',
      'Category / Caste Certificate (if applicable for specialized reservations)'
    ]
  },
  'Digital Payment & Banking Issues': {
    portal: {
      name: 'RBI Complaint Management System (CMS) – Banking Ombudsman',
      url: 'https://cms.rbi.org.in/',
      helpline: '14448 (RBI CMS Toll-Free Assistance) / 1930 (Cyber Fraud)',
    },
    defaultChecklist: [
      'Bank Account Statement highlighting disputed debits',
      'Unique UPI Transaction Reference ID (UTR / RRN number)',
      'Formal complaint lodged with issuer bank with 30-day TAT expiry proof',
      'Copy of SMS alert / Bank email notification received'
    ]
  },
  'Public Health & Hospital Guidance': {
    portal: {
      name: 'National Health Authority – Ayushman Bharat PM-JAY / CGHS Portal',
      url: 'https://pmjay.gov.in/',
      helpline: '14555 / 1800-111-565',
    },
    defaultChecklist: [
      'Ayushman Card / ABHA ID (Ayushman Bharat Health Account)',
      'Hospital Admission Slip / Medical Discharge Summary',
      'Prescriptions and diagnostic test receipts',
      'Grievance token if denied cashless treatment at empanelled hospital'
    ]
  },
  'Student & Education Guidance': {
    portal: {
      name: 'National Scholarship Portal (NSP) / AICTE / UGC Grievance Portal',
      url: 'https://scholarships.gov.in/',
      helpline: '0120-6619540 / NSP Helpdesk',
    },
    defaultChecklist: [
      'Institute Bonafide / Enrollment Certificate',
      'Previous Academic Marksheets & Passing Certificates',
      'Fee Receipt of current academic year',
      'Income Certificate & Category Certificate'
    ]
  },
  'Other Citizen Issue': {
    portal: {
      name: 'CPGRAMS Central Public Grievance Redressal Portal',
      url: 'https://pgportal.gov.in/',
      helpline: '1800-11-0031',
    },
    defaultChecklist: [
      'Detailed factual narrative of the grievance with timeline',
      'Government office / department correspondence records',
      'Identity and contact proof'
    ]
  }
};

// Generate formal complaint text draft
const generateDraftText = (data, portalInfo) => {
  const dateStr = new Date(data.incidentDate || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `TO,
THE COMPETENT GRIEVANCE OFFICER / NODAL AUTHORITY,
DEPARTMENT: ${data.opposingPartyOrDept || portalInfo.name}

SUBJECT: FORMAL GRIEVANCE REGARDING ${data.incidentTitle.toUpperCase()}
REFERENCE / ORDER NO: ${data.orderOrReferenceNumber || 'N/A'}
DATE OF OCCURRENCE: ${dateStr}
LOCATION: ${data.location?.city || 'Local Area'}, ${data.location?.state || 'India'} ${data.location?.pincode ? '- ' + data.location.pincode : ''}

Respected Officer,

I, ${data.citizenName || 'A Concerned Citizen'}, am submitting this formal grievance regarding an unresolved public service issue:

1. SUMMARY OF GRIEVANCE:
${data.incidentDescription}

2. PARTICULARS OF DISPUTE / OPPOSING ENTITY:
- Entity / Sub-division involved: ${data.opposingPartyOrDept || 'Noted Department'}
- Reference / Docket / Transaction ID: ${data.orderOrReferenceNumber || 'Attached in evidence'}
${data.claimedAmount ? `- Disputed / Claimed Amount: ₹${data.claimedAmount.toLocaleString('en-IN')}` : ''}

3. RELIEF SOUGHT:
I humbly request the concerned authority to take prompt administrative cognizance of this matter, initiate verification as per citizen charter guidelines, and grant expedited resolution.

All supporting evidence, receipts, and communication logs are kept ready for upload on the official ${portalInfo.name} portal (${portalInfo.url}).

Yours sincerely,
Name: ${data.citizenName || 'Citizen Applicant'}
Contact: ${data.citizenEmail || data.citizenPhone || 'On Record'}
Generated via NyayaSetu Guidance Engine [Ref: ${data.trackingCode}]`;
};

// Helper: Generate tracking code
const generateCode = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NS-${year}-${random}`;
};

// @desc    Create a citizen action submission / grievance draft
// @route   POST /api/submissions
exports.createSubmission = async (req, res) => {
  try {
    const {
      category,
      citizenName,
      citizenEmail,
      citizenPhone,
      location,
      incidentTitle,
      incidentDescription,
      incidentDate,
      opposingPartyOrDept,
      orderOrReferenceNumber,
      claimedAmount,
      customChecklist
    } = req.body;

    if (!incidentTitle || !incidentDescription) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an incident title and detailed description.',
      });
    }

    const selectedCategory = category || 'Consumer Grievance & Refunds';
    const categoryInfo = CATEGORY_MAP[selectedCategory] || CATEGORY_MAP['Other Citizen Issue'];
    const trackingCode = generateCode();

    const portal = categoryInfo.portal;
    const checklist = (customChecklist && customChecklist.length > 0)
      ? customChecklist
      : categoryInfo.defaultChecklist.map(item => ({ item, checked: false }));

    const submissionData = {
      trackingCode,
      category: selectedCategory,
      citizenName: citizenName || 'Anonymous Citizen',
      citizenEmail: citizenEmail || '',
      citizenPhone: citizenPhone || '',
      location: location || {},
      incidentTitle,
      incidentDescription,
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      opposingPartyOrDept: opposingPartyOrDept || '',
      orderOrReferenceNumber: orderOrReferenceNumber || '',
      claimedAmount: Number(claimedAmount) || 0,
      officialPortal: portal,
      checklist,
      status: 'Guidance Generated',
    };

    const draftText = generateDraftText(submissionData, portal);
    submissionData.generatedDraftText = draftText;

    const submission = await Submission.create(submissionData);

    // Also initialize a Tracker entry
    await Tracker.create({
      trackingCode,
      portalName: portal.name,
      portalRegistrationNumber: orderOrReferenceNumber || '',
      currentStage: 'Complaint Drafted',
      timeline: [
        {
          stage: 'Complaint Drafted',
          note: `Action plan generated on NyayaSetu for ${selectedCategory}. Direct official portal link prepared: ${portal.url}`,
          timestamp: new Date(),
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Citizen action plan & formal complaint draft generated successfully!',
      data: submission,
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating action plan.',
      error: error.message,
    });
  }
};

// @desc    Get all citizen submissions
// @route   GET /api/submissions
exports.getSubmissions = async (req, res) => {
  try {
    const { category, status, search, limit = 20, page = 1 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { trackingCode: { $regex: search, $options: 'i' } },
        { incidentTitle: { $regex: search, $options: 'i' } },
        { opposingPartyOrDept: { $regex: search, $options: 'i' } },
        { citizenName: { $regex: search, $options: 'i' } },
      ];
    }

    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Submission.countDocuments(query);

    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      data: submissions,
    });
  } catch (error) {
    console.error('Error getting submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching submissions',
      error: error.message,
    });
  }
};

// @desc    Get single submission by tracking code or ID
// @route   GET /api/submissions/:trackingCode
exports.getSubmissionByCode = async (req, res) => {
  try {
    const code = req.params.trackingCode.toUpperCase();
    const submission = await Submission.findOne({
      $or: [{ trackingCode: code }, { orderOrReferenceNumber: code }]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: `No record found for tracking code / reference number: ${req.params.trackingCode}`,
      });
    }

    const tracker = await Tracker.findOne({ trackingCode: submission.trackingCode });

    res.status(200).json({
      success: true,
      data: {
        submission,
        tracker,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching submission details',
      error: error.message,
    });
  }
};

// @desc    Update submission status or notes
// @route   PATCH /api/submissions/:trackingCode
exports.updateSubmission = async (req, res) => {
  try {
    const code = req.params.trackingCode.toUpperCase();
    const { status, note, checklist } = req.body;

    const updateFields = {};
    if (status) updateFields.status = status;
    if (checklist) updateFields.checklist = checklist;

    const submission = await Submission.findOneAndUpdate(
      { trackingCode: code },
      {
        $set: updateFields,
        ...(note ? { $push: { notes: { text: note, createdAt: new Date() } } } : {})
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (status || note) {
      await Tracker.findOneAndUpdate(
        { trackingCode: code },
        {
          ...(status ? { currentStage: status } : {}),
          $push: {
            timeline: {
              stage: status || 'Update Logged',
              note: note || `Status updated to ${status}`,
              timestamp: new Date(),
            }
          }
        }
      );
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error updating submission',
      error: error.message,
    });
  }
};

// @desc    Delete a submission by tracking code
// @route   DELETE /api/submissions/:trackingCode
exports.deleteSubmission = async (req, res) => {
  try {
    const code = req.params.trackingCode.toUpperCase();
    const submission = await Submission.findOneAndDelete({ trackingCode: code });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }
    // Also remove corresponding tracker
    await Tracker.findOneAndDelete({ trackingCode: code });

    res.status(200).json({
      success: true,
      message: `Submission ${code} and its tracker deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting submission.',
      error: error.message,
    });
  }
};

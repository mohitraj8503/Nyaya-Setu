/**
 * NyayaSetu Demo Data Seeder
 * Seeds sample grievance submissions, contacts, newsletter subscribers, and feedback
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Submission = require('./models/Submission');
const Contact = require('./models/Contact');
const Newsletter = require('./models/Newsletter');
const Feedback = require('./models/Feedback');
const Tracker = require('./models/Tracker');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nyayasetu';

const SAMPLE_SUBMISSIONS = [
  {
    trackingCode: 'NS-2024-DEMO1',
    category: 'Consumer Grievance & Refunds',
    citizenName: 'Rahul Sharma',
    citizenEmail: 'rahul.sharma@example.com',
    citizenPhone: '9876543210',
    location: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    incidentTitle: 'Defective product delivered by Flipkart, refund not processed',
    incidentDescription: 'I ordered a mobile phone worth ₹25,000 on Flipkart on 10th January 2024. The phone was delivered on 15th January but it was completely defective - the screen was cracked and the battery would not charge. I immediately raised a return request but the company has been delaying and not processing my refund for the past 45 days.',
    incidentDate: new Date('2024-01-15'),
    opposingPartyOrDept: 'Flipkart Internet Pvt Ltd',
    orderOrReferenceNumber: 'FK-ORD-2024-8734521',
    claimedAmount: 25000,
    officialPortal: {
      name: 'National Consumer Helpline (NCH 2.0) / INGRAM',
      url: 'https://consumerhelpline.gov.in/',
      helpline: '1915 or 1800-11-4000 (Toll Free) / SMS 8800001915',
    },
    checklist: [
      { item: 'Order confirmation / Invoice copy with GSTIN', checked: true },
      { item: 'Transaction ID / Proof of payment (UPI / Card / NetBanking)', checked: true },
      { item: 'Written email communications / Chat logs with seller/merchant', checked: false },
      { item: 'Photographs or unboxing video of defective / undelivered product', checked: true },
      { item: 'Formal notice / escalation request sent to company grievance officer', checked: false },
    ],
    generatedDraftText: 'TO,\nTHE COMPETENT GRIEVANCE OFFICER / NODAL AUTHORITY,\nDEPARTMENT: Flipkart Internet Pvt Ltd\n\nSUBJECT: FORMAL GRIEVANCE REGARDING DEFECTIVE PRODUCT DELIVERED BY FLIPKART, REFUND NOT PROCESSED\nREFERENCE / ORDER NO: FK-ORD-2024-8734521\nDATE OF OCCURRENCE: 15 January 2024\n\nRespected Officer,\n\nI, Rahul Sharma, am submitting this formal grievance regarding an unresolved consumer issue.\n\nI request immediate refund processing and resolution within 7 business days.\n\nYours sincerely,\nRahul Sharma\nGenerated via NyayaSetu Guidance Engine [Ref: NS-2024-DEMO1]',
    status: 'Guidance Generated',
  },
  {
    trackingCode: 'NS-2024-DEMO2',
    category: 'Public Infrastructure & Road Repair',
    citizenName: 'Priya Patel',
    citizenEmail: 'priya.patel@example.com',
    citizenPhone: '9123456780',
    location: { city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' },
    incidentTitle: 'Large pothole on Satellite Road causing accidents and vehicle damage',
    incidentDescription: 'There is a massive pothole approximately 4 feet wide and 1.5 feet deep on Satellite Main Road near Jodhpur Cross Road. It has been causing accidents for the past 3 months. Two motorcyclists were injured last week. Despite multiple complaints to the Municipal Corporation, no action has been taken.',
    incidentDate: new Date('2024-02-01'),
    opposingPartyOrDept: 'Ahmedabad Municipal Corporation - Road Division',
    orderOrReferenceNumber: 'AMC-COMP-2024-11293',
    claimedAmount: 0,
    officialPortal: {
      name: 'Centralized Public Grievance Redress and Monitoring System (CPGRAMS)',
      url: 'https://pgportal.gov.in/',
      helpline: '1800-11-0031 / Local Municipal Helpline',
    },
    checklist: [
      { item: 'High-resolution geotagged photographs of the pothole / damaged road', checked: true },
      { item: 'Exact landmark, street name, ward number, and pincode', checked: true },
      { item: 'Copy of previous complaint number / token given by local ward office', checked: true },
      { item: 'Signature of locality residents / RWA letter', checked: false },
    ],
    generatedDraftText: 'TO,\nTHE COMPETENT GRIEVANCE OFFICER,\nAhmedabad Municipal Corporation - Road Division\n\nSUBJECT: FORMAL GRIEVANCE REGARDING LARGE POTHOLE ON SATELLITE ROAD CAUSING ACCIDENTS\n\nRespected Officer,\n\nI, Priya Patel, am bringing to your attention a serious public safety hazard.\nImmediate road repair is requested.\n\nYours sincerely,\nPriya Patel\nGenerated via NyayaSetu [Ref: NS-2024-DEMO2]',
    status: 'Submitted to Portal',
  },
  {
    trackingCode: 'NS-2024-DEMO3',
    category: 'Digital Payment & Banking Issues',
    citizenName: 'Amit Kumar',
    citizenEmail: 'amit.kumar.delhi@example.com',
    citizenPhone: '9911223344',
    location: { city: 'New Delhi', state: 'Delhi', pincode: '110001' },
    incidentTitle: 'Unauthorized UPI transaction of ₹18,000 debited from SBI account',
    incidentDescription: 'On 5th March 2024, an unauthorized UPI transaction of ₹18,000 was debited from my State Bank of India savings account. I did not initiate this transaction and did not share any OTP or credentials with anyone. I immediately contacted SBI customer care but the issue remains unresolved after 30 days.',
    incidentDate: new Date('2024-03-05'),
    opposingPartyOrDept: 'State Bank of India - Digital Banking Division',
    orderOrReferenceNumber: 'UTR-SBI-2024-67890',
    claimedAmount: 18000,
    officialPortal: {
      name: 'RBI Complaint Management System (CMS) – Banking Ombudsman',
      url: 'https://cms.rbi.org.in/',
      helpline: '14448 (RBI CMS Toll-Free Assistance) / 1930 (Cyber Fraud)',
    },
    checklist: [
      { item: 'Bank Account Statement highlighting disputed debits', checked: true },
      { item: 'Unique UPI Transaction Reference ID (UTR / RRN number)', checked: true },
      { item: 'Formal complaint lodged with issuer bank with 30-day TAT expiry proof', checked: true },
      { item: 'Copy of SMS alert / Bank email notification received', checked: true },
    ],
    generatedDraftText: 'TO,\nTHE BANKING OMBUDSMAN,\nRBI Complaint Management System\n\nSUBJECT: FORMAL GRIEVANCE REGARDING UNAUTHORIZED UPI TRANSACTION OF ₹18,000\nREFERENCE: UTR-SBI-2024-67890\n\nI request immediate reversal of the fraudulent transaction and appropriate action.\n\nAmit Kumar\nGenerated via NyayaSetu [Ref: NS-2024-DEMO3]',
    status: 'Action Pending',
  },
];

const SAMPLE_CONTACTS = [
  {
    name: 'Sunita Devi',
    email: 'sunita.devi@example.com',
    field: 'Scheme & Benefit Discovery',
    message: 'I am a widow living in Rajasthan. I heard about the PM Ujjwala Yojana but do not know how to apply. I am from a BPL family. Can you please help me understand the process and what documents I need to collect for getting a free LPG connection?',
    agreedTerms: true,
    status: 'New',
  },
  {
    name: 'Rajan Mehta',
    email: 'rajan.mehta.surat@example.com',
    field: 'Student & Education Guidance',
    message: 'My daughter secured 92% in Class 12 and is from OBC category. We need guidance on scholarship applications. The National Scholarship Portal seems very complex and we are not sure which scholarship she is eligible for. Please guide us through the process.',
    agreedTerms: true,
    status: 'In Progress',
  },
];

const SAMPLE_SUBSCRIBERS = [
  { email: 'alert.citizen.india@example.com', sourcePage: 'Home Page Hero', active: true },
  { email: 'delhi.activist.group@example.com', sourcePage: 'Blog Page', active: true },
  { email: 'nyayasetu.watcher@example.com', sourcePage: 'Contact Page', active: true },
];

const SAMPLE_FEEDBACK = [
  {
    rating: 5,
    category: 'Consumer Grievance & Refunds',
    feedbackText: 'NyayaSetu generated an extremely professional complaint letter for my Flipkart refund issue. The legal language and official portal references were very helpful. Got my refund within 15 days of filing!',
    citizenRole: 'Working Professional',
    helpful: true,
  },
  {
    rating: 4,
    category: 'Digital Payment & Banking Issues',
    feedbackText: 'The step-by-step guidance for the RBI Banking Ombudsman complaint was excellent. Very easy to understand. Would love a Hindi language option in future.',
    citizenRole: 'Retired Government Employee',
    helpful: true,
  },
  {
    rating: 5,
    category: 'Public Infrastructure & Road Repair',
    feedbackText: 'Finally got the pothole outside my colony repaired after 3 months of inaction. Used NyayaSetu to draft a formal CPGRAMS complaint with proper geotagged evidence checklist.',
    citizenRole: 'Citizen User',
    helpful: true,
  },
];

async function seedDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ MongoDB connected!');

    // Clear existing demo records
    console.log('\n🗑️  Clearing previous demo records...');
    for (const code of SAMPLE_SUBMISSIONS.map(s => s.trackingCode)) {
      await Submission.deleteOne({ trackingCode: code });
      await Tracker.deleteOne({ trackingCode: code });
    }
    for (const email of SAMPLE_SUBSCRIBERS.map(s => s.email)) {
      await Newsletter.deleteOne({ email });
    }

    // Seed Submissions + Trackers
    console.log('\n📋 Seeding grievance submissions...');
    for (const sub of SAMPLE_SUBMISSIONS) {
      const created = await Submission.create(sub);
      await Tracker.create({
        trackingCode: sub.trackingCode,
        portalName: sub.officialPortal.name,
        portalRegistrationNumber: sub.orderOrReferenceNumber,
        currentStage: sub.status === 'Submitted to Portal' ? 'Lodged on Official Portal' : 'Complaint Drafted',
        timeline: [
          {
            stage: 'Complaint Drafted',
            note: `Initial action plan generated via NyayaSetu for ${sub.category}`,
            timestamp: sub.incidentDate,
          },
          ...(sub.status === 'Submitted to Portal' ? [{
            stage: 'Lodged on Official Portal',
            note: `Citizen filed complaint on ${sub.officialPortal.name}`,
            timestamp: new Date(sub.incidentDate.getTime() + 7 * 24 * 3600 * 1000),
          }] : []),
        ],
      });
      console.log(`  ✅ Seeded submission: ${sub.trackingCode} (${sub.citizenName})`);
    }

    // Seed Contacts
    console.log('\n✉️  Seeding contact inquiries...');
    for (const contact of SAMPLE_CONTACTS) {
      await Contact.create(contact);
      console.log(`  ✅ Seeded contact: ${contact.name}`);
    }

    // Seed Newsletter
    console.log('\n📬 Seeding newsletter subscribers...');
    for (const sub of SAMPLE_SUBSCRIBERS) {
      await Newsletter.create(sub);
      console.log(`  ✅ Seeded subscriber: ${sub.email}`);
    }

    // Seed Feedback
    console.log('\n⭐ Seeding feedback ratings...');
    for (const fb of SAMPLE_FEEDBACK) {
      await Feedback.create(fb);
      console.log(`  ✅ Seeded feedback: ${fb.rating}/5 – "${fb.feedbackText.substring(0, 50)}..."`);
    }

    // Summary
    const [submissions, contacts, subscribers, feedbackCount] = await Promise.all([
      Submission.countDocuments(),
      Contact.countDocuments(),
      Newsletter.countDocuments(),
      Feedback.countDocuments(),
    ]);

    console.log('\n🌱 Seed Complete! Database Summary:');
    console.log(`   📋 Total Submissions : ${submissions}`);
    console.log(`   ✉️  Total Contacts    : ${contacts}`);
    console.log(`   📬 Total Subscribers : ${subscribers}`);
    console.log(`   ⭐ Total Feedback    : ${feedbackCount}`);
    console.log('\n🚀 Open http://127.0.0.1:8080/admin.html to see the live data dashboard!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    console.log('\n⚠️  Is MongoDB running on port 27017?');
    console.log('   Start with: mongod --dbpath /data/db');
    process.exit(1);
  }
}

seedDatabase();

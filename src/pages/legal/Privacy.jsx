import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';
import { LEGAL as L } from './details.js';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This policy explains how <b>{L.company}</b> ("{L.brand}", "we") handles personal data when studios, their staff and their clients
        use {L.brand}. It is written to meet the Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information Technology Act,
        2000. Please also read our <Link to="/terms">Terms of Service</Link>.
      </p>

      <h2>1. Who is responsible</h2>
      <ul>
        <li><b>Studio account data</b> (owners and staff, billing details): we decide how this is used, so we are the Data Fiduciary.</li>
        <li>
          <b>Client data and photos</b> (couples, families, guests): the studio decides why it is collected and shared, so the studio is the Data
          Fiduciary and we process it on the studio's behalf. Questions about your photos should go to your photographer first; we will help them respond.
        </li>
      </ul>

      <h2>2. What we collect</h2>
      <ul>
        <li><b>Account details:</b> name, email, phone or WhatsApp number, password (stored only as a secure hash), role and studio.</li>
        <li><b>Billing details:</b> legal business name, GSTIN, address and invoice email. Card and bank details are entered on Razorpay's pages and are not stored by us.</li>
        <li><b>Studio content:</b> website text, logos, photos, videos, event names and dates, and enquiries sent through studio websites.</li>
        <li><b>Face data</b> (only when a studio turns face recognition on for an event): facial measurements derived from event photos, and a temporary selfie when you use "Find me".</li>
        <li><b>Usage and device data:</b> IP address, browser type, pages used, and security logs.</li>
        <li><b>Cookies:</b> one essential login cookie. We do not use advertising or tracking cookies.</li>
      </ul>

      <h2>3. Why we use it</h2>
      <ul>
        <li>to provide the Service: websites, galleries, downloads, enquiries and notifications;</li>
        <li>to verify sign-ups, keep accounts secure and prevent misuse;</li>
        <li>to bill subscriptions and issue GST invoices, and to meet tax and legal obligations;</li>
        <li>to send service messages (login details, "photos ready", trial and archive reminders). We do not send marketing without consent.</li>
      </ul>
      <p>We process data with your consent, to perform our contract with the studio, or where the law requires it. We do not sell personal data.</p>

      <h2>4. Face recognition</h2>
      <ul>
        <li>It is off unless the studio turns it on for an event, and clients are asked for consent before using it.</li>
        <li>Faces are grouped only within one event; they are never matched across events or studios, and never used to identify people for anyone else.</li>
        <li>Selfies used for "Find me" are processed to find matches and are not stored.</li>
        <li>Face data is deleted when the event is deleted, and a studio can switch the feature off at any time.</li>
      </ul>

      <h2>5. Who we share it with</h2>
      <ul>
        <li><b>Amazon Web Services</b> (Mumbai region): hosting, storage, email delivery and face recognition.</li>
        <li><b>Razorpay:</b> payment processing.</li>
        <li><b>WhatsApp (Meta):</b> service messages, if the studio enables them.</li>
        <li>Authorities, where required by law.</li>
      </ul>
      <p>These providers may only use the data to provide their service to us.</p>

      <h2>6. Where data is stored</h2>
      <p>Data is stored in India (AWS Mumbai). If a provider processes data outside India, it is only as permitted by Indian law.</p>

      <h2>7. How long we keep it</h2>
      <ul>
        <li>Galleries stay online for the period of the studio's plan, then are archived, and are deleted when the studio deletes them or its account ends.</li>
        <li>Face data: until the event is deleted or face recognition is switched off for it.</li>
        <li>Account data: while the account is active and for up to 30 days after it closes.</li>
        <li>Invoices and payment records: as long as tax law requires (currently 8 years).</li>
        <li>Unverified sign-ups are deleted within a day.</li>
      </ul>

      <h2>8. Security</h2>
      <p>
        We use encrypted connections (HTTPS), hashed passwords, private storage with time-limited download links, role-based access, and
        regular backups. No system is perfectly secure. If a data breach affects you, we will inform you and the Data Protection Board as the law requires.
      </p>

      <h2>9. Your rights</h2>
      <p>Under the DPDP Act you can:</p>
      <ul>
        <li>ask for a summary of the personal data we hold about you and how it is used;</li>
        <li>ask us to correct, complete or erase it;</li>
        <li>withdraw consent at any time (this does not affect processing already done);</li>
        <li>nominate someone to exercise these rights if you die or become unable to;</li>
        <li>raise a grievance with us, and if not resolved, complain to the Data Protection Board of India.</li>
      </ul>
      <p>Clients should first contact their studio about their photos. You can also write to us and we will help.</p>

      <h2>10. Children</h2>
      <p>
        The Service is for adults. Wedding photos may show children; studios are responsible for any consent needed from a parent or guardian.
        We do not knowingly create accounts for children.
      </p>

      <h2>11. Changes</h2>
      <p>If we make significant changes, we will tell you in the app or by email and, where needed, ask for your consent again.</p>

      <h2>12. Contact and Grievance Officer</h2>
      <p>
        {L.company}, {L.address}. Email: {L.supportEmail}.<br />
        Grievance Officer: {L.grievanceOfficer}, {L.grievanceEmail}. We acknowledge complaints within 24 hours and aim to resolve them within 15 days.
      </p>
    </LegalLayout>
  );
}

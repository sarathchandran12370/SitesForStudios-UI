import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';
import { LEGAL as L } from './details.js';

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These terms are an agreement between <b>{L.company}</b> ("{L.brand}", "we", "us"), {L.address}, and the business or person that
        creates an account ("you", the "Studio"). They also apply to people the Studio invites, such as staff and clients. By creating an
        account, ticking the box at sign-up, or using {L.brand}, you agree to these terms and to our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. The service</h2>
      <p>
        {L.brand} provides wedding studios with a website builder, an enquiry inbox, online photo galleries for their clients, photo
        downloads, optional face recognition, and related tools (the "Service"). Features and limits depend on the plan you choose.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must be at least 18 and able to enter a contract under Indian law. If you sign up for a business, you confirm you may bind it.</li>
        <li>Keep login details confidential. You are responsible for activity on your account and the accounts you create for staff and clients.</li>
        <li>Studios create client accounts. Clients cannot sign up by themselves. Tell us at once if you suspect unauthorised use.</li>
      </ul>

      <h2>3. Your content and your clients</h2>
      <ul>
        <li>You (and your clients, as agreed between you) own the photos, videos and text you upload ("Content"). We claim no ownership.</li>
        <li>You give us a limited licence to store, copy, resize, display and deliver Content only to run the Service for you.</li>
        <li>
          You confirm you have the rights and permissions needed to upload Content and to share it with the people you invite, including
          consent from people who appear in photos where the law requires it.
        </li>
        <li>
          For your clients' personal data, you decide why and how it is processed and we process it on your behalf. You are responsible for
          informing your clients and obtaining any consent required by the Digital Personal Data Protection Act, 2023 and other law.
        </li>
      </ul>

      <h2>4. Face recognition</h2>
      <p>
        Face recognition is optional and can be switched off for each event. When it is on, faces in event photos are analysed to group
        photos by person and to let a client find their photos with a selfie. Selfies are not stored. Face data is used only within that event
        and is deleted when the event is deleted. You must only enable it where you have a lawful basis, and clients are asked for consent
        before they use it.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You will not use the Service to:</p>
      <ul>
        <li>upload content that is unlawful, infringing, obscene, or that you do not have the right to share;</li>
        <li>harass, spam, or collect personal data of others without permission;</li>
        <li>break, probe or overload the Service, get around limits, or access other customers' data;</li>
        <li>resell or provide the Service to third parties except as part of your own studio business.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules, and will tell you why unless the law prevents it.</p>

      <h2>6. Plans, trials and payment</h2>
      <ul>
        <li>New accounts may get a free trial. When it ends, the dashboard becomes read-only until you choose a plan, and websites and galleries stay online for a grace period before the account is suspended.</li>
        <li>Paid plans are billed monthly or yearly in advance through Razorpay and renew automatically until cancelled. Prices are shown before you pay, with GST added where applicable. We issue a GST invoice for each payment.</li>
        <li>You can cancel at any time. Cancellation takes effect at the end of the paid period. Except where the law requires otherwise, payments are not refundable for partial periods.</li>
        <li>Upgrades apply immediately and downgrades from the next period. Add-ons, such as extra storage, are charged as shown when you request them.</li>
        <li>If a renewal fails, your account becomes past due. If payment is not made, we may suspend the account.</li>
        <li>We may change prices with at least 30 days' notice. Changes apply from your next renewal.</li>
      </ul>

      <h2>7. Storage</h2>
      <p>
        Each plan includes a storage limit. Galleries stay online while the Studio's subscription is active; when the limit is reached,
        the Studio can delete old events or move to a bigger plan. Please keep your own copies of important files. The Service is not a backup.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        We work to keep the Service available and secure but do not promise it will be uninterrupted or error-free. We may improve or change
        features. If we remove a major feature you pay for, we will tell you in advance.
      </p>

      <h2>9. Ending the agreement</h2>
      <ul>
        <li>You can stop using the Service and cancel your plan at any time.</li>
        <li>We may suspend or end your account for serious or repeated breach of these terms, non-payment, or where the law requires.</li>
        <li>After your account ends, you have 30 days to ask us for a copy of your Content. After that we may delete it, except where we must keep data by law (for example, invoices).</li>
      </ul>

      <h2>10. Liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses, or for loss of profits, business or goodwill.
        Our total liability for any claim relating to the Service is limited to the fees you paid us in the 12 months before the claim.
        Nothing in these terms limits liability that cannot be limited under Indian law.
      </p>

      <h2>11. Indemnity</h2>
      <p>You will compensate us for claims by third parties arising from Content you upload or your breach of these terms.</p>

      <h2>12. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of India. The courts at {L.jurisdictionCity} have exclusive jurisdiction, subject to any rights
        you have under consumer protection law.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms. If changes are significant, we will tell you by email or in the app and ask you to accept the new version
        before you continue using the Service.
      </p>

      <h2>14. Contact and grievances</h2>
      <p>
        Questions: {L.supportEmail}. Grievance Officer: {L.grievanceOfficer}, {L.grievanceEmail}. We acknowledge complaints within 24 hours
        and aim to resolve them within 15 days.
      </p>
    </LegalLayout>
  );
}

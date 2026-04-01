import LegalPage from "../../components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="April 1, 2026">
      <p>
        This Privacy Policy explains how LEOTEOR LLC (“LEOTEOR”, “we”, “us”)
        collects, uses, and protects information when you use the LEOTEOR
        Telecom Marketplace (the “Platform”).
      </p>

      <h2>1. Information We Collect</h2>
      <p>We may collect:</p>
      <ul>
        <li>account information such as name, email, phone, and company name</li>
        <li>role information such as customer or contractor</li>
        <li>company and compliance data</li>
        <li>job postings, bids, approvals, and workflow data</li>
        <li>subscription and billing status</li>
        <li>technical usage information such as IP address and browser data</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>We use data to:</p>
      <ul>
        <li>operate the Platform</li>
        <li>enable role-based access and workflows</li>
        <li>support job posting and bidding</li>
        <li>review compliance documents and approvals</li>
        <li>process subscriptions and billing</li>
        <li>prevent fraud and platform abuse</li>
        <li>improve platform functionality</li>
      </ul>

      <h2>3. Contractor Compliance Data</h2>
      <p>
        If you use the Platform as a contractor, uploaded COI, insurance,
        certification, and related files may be reviewed by admins and used to
        determine eligibility for jobs or other Platform features.
      </p>

      <h2>4. Sharing of Information</h2>
      <p>We may share information:</p>
      <ul>
        <li>with service providers such as hosting, storage, and payments vendors</li>
        <li>between users where required for marketplace operation</li>
        <li>when required by law or necessary to protect rights and safety</li>
      </ul>

      <h2>5. Payments</h2>
      <p>
        Payment processing may be handled by third-party providers such as
        Stripe. We do not store full payment card details on our servers unless
        explicitly stated otherwise.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain data while accounts remain active and as needed for legal,
        operational, security, compliance, and recordkeeping purposes.
      </p>

      <h2>7. Security</h2>
      <p>
        We use reasonable administrative, technical, and organizational measures
        to protect Platform data. However, no system is completely secure.
      </p>

      <h2>8. Your Rights</h2>
      <p>
        Depending on your location, you may have rights to request access,
        correction, deletion, or restriction of certain personal data.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. Continued use of
        the Platform after updates means acceptance of the revised version.
      </p>

      <h2>10. Contact</h2>
      <p>
        LEOTEOR LLC
        <br />
        1025 E Hallandale Beach Blvd, Hallandale Beach, FL 33009
        <br />
        legal@leoteor.com
      </p>
    </LegalPage>
  );
}
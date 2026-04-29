import { LegalLayout } from './LegalLayout';
import styles from './LegalLayout.module.css';

export function PrivacyPage() {
  return (
    <LegalLayout>
      <h1>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: 29 April 2026</p>

      <p>ShelfGeek ("we", "us", "our") operates shelfgeek.com. This policy explains what information we collect, how we use it, and your rights.</p>

      <h2>Information we collect</h2>
      <p>When you sign in, we receive basic profile information from your identity provider (name, email address, and profile picture). We store only what is necessary to identify your account.</p>
      <p>When you use the app, we store the data you enter: game names, box dimensions, shelf configurations, and any notes you add.</p>
      <p>We do not collect payment information. We do not run advertising. We do not sell your data.</p>

      <h2>How we use your information</h2>
      <ul>
        <li>To create and maintain your account</li>
        <li>To store and display your game collection</li>
        <li>To improve the service</li>
      </ul>

      <h2>Data storage</h2>
      <p>Your data is stored using <a href="https://supabase.com" target="_blank" rel="noreferrer">Supabase</a>, a managed database platform. Data is held in the EU West region. Supabase's own privacy policy applies to data processed on their infrastructure.</p>

      <h2>Third-party sign-in providers</h2>
      <p>We support sign-in via GitHub and Google. When you authenticate through these providers, their privacy policies govern how they handle your credentials. We only receive the profile information they make available to us.</p>

      <h2>Data retention</h2>
      <p>Your account and collection data are retained for as long as your account is active. You can request deletion of your account and all associated data at any time by contacting us.</p>

      <h2>Your rights</h2>
      <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at the address below.</p>

      <h2>Contact</h2>
      <p>Questions about this policy? Email us at <a href="mailto:hello@shelfgeek.com">hello@shelfgeek.com</a>.</p>
    </LegalLayout>
  );
}

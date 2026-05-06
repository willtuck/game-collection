import { LegalLayout } from './LegalLayout';
import styles from './LegalLayout.module.css';

export function TermsPage() {
  return (
    <LegalLayout>
      <h1>Terms of Service</h1>
      <p className={styles.updated}>Last updated: 29 April 2026</p>

      <p>By using ShelfGeek at shelfgeek.com ("the Service"), you agree to these terms. Please read them.</p>

      <h2>Using ShelfGeek</h2>
      <p>You may use the Service for personal, non-commercial purposes. You must not use it to violate any laws or the rights of others.</p>
      <p>You are responsible for keeping your account credentials secure. Notify us immediately if you suspect unauthorized access to your account.</p>

      <h2>Your content</h2>
      <p>You own the data you enter into ShelfGeek — your game collection, shelf configurations, and notes. By using the Service, you grant us a limited license to store and display that data to you.</p>
      <p>We do not claim ownership of your content and will not use it for any purpose beyond operating the Service.</p>

      <h2>Service availability</h2>
      <p>We aim to keep ShelfGeek available and working, but we cannot guarantee uninterrupted access. The Service is provided as-is, and we may modify or discontinue features at any time.</p>

      <h2>Disclaimer of warranties</h2>
      <p>The Service is provided "as is" without warranties of any kind, express or implied. We do not warrant that the Service will be error-free or that data will never be lost.</p>

      <h2>Limitation of liability</h2>
      <p>To the fullest extent permitted by law, ShelfGeek shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised terms. We will update the "Last updated" date at the top of this page when changes are made.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of England and Wales.</p>

      <h2>Contact</h2>
      <p>Questions about these terms? Email us at <a href="mailto:hello@shelfgeek.com">hello@shelfgeek.com</a>.</p>
    </LegalLayout>
  );
}

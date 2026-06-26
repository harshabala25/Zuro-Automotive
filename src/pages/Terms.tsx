import React from "react";
import Navbar from '../pages/Navbar';
import BottomBar from '../pages/BottomBar';

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  backgroundColor: "#000",
  color: "#ffffff",
  padding: "48px 24px",
  boxSizing: "border-box",
};

const innerStyle: React.CSSProperties = {
  maxWidth: "720px",
  width: "100%",
  margin: "0 auto",
};

const TermsOfService: React.FC = () => {
  return (
    <>
      <Navbar />
      <div style={containerStyle}>
        <div style={innerStyle}>
          {/* Header */}
          <header style={{ marginBottom: "40px" }}>
            <h1 style={{ fontSize: "40px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
              Terms of Service
            </h1>
            <p style={{ fontSize: "14px", color: "#ffffff", marginTop: "12px" }}>
              Last updated: May 2026
            </p>
          </header>

          {/* Intro */}
          <section style={{ marginBottom: "40px" }}>
            <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#ffffff" }}>
              Welcome to <strong>Zuro Automotive</strong>. By using our platform, you agree to the following terms.
            </p>
          </section>

          <Divider />

          <Section title="1. Use of the Platform">
            <ul style={{ paddingLeft: "20px" }}>
              <li>You must be at least 18 years old to use Zuro</li>
              <li>You agree to provide accurate and truthful information</li>
              <li>You are responsible for your account and activity</li>
            </ul>
          </Section>

          <Section title="2. Marketplace Role">
            <p>Zuro is a platform that connects buyers and sellers. We are not a dealership or broker, and we do not own or sell any vehicles listed on the platform. All transactions occur directly between users.</p>
          </Section>

          <Section title="3. Listings & Content">
            <ul style={{ paddingLeft: "20px" }}>
              <li>You are responsible for the content you post</li>
              <li>Listings must be accurate and not misleading</li>
              <li>We may remove listings that violate our policies</li>
            </ul>
          </Section>

          <Section title="4. Prohibited Activities">
            <ul style={{ paddingLeft: "20px" }}>
              <li>Fraud, scams, or deceptive behavior</li>
              <li>Posting false or misleading listings</li>
              <li>Using the platform for illegal purposes</li>
              <li>Attempting to disrupt or abuse the platform</li>
            </ul>
          </Section>

          <Section title="5. Disclaimer">
            <p>Zuro is provided "as is" without warranties of any kind. We do not guarantee the accuracy of listings or uninterrupted access to the platform.</p>
          </Section>

          <Section title="6. Limitation of Liability">
            <p>Zuro is not responsible for any damages, losses, or disputes that occur between users as a result of transactions on the platform.</p>
          </Section>

          <Section title="7. Changes to These Terms">
            <p>We may update these Terms at any time. Continued use of the platform means you accept any updates.</p>
          </Section>

          <Section title="8. CarFax Reports">
            <p>
            To help protect buyers from fraudulent listings, Sellers must upload a CARFAX® vehicle history report as part of their listing. This report is purchased and obtained solely by the Seller, under the Seller's own individual CARFAX account, and remains subject to CARFAX's terms of service and licensing restrictions. By uploading a CARFAX report, the Seller represents that they have the right to share that report through the Platform and agrees to comply with CARFAX's terms regarding use, sharing, and redistribution of the report. Zuro Automotive does not purchase, generate, verify, or independently confirm the contents of any CARFAX report, and is not a party to any agreement between the Seller and CARFAX®. Zuro Automotive makes no representations or warranties as to the accuracy, completeness, or authorized use of any CARFAX report displayed on the Platform. Sellers are solely responsible for ensuring their use of the CARFAX report complies with CARFAX's licensing terms, and agree to indemnify and hold Zuro Automotive harmless from any claims arising from a Seller's unauthorized use or sharing of such reports.
            </p>
          </Section>

          {/* Footer note */}
          <p style={{ fontSize: "12px", color: "#ffffff", marginTop: "48px" }}>
            This is a developing platform. Terms may evolve as Zuro grows.
          </p>
        </div>
      </div>
      <BottomBar />
    </>
  );
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <section style={{ marginBottom: "36px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>{title}</h2>
      <div style={{ fontSize: "16px", color: "#ffffff", lineHeight: 1.6 }}>{children}</div>
    </section>
  );
};

const Divider: React.FC = () => {
  return <div style={{ width: "100%", height: "1px", backgroundColor: "#e5e7eb", margin: "40px 0" }} />;
};

export default TermsOfService;
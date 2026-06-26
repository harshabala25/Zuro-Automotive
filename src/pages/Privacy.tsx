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

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <Navbar />
      <div style={containerStyle}>
        <div style={innerStyle}>
          {/* Header */}
          <header style={{ marginBottom: "40px" }}>
            <h1 style={{ fontSize: "40px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
              Privacy Policy
            </h1>
            <p style={{ fontSize: "14px", color: "#aaa", marginTop: "12px" }}>
              Last updated: May 2026
            </p>
          </header>

          {/* Intro */}
          <section style={{ marginBottom: "40px" }}>
            <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#ffffff" }}>
              At <strong>Zuro Automotive</strong>, we respect your privacy. This Privacy
              Policy explains what information we collect, how we use it, and
              how we protect it.
            </p>
          </section>

          <Divider />

          <Section title="1. Information We Collect">
            <p style={{ marginBottom: "12px" }}>We may collect the following types of information:</p>
            <ul style={{ paddingLeft: "20px" }}>
              <li><strong>Account Information:</strong> name, email, and login details</li>
              <li><strong>Listing Information:</strong> vehicle details, photos, pricing, and descriptions</li>
              <li><strong>Usage Data:</strong> how you interact with our platform</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul style={{ paddingLeft: "20px" }}>
              <li>To operate and improve the platform</li>
              <li>To allow users to create and manage listings</li>
              <li>To communicate with you about your account or activity</li>
              <li>To maintain safety and prevent fraud</li>
            </ul>
          </Section>

          <Section title="3. Sharing of Information">
            <p>We do not sell your personal information. We may share information only in the following cases:</p>
            <ul style={{ paddingLeft: "20px", marginTop: "12px" }}>
              <li>With other users (e.g., listing details)</li>
              <li>To comply with legal obligations</li>
              <li>To protect the rights and safety of Zuro and its users</li>
            </ul>
          </Section>

          <Section title="4. Data Security">
            <p>We take reasonable measures to protect your information, but no system is completely secure.</p>
          </Section>

          <Section title="5. Your Choices">
            <ul style={{ paddingLeft: "20px" }}>
              <li>You can update or delete your account information</li>
              <li>You can choose not to provide certain information</li>
            </ul>
          </Section>

          <Section title="6. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Continued use of the platform means you accept the updated policy.</p>
          </Section>

          {/* Footer note */}
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "48px" }}>
            This policy may evolve as Zuro grows and new features are added.
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

export default PrivacyPolicy;
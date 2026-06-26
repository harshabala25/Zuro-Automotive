'use client';

import { useEffect, useRef } from "react";
import BottomBar from '../pages/BottomBar';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play();
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', fontFamily: "'Arial Black', Arial, sans-serif", margin: 0, padding: 0 }}>

      <style>{`
        @keyframes zoomIn {
          from { transform: scale(1); }
          to   { transform: scale(1.1); }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 60px',
        backgroundColor: '#01a3fc',
      }}>
        <img src="/ZuroLogBlue.png" alt="Zuro" style={{ height: 24 }} />
        <div style={{ display: 'flex', gap: 40 }}>
          <a href="/login" style={{ color: '#000', textDecoration: 'none', fontWeight: 900, fontSize: 15, letterSpacing: 1 }}>LOGIN</a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{
        minHeight: '100vh',
        backgroundColor: '#01a3fc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 20px',
      }}>
        <h1 style={{
          fontSize: 'clamp(48px, 10vw, 70px)',
          fontWeight: 700,
          color: '#000',
          margin: '0 0 16px',
          letterSpacing: '-2px',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}>
          ZURO AUTOMOTIVE
        </h1>
        <p style={{ fontSize: 18, color: '#000', marginBottom: 40, fontWeight: 400, letterSpacing: 1 }}>
          Modern Car Buying Simplified
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/buy" style={{
            padding: '14px 32px',
            border: '2.5px solid #000',
            color: '#000',
            textDecoration: 'none',
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: 2,
            borderRadius: 4,
            transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={e => { (e.target as HTMLAnchorElement).style.backgroundColor = '#000'; (e.target as HTMLAnchorElement).style.color = '#00aaff' }}
            onMouseLeave={e => { (e.target as HTMLAnchorElement).style.backgroundColor = 'transparent'; (e.target as HTMLAnchorElement).style.color = '#000' }}
          >
            BUY CAR
          </a>
          <a href="/sell" style={{
            padding: '14px 32px',
            border: '2.5px solid #000',
            color: '#000',
            textDecoration: 'none',
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: 2,
            borderRadius: 4,
            transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={e => { (e.target as HTMLAnchorElement).style.backgroundColor = '#000'; (e.target as HTMLAnchorElement).style.color = '#01a3fc' }}
            onMouseLeave={e => { (e.target as HTMLAnchorElement).style.backgroundColor = 'transparent'; (e.target as HTMLAnchorElement).style.color = '#000' }}
          >
            SELL CAR
          </a>
        </div>
      </section>

      {/* SECTION 1 — BUILT FOR EVERYONE — IMAGE BACKGROUND */}
      <section style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
      }}>

        {/* BACKGROUND IMAGE WITH ZOOM */}
        <img
          src="/Section1.jpg"
          alt=""
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            animation: 'zoomIn 8s ease-in-out infinite alternate',
          }}
        />

        {/* DARK OVERLAY */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          zIndex: 1,
        }} />

        {/* TEXT CONTENT */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ color: '#00aaff', fontSize: 13, letterSpacing: 4, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase' }}>Why Choose Us</p>
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 80px)', fontWeight: 900, color: '#fff', margin: '0 0 24px', textTransform: 'uppercase', letterSpacing: '-1px' }}>
            BUILT FOR<br />EVERYONE
          </h2>
          <p style={{ fontSize: 18, color: '#fff', maxWidth: 560, lineHeight: 1.7, fontFamily: 'system-ui, sans-serif', fontWeight: 400, opacity: 0.85, margin: '0 auto', textAlign: 'center' }}>
            Zuro is dead simple —
            find the car you want, contact the seller, done. Whether you're buying your first
            car or your tenth, it works everytime. We got just about every car from 2000 to today, and we're adding more every day.
          </p>
          <div style={{ marginTop: 48, width: 2, height: 60, backgroundColor: '#01a3fc', opacity: 0.5, margin: '48px auto 0' }} />
        </div>

      </section>

      {/* SECTION 2 — MORE INFO LESS GUESSING — VIDEO BACKGROUND */}
      <section style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
      }}>

        {/* BACKGROUND VIDEO */}
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src="/CAMRY_FINAL.mp4" type="video/mp4" />
        </video>

        {/* DARK OVERLAY */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1,
        }} />

        {/* TEXT CONTENT */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ color: '#01a3fc', fontSize: 13, letterSpacing: 4, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase' }}>Every Detail Matters</p>
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 80px)', fontWeight: 900, color: '#fff', margin: '0 0 24px', textTransform: 'uppercase', letterSpacing: '-1px' }}>
            MORE INFO<br />LESS GUESSING
          </h2>
          <p style={{ fontSize: 18, color: '#fff', maxWidth: 560, lineHeight: 1.7, fontFamily: 'system-ui, sans-serif', fontWeight: 400, opacity: 0.85, margin: '0 auto', textAlign: 'center' }}>
           Whether you're looking for a reliable daily driver with great gas mileage or a fun ride with the perfect factory specs, Zuro gives you the everything you need to buy with confidence, 
           fuel efficiency to clean histories to exact drivetrain details and modifications.
          </p>
          <div style={{ marginTop: 48, width: 2, height: 60, backgroundColor: '#01a3fc', opacity: 0.5, margin: '48px auto 0' }} />
        </div>

      </section>

      {/* SECTION 3 — BUILT BY THE RIGHT PEOPLE — IMAGE BACKGROUND */}
      <section style={{
        minHeight: '120vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
      }}>

        {/* BACKGROUND IMAGE WITH ZOOM */}
        <img
          src="/Section3Actual.jpg"
          alt=""
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            animation: 'zoomIn 8s ease-in-out infinite alternate',
          }}
        />

        {/* DARK OVERLAY */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          zIndex: 1,
        }} />

        {/* TEXT CONTENT */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ color: '#01a3fc', fontSize: 13, letterSpacing: 4, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase' }}>More Than Just a Marketplace</p>
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 80px)', fontWeight: 900, color: '#fff', margin: '0 0 24px', textTransform: 'uppercase', letterSpacing: '-1px' }}>
            BUILT BY THE<br />RIGHT PEOPLE
          </h2>
          <p style={{ fontSize: 18, color: '#fff', maxWidth: 560, lineHeight: 1.7, fontFamily: 'system-ui, sans-serif', fontWeight: 400, opacity: 0.85, margin: '0 auto', textAlign: 'center' }}>
            Zuro is built by car people — so whether you know every spec or just want a reliable ride, you're in the right place.
            With 100,000+ views across our social platforms, we know what we're talking about.
          </p>
          <div style={{ marginTop: 48, width: 2, height: 60, backgroundColor: '#01a3fc', opacity: 0.5, margin: '48px auto 0' }} />
        </div>
      </section>
      <BottomBar />  
    </div>
  );
}
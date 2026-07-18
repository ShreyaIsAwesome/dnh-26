import { useState } from 'react';
import AuthModal from '../components/AuthModal';
import './LandingPage.css';

type ModalMode = 'login' | 'signup' | null;

export default function LandingPage() {
  const [modal, setModal] = useState<ModalMode>(null);

  return (
    <div className="landing-wrapper">
      {/* Blurred bokeh background */}
      <div className="bg-image" aria-hidden="true" />
      <div className="bg-darken" aria-hidden="true" />

      <div className="landing-content">
        {/* ── Left Side ── */}
        <div className="landing-left">
          <h1 className="brand-title">OperON</h1>
          <p className="brand-tagline">
            HELPING SMALL BUSINESSES
            <br />
            REACH BIGGER GOALS
          </p>
        </div>

        {/* ── Right Side Card ── */}
        <div className="landing-right">
          <div className="info-card">
            <div className="card-actions">
              <button className="btn-pill" onClick={() => setModal('signup')}>SIGN UP</button>
              <button className="btn-pill" onClick={() => setModal('login')}>LOGIN</button>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSwitchMode={(m) => setModal(m)}
        />
      )}
    </div>
  );
}

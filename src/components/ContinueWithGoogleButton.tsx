import GoogleLogo from 'assets/google-g-logo.svg';

export default function ContinueWithGoogleButton() {
  return (
    <button type="button" className="btn btn-light border w-100">
      <img
        src={GoogleLogo}
        alt="Google Logo"
        className="me-3"
        style={{maxHeight: '1.2em', verticalAlign: 'middle'}}
      />
      <span style={{verticalAlign: 'middle'}}>Continue with Google</span>
    </button>
  );
};

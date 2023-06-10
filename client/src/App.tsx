import Container from 'react-bootstrap/Container';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import {
  BrowserRouter,
  Link,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import './App.scss';
import './custom.css';
import 'common/common.css';
// Make sure to use JSX camelCase style in the SVG file
// See https://stackoverflow.com/a/61167146
import Logo from 'assets/cabbage';
import { useAppSelector } from 'app/hooks';
import DayPicker from 'components/DayPicker/DayPicker';
import ForgotPassword from 'components/ForgotPassword';
import HistoryProvider from 'components/HistoryProvider';
import HowItWorksPage from 'components/HowItWorksPage';
import Login from 'components/Login';
import Signup from 'components/Signup';
import Meeting from 'components/availabilities/Meeting';
import Profile from 'components/Profile';
import Settings from 'components/Settings';
import { selectTokenIsPresent } from 'slices/authentication';
import { useState } from 'react';
import { useExtractTokenFromQueryParams, useGetSelfInfoIfTokenIsPresent } from 'utils/auth.hooks';
import ErrorPage from 'components/ErrorPage';
import ConfirmLinkExternalCalendar from 'components/ConfirmLinkExternalCalendar';
import ConfirmPasswordReset from 'components/ConfirmPasswordReset';
import { BottomOverlayFiller } from 'components/BottomOverlay';
import VerifyEmail from 'components/VerifyEmail';
import Privacy from 'components/Privacy';
import Feedback from 'components/Feedback';
import TermsOfService from 'components/TermsOfService';
import { useGetServerInfoQuery } from 'slices/api';

export default function App() {
  // Make sure that every single component passed to a <Route>
  // sets the document.title
  const dayPicker = <DayPicker />;
  return (
    <BrowserRouter>
      <HistoryProvider>
        <Routes>
          <Route path="/" element={<AppRoot />}>
            <Route index element={dayPicker} />
            <Route path="create" element={dayPicker} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="terms-of-service" element={<TermsOfService />} />
            <Route path="m/:id" element={<Meeting />} />
            <Route path="signup" element={<Signup />} />
            <Route path="login" element={<Login />} />
            <Route path="confirm-link-google-account" element={<ConfirmLinkExternalCalendar provider="google" />} />
            <Route path="confirm-link-microsoft-account" element={<ConfirmLinkExternalCalendar provider="microsoft" />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="confirm-password-reset" element={<ConfirmPasswordReset />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="error" element={<ErrorPage />} />
            <Route path="me">
              <Route index element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            {/* TODO: use custom 404 page */}
            <Route path="*" element={<h3>Page not found</h3>} />
          </Route>
        </Routes>
      </HistoryProvider>
    </BrowserRouter>
  );
}

function BrandWithLogo({onClick}: {onClick: () => void}) {
  return (
    <LinkContainer to="/" onClick={onClick}>
      <Navbar.Brand>
        <div className="d-inline-block me-1" style={{
          height: '1.5em',
          width: '1.5em',
          // There's a bit of empty space at the top of the image
          position: 'relative',
          top: '-0.1em',
        }}>
          <Logo />
        </div>
        CabbageMeet
      </Navbar.Brand>
    </LinkContainer>
  );
}

function AppRoot() {
  // Eager fetching: these data will be needed later by other parts of the app,
  // so load them now.
  useGetSelfInfoIfTokenIsPresent();
  useGetServerInfoQuery();

  const [showToggle, setShowToggle] = useState(false);
  const tokenIsInURL = useExtractTokenFromQueryParams();
  if (tokenIsInURL) {
    // Don't make any requests yet until the token has been saved into
    // LocalStorage and stored in the Redux slice.
    // Otherwise the requests will be prematurely unauthenticated.
    return null;
  }
  const onClickToggle = () => setShowToggle(true);
  const onHideToggle = () => setShowToggle(false);
  return (
    <div className="App d-flex flex-column">
      <Navbar expand="md" className="mt-3 mb-5">
        <Container className="app-main-container custom-navbar-container">
          <BrandWithLogo onClick={onHideToggle} />
          <Navbar.Toggle
            aria-controls="app-navbar-nav"
            className="custom-navbar-toggle"
            onClick={onClickToggle}
          />
          <Navbar.Offcanvas
            id="app-navbar-nav"
            aria-labelledby="app-navbar-offcanvas-label"
            placement="start"
            onHide={onHideToggle}
            show={showToggle}
          >
            <Offcanvas.Header closeButton className="mt-3">
              <Offcanvas.Title id="app-navbar-offcanvas-label" className="fs-4">
                <BrandWithLogo onClick={onHideToggle} />
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <div className="px-3"><hr className="mt-0 mb-4" /></div>
              <Nav className="ms-auto">
                <HeaderLinks onClick={onHideToggle} />
              </Nav>
            </Offcanvas.Body>
          </Navbar.Offcanvas>
        </Container>
      </Navbar>
      <main className="container app-main-container flex-grow-1 d-flex flex-column">
        <Outlet />
      </main>
      <Footer />
      <BottomOverlayFiller />
    </div>
  );
}

function HeaderLinks({onClick}: {onClick: () => void}) {
  // assume that user info will be successfully fetched if token is present (optimistic)
  const isOrWillBeLoggedIn = useAppSelector(selectTokenIsPresent);
  const links = [{to: '/', desc: 'Meet'}];
  if (isOrWillBeLoggedIn) {
    links.push({to: '/me', desc: 'Profile'});
  } else {
    links.push(
      {to: "/how-it-works", desc: "How it works"},
      {to: '/signup', desc: 'Sign up'},
      {to: '/login', desc: 'Login'},
    );
  }
  const offcanvasOnlyLinks = [
    {to: '/privacy', desc: 'Privacy'},
    {to: '/feedback', desc: 'Feedback'},
  ];
  const linkProps = {
    className: 'header-link',
    activeClassName: 'header-link_active',
  };
  const offcanvasOnlyLinksProps = {
    className: 'header-link d-block d-md-none',
    activeClassName: 'header-link_active d-block d-md-none',
  };
  return (
    <>
      {
        links.map(lnk => (
          <LinkContainer
            to={lnk.to}
            key={lnk.to}
            {...linkProps}
          >
            <Nav.Link onClick={onClick}>{lnk.desc}</Nav.Link>
          </LinkContainer>
        ))
      }
      {
        offcanvasOnlyLinks.map(lnk => (
          <LinkContainer
            to={lnk.to}
            key={lnk.to}
            onClick={onClick}
            {...offcanvasOnlyLinksProps}
          >
            <Nav.Link>{lnk.desc}</Nav.Link>
          </LinkContainer>
        ))
      }
    </>
  );
}

function Footer() {
  return (
    <footer className="d-none d-md-flex align-items-center justify-content-center border-top mt-md-5">
      <Link to="/privacy" >Privacy</Link>
      <Link to="/feedback">Feedback</Link>
      <Link to="/terms-of-service">Terms of Service</Link>
      <a href="https://github.com/maxerenberg/cabbagemeet">GitHub</a>
    </footer>
  );
}

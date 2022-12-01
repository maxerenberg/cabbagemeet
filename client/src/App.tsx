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
import MeetingForm from 'components/MeetingForm';
import Signup from 'components/Signup';
import Meeting from 'components/availabilities/Meeting';
import Profile from 'components/Profile';
import Settings from 'components/Settings';
import { selectTokenIsPresent } from 'slices/authentication';
import { useEffect } from 'react';
import { useExtractTokenFromQueryParams, useGetSelfInfoIfTokenIsPresent } from 'utils/auth.hooks';
import { getReqErrorMessage } from 'utils/requests.utils';
import ErrorPage from 'components/ErrorPage';
import ConfirmLinkExternalCalendar from 'components/ConfirmLinkExternalCalendar';
import ConfirmPasswordReset from 'components/ConfirmPasswordReset';
import { BottomOverlayFiller } from 'components/BottomOverlay';

export default function App() {
  return (
    <BrowserRouter>
      <HistoryProvider>
        <Routes>
          <Route path="/" element={<AppRoot />}>
            <Route index element={<DayPicker />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="create" element={<MeetingForm />} />
            <Route path="m/:id" element={<Meeting />} />
            <Route path="signup" element={<Signup />} />
            <Route path="login" element={<Login />} />
            <Route path="confirm-link-google-account" element={<ConfirmLinkExternalCalendar provider="google" />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="confirm-password-reset" element={<ConfirmPasswordReset />} />
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

function BrandWithLogo() {
  return (
    <LinkContainer to="/">
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
  const {error} = useGetSelfInfoIfTokenIsPresent();
  useEffect(() => {
    if (error) {
      console.error(`Failed to get user info: ${getReqErrorMessage(error!)}`);
    }
  }, [error]);
  const tokenIsInURL = useExtractTokenFromQueryParams();
  if (tokenIsInURL) {
    // Don't make any requests yet until the token has been saved into
    // LocalStorage and stored in the Redux slice.
    // Otherwise the requests will be prematurely unauthenticated.
    return null;
  }
  return (
    <div className="App d-flex flex-column">
      <Navbar expand="md" className="mt-3 mb-5">
        <Container className="app-main-container custom-navbar-container">
          <BrandWithLogo />
          <Navbar.Toggle aria-controls="app-navbar-nav" className="custom-navbar-toggle" />
          {/* TODO: hide offcanvas when link is clicked */}
          <Navbar.Offcanvas
            id="app-navbar-nav"
            aria-labelledby="app-navbar-offcanvas-label"
            placement="start"
          >
            <Offcanvas.Header closeButton className="mt-3">
              <Offcanvas.Title id="app-navbar-offcanvas-label" className="fs-4">
                <BrandWithLogo />
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <div className="px-3"><hr className="mt-0 mb-4" /></div>
              <Nav className="ms-auto">
                <HeaderLinks />
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

function HeaderLinks() {
  // assume that user info will be successfully fetched if token is present (optimistic)
  const isOrWillBeLoggedIn = useAppSelector(selectTokenIsPresent);
  const links = [
    {
      to: "/how-it-works",
      desc: "How it works",
    },
  ];
  if (isOrWillBeLoggedIn) {
    links.push({to: '/me', desc: 'Profile'});
  } else {
    links.push({to: '/signup', desc: 'Sign up'});
    links.push({to: '/login', desc: 'Login'});
  }
  const offcanvasOnlyLinks = [
    {
      to: '/privacy',
      desc: 'Privacy',
    },
    {
      to: '/feedback',
      desc: 'Feedback',
    },
  ];
  // The @types/react-router-bootstrap package is wrong - className needs to be a string
  // See https://github.com/react-bootstrap/react-router-bootstrap/blob/master/src/LinkContainer.js
  const linkProps = {
    className: 'header-link',
    activeClassName: 'header-link_active',
  } as any;
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
            <Nav.Link>{lnk.desc}</Nav.Link>
          </LinkContainer>
        ))
      }
      {
        offcanvasOnlyLinks.map(lnk => (
          <LinkContainer
            to={lnk.to}
            key={lnk.to}
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
    </footer>
  );
}

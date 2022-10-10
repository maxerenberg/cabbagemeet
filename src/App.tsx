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
import { useAppSelector } from 'app/hooks';
import DayPicker from 'components/DayPicker/DayPicker';
import ForgotPassword from 'components/ForgotPassword';
import HowItWorksPage from 'components/HowItWorksPage';
import Login from 'components/Login';
import MeetingForm from 'components/MeetingForm';
import Signup from 'components/Signup';
import Meeting from 'components/availabilities/Meeting';
import Profile from 'components/Profile';
import Settings from 'components/Settings';
import { selectIsLoggedIn } from 'slices/authentication';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppRoot />}>
          <Route index element={<DayPicker />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="create" element={<MeetingForm />} />
          <Route path="m/:id" element={<Meeting />} />
          <Route path="signup" element={<Signup />} />
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="me">
            <Route index element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        {/* TODO: use custom 404 page */}
      </Routes>
    </BrowserRouter>
  );
}

function AppRoot() {
  return (
    <div className="App light-theme d-flex flex-column">
      <Navbar expand="md" className="mt-3 mb-5">
        <Container className="app-main-container custom-navbar-container">
          <LinkContainer to="/">
            <Navbar.Brand href="/">Logo</Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle aria-controls="app-navbar-nav" className="custom-navbar-toggle" />
          {/* TODO: hide offcanvas when link is clicked */}
          <Navbar.Offcanvas
            id="app-navbar-nav"
            aria-labelledby="app-navbar-offcanvas-label"
            placement="start"
          >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title id="app-navbar-offcanvas-label">
                <Link to="/">LOGO</Link>
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
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
    </div>
  );
}

function HeaderLinks() {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const links = [
    {
      to: "/how-it-works",
      desc: "How it works",
    },
  ];
  if (isLoggedIn) {
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

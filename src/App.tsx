import Container from 'react-bootstrap/Container';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import {
  BrowserRouter,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import './App.scss';
import './custom.css';
import 'common/common.css';
import DayPicker from 'components/DayPicker/DayPicker';
import MeetingForm from 'components/MeetingForm';
import Meeting from './components/availabilities/Meeting';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppRoot />}>
          <Route index element={<DayPicker />} />
          <Route path="create" element={<MeetingForm />} />
          <Route path="m/:id" element={<Meeting />} />
        </Route>
        {/* TODO: use custom 404 page */}
      </Routes>
    </BrowserRouter>
  );
}

function AppRoot() {
  return (
    <div className="App light-theme">
      <Navbar expand="md">
        <Container className="custom-navbar-container">
          {/*
            We intentionally use <a> here to force a reload of the whole page
            to completely reset the Redux state.
          */}
          <Navbar.Brand href="/">Logo</Navbar.Brand>
          <Navbar.Toggle aria-controls="app-navbar-nav" className="custom-navbar-toggle" />
          <Navbar.Offcanvas
            id="app-navbar-nav"
            aria-labelledby="app-navbar-offcanvas-label"
            placement="start"
          >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title id="app-navbar-offcanvas-label">
                LOGO
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
      <main className="container app-main-container mt-5 mb-md-5">
        <Outlet />
      </main>
    </div>
  );
}

function HeaderLinks() {
  const links = [
    {
      to: "/how-it-works",
      desc: "How it works",
    },
    {
      to: "/signup",
      desc: "Sign up",
    },
    {
      to: "/login",
      desc: "Login",
    },
    {
      to: "/feedback",
      desc: "Feedback",
    },
  ];
  // The @types/react-router-bootstrap package is wrong - className needs to be a string
  // See https://github.com/react-bootstrap/react-router-bootstrap/blob/master/src/LinkContainer.js
  const linkProps = {className: 'header-link', activeClassName: 'header-link_active'} as any;
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
    </>
  );
}

export default App;

import React, { useContext } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import DayPicker from './features/daypicker/DayPicker';
import CreateMeetingPage from './features/createMeeting/CreateMeeting';
import Meeting from './features/availabilities/Meeting';
import './App.css';
import { toastContext } from './features/toast/Toast';

function App() {
  // use one Toast for the whole app
  const { toast } = useContext(toastContext);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <>
            <div className="App">
              <header className="App-header">
                <div>
                  <Link to="/" style={{textDecoration: 'none', color: 'black'}}>Logo</Link>
                </div>
                <div>
                  <HeaderLinks />
                </div>
              </header>
              <main className="App-main">
                <Outlet />
              </main>
            </div>
            {toast}
          </>
        }>
          <Route index element={<DayPicker />} />
          <Route path="/create" element={<CreateMeetingPage />} />
          <Route path="/m/:id" element={<Meeting />} />
        </Route>
      </Routes>
    </BrowserRouter>
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
  return (
    <>
      {
        links.map(lnk => (
          <NavLink
            to={lnk.to}
            key={lnk.to}
            className={({ isActive }) => isActive ? "header-link_active" : "header-link"}
          >
            {lnk.desc}
          </NavLink>
        ))
      }
    </>
  );
}

export default App;

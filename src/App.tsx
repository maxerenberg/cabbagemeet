import React, { useContext } from 'react';
import {
  BrowserRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import './App.css';
import 'common/common.css';
import DayPicker from 'components/DayPicker/DayPicker';
import MeetingForm from 'components/MeetingForm';
import Meeting from './components/availabilities/Meeting';
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
                  {/*
                    We use <a> instead of <Link> to force a reload of the whole page
                    to completely reset the Redux state.
                  */}
                  <a href="/" style={{textDecoration: 'none', color: 'black'}}>Logo</a>
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
          <Route path="create" element={<MeetingForm />} />
          <Route path="m/:id" element={<Meeting />} />
        </Route>
        {/* TODO: use custom 404 page */}
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

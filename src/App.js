import React, { useContext } from 'react';
import {
  BrowserRouter as Router,
  Link,
  NavLink,
  Route,
  Switch,
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
    <Router>
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
          <Switch>
            <Route exact path="/create" component={CreateMeetingPage} />
            <Route exact path="/m/:id">
              <Meeting />
            </Route>
            <Route exact path="/" component={DayPicker} />
          </Switch>
        </main>
      </div>
      {toast}
    </Router>
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
    <React.Fragment>
      {
        links.map(lnk => (
          <NavLink
            to={lnk.to}
            key={lnk.to}
            className="header-link"
            activeClassName="header-link_active"
          >
            {lnk.desc}
          </NavLink>
        ))
      }
    </React.Fragment>
  );
}

export default App;

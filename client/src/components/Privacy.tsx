export default function Privacy() {
  return (
    <div className="mx-auto" style={{maxWidth: '600px'}}>
      <h3>Privacy Policy</h3>
      <hr />
      <p>This website collects the following information to function correctly:</p>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Date and time information for created meetings</li>
        <li>Meeting respondents' names and email addresses</li>
      </ul>
      <p>
        Your browser's LocalStorage is used to store a persistent token which is
        used for login sessions. This token is deleted when you log out.
      </p>
      <p>
        Furthermore, if you sign in via an external identity provider (e.g. Google, Microsoft)
        or link your account with one, the following information is collected from the
        provider:
      </p>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Events on your personal calendar</li>
      </ul>
      <p>
        When a meeting is scheduled for which you are a respondent, an event will be
        created on each of the calendars of your linked external accounts. If the meeting
        is unscheduled or deleted, those events will also be deleted.
      </p>
      <p>
        When your account is deleted, all of the data related to your account will
        also be deleted, including your profile information, meetings which you created,
        and data collected from external identity providers with which you linked your
        account. However, events created on the calendars of your external linked accounts
        will not be deleted.
      </p>
    </div>
  );
}

import useSetTitle from "utils/title.hook";

export default function TermsOfService() {
  useSetTitle('Terms of Service');
  return (
    <div className="mx-auto" style={{maxWidth: '600px'}}>
      <h3>Terms of Service</h3>
      <hr />
      <p>
        This website provides a service for people to schedule meetings
        together by registering their availabilities. Users may optionally
        create an account to see meetings which they have created and link
        their accounts to external identity providers.
      </p>
      <p>
        When interacting with this website, please refrain from the
        following activities:
      </p>
      <ul>
        <li>Loading testing/benchmarking the website</li>
        <li>Creating an excessive number of accounts</li>
        <li>Creating an excessive number of meetings</li>
        <li>Creating an excessive number of respondents</li>
        <li>Sending an excessive number of requests for a given period of time</li>
        <li>
          In general, anything which would compromise the availability of the
          website for other people to use
        </li>
      </ul>
      <p>Thank you for your cooperation.</p>
    </div>
  );
}

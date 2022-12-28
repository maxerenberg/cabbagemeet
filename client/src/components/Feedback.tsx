import useSetTitle from "utils/title.hook";

const ISSUE_TRACKER_URL = 'https://github.com/maxerenberg/cabbagemeet/issues';

export default function Feedback() {
  useSetTitle('Feedback');
  return (
    <div className="mx-auto" style={{maxWidth: '600px'}}>
      <h3>Feedback</h3>
      <hr />
      <p>
        If you have any suggestions or feature requests for this website,
        please create a new issue on the <a href={ISSUE_TRACKER_URL}>GitHub issue tracker</a>.
      </p>
    </div>
  );
}

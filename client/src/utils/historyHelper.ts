import history from 'history/browser';

// The idea is that after a user logs in or signs up, we want to redirect
// them to the last page they visited *before* the login/signup page.
const authPaths = ['/signup', '/login'];

class HistoryHelper {
  private lastNonAuthPath: string =
    authPaths.every(authPath => window.location.pathname !== authPath)
    ? window.location.pathname
    : '/';

  getLastNonAuthPath() {
    return this.lastNonAuthPath;
  }

  setLastNonAuthPath(path: string) {
    this.lastNonAuthPath = path;
  }
}
const historyHelper = new HistoryHelper();
export default historyHelper;

history.listen(({location, action}) => {
  if (authPaths.every(authPath => location.pathname !== authPath)) {
    historyHelper.setLastNonAuthPath(location.pathname);
  }
});

import Spinner from 'react-bootstrap/Spinner';

export default function ButtonSpinnerRight() {
  return (
    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="ms-2">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );
};

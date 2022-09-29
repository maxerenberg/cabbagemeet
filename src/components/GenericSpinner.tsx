import Spinner from 'react-bootstrap/Spinner';

// This should be placed inside a container with "d-flex flex-column"
export default function GenericSpinner() {
  return (
    <div className="flex-grow-1 d-flex align-items-center justify-content-center">
      <div style={{transform: 'scale(2)'}}>
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    </div>
  );
};

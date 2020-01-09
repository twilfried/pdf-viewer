import React from 'react';
import EditText from './EditText';
import { Container, Row, Col } from 'react-bootstrap';

function App() {
  return (
    <div className="App">
      <Container>
        <Row>
          <Col md='4'>
            <EditText />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;

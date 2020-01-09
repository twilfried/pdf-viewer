import React, { Component } from 'react'
import { Form } from 'react-bootstrap';

const styles = {
    error: {
        borderColor: '#ff0000'
    }
}

class EditText extends Component {

    constructor(props) {
        super(props)

        this.currentRef = React.createRef();
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleChange = this.handleChange.bind(this)
    }

    handleKeyDown = evt => {
        const allowed = ['1', '2', '.', 'Backspace'];
        const key = evt.key;
        if (!allowed.includes(key)) {
            evt.preventDefault();
        }
    }

    handleKeyUp = evt => {
        evt.preventDefault();
    }

    handleChange = evt => {
    
    }
 
    render() {
        return (
            <div>
                <Form.Group>
                    <Form.Label>Label</Form.Label>
                    <Form.Control 
                        ref={this.currentRef}
                        type='text'
                        onKeyDown={this.handleKeyDown}
                    />
                </Form.Group>
            </div>
        )
    }
}

export default EditText;
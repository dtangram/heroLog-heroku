import React from 'react';
import PropTypes from 'prop-types';

class FormErrors extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    const { formErrors } = this.props;
    return (
      <React.Fragment>
        <div>
          {Object.keys(formErrors).map((name, i) => {
            const message = formErrors[name];
            if (message.length > 0) {
              return (
                <p key={name}>
                  {message}
                </p>
              );
            }

            return '';
          })}
        </div>
      </React.Fragment>
    );
  }
}

FormErrors.propTypes = {
  formErrors: PropTypes.shape({
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    username: PropTypes.string,
    email: PropTypes.string,
    password: PropTypes.string,
    publisherName: PropTypes.string,
    cbTitle: PropTypes.string,
    title: PropTypes.string,
    comicBookTitle: PropTypes.string,
    comicBookVolume: PropTypes.number,
    comicBookYear: PropTypes.number,
    comicBookPublisher: PropTypes.string,
    name: PropTypes.string,
    message: PropTypes.string,
    type: PropTypes.string,
  }),
};

FormErrors.defaultProps = {
  formErrors: {},
};

export default FormErrors;

import React from 'react';
import PropTypes from 'prop-types';
import { Link as RRLink } from 'react-router-dom';
import styles from './styles.module.css';

function Link({
  url, title, icon, className,
}) {
  const isStringIcon = typeof icon === 'string';
  const classNames = [
    styles.link,              // Base link styles
    className  // Optional additional styles
  ].filter(Boolean).join(' ');

  return (
    <RRLink to={url} className={classNames}>
      {isStringIcon ? (
        <i className={[icon, 'fas'].join(' ')} />
      ) : (
        icon
      )}
      <span>
        {' '}{title}
      </span>
    </RRLink>
  );
}

Link.propTypes = {
  url: PropTypes.string.isRequired,
  title: PropTypes.string,
  icon: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element,
  ]),
  className: PropTypes.string,
};

Link.defaultProps = {
  title: 'View',
  icon: 'fa-eye',
  className: '',
};

export default Link;

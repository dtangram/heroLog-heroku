import React from 'react';
import { FOOTER_LINKS, SOCIAL_LINKS } from '../../constants/links';

const Footer = () => {
  return (
    <footer>
      <article>
        <section>
          {SOCIAL_LINKS.map(({ name, icon, url, alt }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit Hero-Log on ${name}`}
            >
              <figure>
                <img src={icon} alt={alt} />
              </figure>
            </a>
          ))}
        </section>
      </article>
     
      <nav aria-label="Footer navigation">
        <ul>
          {FOOTER_LINKS.map(({ text, title, url }, index) => (
            <React.Fragment key={text}>
              {index > 0 && (
                <li aria-hidden="true"> | </li>
              )}
              <li>
                {url ? (
                  <a href={url} title={title}>
                    {text}
                  </a>
                ) : (
                  <span title={title}>{text}</span>
                )}
              </li>
            </React.Fragment>
          ))}
        </ul>
      </nav>
    </footer>
  );
};

export default Footer;
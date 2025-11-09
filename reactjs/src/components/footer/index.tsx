import React from 'react';
import facebook from '../../img/facebook.png';
import twitter from '../../img/twitter.png';
import instagram from '../../img/instagram.png';

interface SocialLink {
  name: string;
  icon: string;
  url: string;
  alt: string;
}

interface FooterLink {
  text: string;
  title: string;
  url?: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Facebook',
    icon: facebook,
    url: 'https://facebook.com/herolog',
    alt: 'Hero-Log Facebook'
  },
  {
    name: 'Twitter',
    icon: twitter,
    url: 'https://twitter.com/herolog',
    alt: 'Hero-Log Twitter'
  },
  {
    name: 'Instagram',
    icon: instagram,
    url: 'https://instagram.com/herolog',
    alt: 'Hero-Log Instagram'
  }
];

const FOOTER_LINKS: FooterLink[] = [
  { text: 'Help', title: 'Help', url: '/help' },
  { text: 'Privacy', title: 'Hero-Log Privacy Policy', url: '/privacy' },
  { text: 'Terms of Use', title: 'Hero-Log Terms of Use', url: '/terms' }
];

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
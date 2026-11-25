import React from 'react';
import facebook from '../../img/facebook.png';
import twitter from '../../img/twitter.png';
import instagram from '../../img/instagram.png';
import { HELP_URL, PRIVACY_URL, TERMS_URL } from '../../siteLinks';

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
    url: 'https://www.facebook.com/profile.php?id=100054380207058',
    alt: 'Hero-Log Facebook'
  },
  {
    name: 'Twitter',
    icon: twitter,
    url: 'https://x.com/dtDesign1',
    alt: 'Hero-Log Twitter'
  },
  {
    name: 'Instagram',
    icon: instagram,
    url: 'https://instagram.com/',
    alt: 'Hero-Log Instagram'
  }
];

const FOOTER_LINKS: FooterLink[] = [
  { text: 'Help', title: 'Help', url: HELP_URL },
  { text: 'Privacy', title: 'Hero-Log Privacy Policy', url: PRIVACY_URL },
  { text: 'Terms of Use', title: 'Hero-Log Terms of Use', url: TERMS_URL }
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
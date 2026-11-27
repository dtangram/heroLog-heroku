import facebook from '../img/facebook.png';
import twitter from '../img/twitter.png';
import instagram from '../img/instagram.png';

/**
 * Addresses used in more than one place (the footer, the sign-up form), kept
 * here so they can't disagree. Help, Privacy and Terms of Use don't have
 * their own pages yet, so they point to the landing page for now.
 */
export const HELP_URL = 'https://herologapp-b9f8cc091dd2.herokuapp.com/landing';
export const PRIVACY_URL = 'https://herologapp-b9f8cc091dd2.herokuapp.com/landing';
export const TERMS_URL = 'https://herologapp-b9f8cc091dd2.herokuapp.com/landing';

export interface SocialLink {
  name: string;
  icon: string;
  url: string;
  alt: string;
}

export interface FooterLink {
  text: string;
  title: string;
  url?: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
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

export const FOOTER_LINKS: FooterLink[] = [
  { text: 'Help', title: 'Help', url: HELP_URL },
  { text: 'Privacy', title: 'Hero-Log Privacy Policy', url: PRIVACY_URL },
  { text: 'Terms of Use', title: 'Hero-Log Terms of Use', url: TERMS_URL }
];
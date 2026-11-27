import numberOne from '../img/numberOne.png';
import numberTwo from '../img/numberTwo.png';
import numberThree from '../img/numberThree.png';

export interface SubscriptionPlan {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  price?: string;
}

export interface Feature {
  id: string;
  description: string;
}

/**
 * The plans, described by what each lets a collector do. No storage sizes:
 * a catalog is a list of comics, so GB means nothing to a collector.
 * Both paid plans have the same standard 30-day free trial.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    badge: numberOne,
    title: 'Free',
    subtitle: 'Catalog your collection',
    description: 'Scan covers, organize your comics by publisher and title, search them, and get Collection Insights.',
    buttonText: 'Sign Up'
  },
  {
    id: 'standard',
    badge: numberTwo,
    title: '$5.99 a month',
    subtitle: 'Buy and trade · 30-day free trial',
    description: 'Everything in Free, plus buying and trading comics with other collectors and messaging them on Hero-Log.',
    buttonText: 'Start Free Trial',
    price: '$5.99'
  },
  {
    id: 'premium',
    badge: numberThree,
    title: '$8.99 a month',
    subtitle: 'Buy, sell and trade · 30-day free trial',
    description: 'Everything in the $5.99 plan, plus listing your own comics for sale.',
    buttonText: 'Start Free Trial',
    price: '$8.99'
  }
];

export const FEATURES: Feature[] = [
  { id: 'catalogue', description: 'Easily Catalogue Your Comic Books' },
  { id: 'duplicates', description: 'No purchasing duplicate comics' },
  { id: 'trade', description: 'Buy, sell and trade comic books' }
];
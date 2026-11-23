import { Link as RRLink } from 'react-router-dom';
import styles from './styles.module.css';

export interface Crumb {
  label: string;
  /** Where the crumb goes. Leave it out for the page you're on, which isn't a link. */
  to?: string;
}

interface BreadcrumbsProps {
  /** From the top level down, ending with the current page, e.g. Dashboard › DC › Batman */
  items: Crumb[];
}

/**
 * Where this page sits in the collection, e.g. "Dashboard › DC › Batman".
 * Earlier levels are links; the last one is the current page.
 * The › separators come from the stylesheet, so screen readers don't read them.
 */
const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  if (items.length === 0) return null;

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {items.map(({ label, to }, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${index}-${label}`} className={styles.crumb}>
              {to && !isCurrent ? (
                <RRLink className={styles.link} to={to}>
                  {label}
                </RRLink>
              ) : (
                <span className={styles.current} aria-current="page">
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
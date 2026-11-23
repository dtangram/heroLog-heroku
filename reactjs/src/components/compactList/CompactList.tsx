import { useId } from 'react';
import { Link as RRLink } from 'react-router-dom';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import styles from './styles.module.css';

export interface CompactItem {
  id: string;
  name: string;
  /** The item's own page */
  href: string;
  /** Adds an "add" link, e.g. "Add title" straight to the new-title form */
  addUrl?: string;
  editUrl?: string;
  onDelete?: () => void;
}

interface CompactListProps {
  heading: string;
  /** One line under the heading saying what these items have in common */
  description?: string;
  /** Text of each item's add link, e.g. "Add title" */
  addLabel?: string;
  items: CompactItem[];
}

/**
 * A short, one-row-per-item list for things that have nothing to show yet,
 * e.g. publishers without titles. They stay reachable (open, add, edit,
 * delete) without taking up a full card each next to the ones that have comics.
 */
const CompactList = ({ heading, description, addLabel = 'Add', items }: CompactListProps) => {
  const headingId = useId();

  if (items.length === 0) return null;

  return (
    <section className={styles.compact} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        {heading}
      </h2>
      {description && <p className={styles.description}>{description}</p>}

      <ul className={styles.list}>
        {items.map(({ id, name, href, addUrl, editUrl, onDelete }) => (
          <li key={id} className={styles.row}>
            <RRLink className={styles.name} to={href}>
              {name}
            </RRLink>

            {(addUrl || editUrl || onDelete) && (
              <menu className={styles.actions}>
                {addUrl && (
                  <li>
                    <RRLink className={styles.action} to={addUrl} aria-label={`${addLabel} to ${name}`}>
                      <LibraryAddIcon fontSize="inherit" aria-hidden="true" />
                      <span className={styles.label}>{addLabel}</span>
                    </RRLink>
                  </li>
                )}
                {editUrl && (
                  <li>
                    <RRLink className={styles.action} to={editUrl} aria-label={`Edit ${name}`}>
                      <EditIcon fontSize="inherit" aria-hidden="true" />
                      <span className={styles.label}>Edit</span>
                    </RRLink>
                  </li>
                )}
                {onDelete && (
                  <li>
                    <button className={styles.action} type="button" onClick={onDelete} aria-label={`Delete ${name}`}>
                      <DeleteIcon fontSize="inherit" aria-hidden="true" />
                      <span className={styles.label}>Delete</span>
                    </button>
                  </li>
                )}
              </menu>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CompactList;
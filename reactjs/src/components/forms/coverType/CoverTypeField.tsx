import { ChangeEvent } from 'react';
import styles from './styles.module.css';
import { COVER_TYPE_OPTIONS } from '../../../constants/covers';

interface CoverTypeFieldProps {
  /** 'Regular' or 'Variant' */
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/**
 * "Cover type: Regular cover / Variant cover", the same on every comic form.
 * A fieldset with a legend, so screen readers announce the question with
 * each option, and one radio group name so arrow keys move between them.
 */
const CoverTypeField = ({ value, onChange, disabled = false }: CoverTypeFieldProps) => (
  <fieldset className={styles.coverType}>
    <legend className={styles.legend}>Cover type</legend>
    {COVER_TYPE_OPTIONS.map(option => (
      <label key={option.value} className={styles.option} htmlFor={option.id}>
        <input
          id={option.id}
          type="radio"
          name="coverType"
          value={option.value}
          checked={value === option.value}
          onChange={onChange}
          disabled={disabled}
        />
        {option.label}
      </label>
    ))}
  </fieldset>
);

export default CoverTypeField;
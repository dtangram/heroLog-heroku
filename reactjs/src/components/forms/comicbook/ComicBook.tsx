import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import API from '../../../API';
import { ContainerProps } from './container';
import styles from './styles.module.css';

interface FormErrorsState {
  title: string;
  type: string;
}

const ComicBookComponent = ({
  comicbook,
  createComicBook,
  fetchComicBook,
  fetchComicBooks,
  updateComicBook,
}: ContainerProps) => {
  const navigate = useNavigate();
  const { id, coboTitleId, cbTitle, pubId, publisherName } = useParams<{ id?: string, coboTitleId?: string, cbTitle?: string, pubId?: string, publisherName?: string }>();

  const [title, setTitle] = useState('');
  const [comicIssue, setComicIssue] = useState('');
  const [author, setAuthor] = useState('');
  const [penciler, setPenciler] = useState('');
  const [coverartist, setCoverartist] = useState('');
  const [inker, setInker] = useState('');
  const [volume, setVolume] = useState('');
  const [year, setYear] = useState('');
  const [comicBookCover, setComicBookCover] = useState('');
  const [type, setType] = useState<'regular' | 'variant' | ''>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrorsState>({
    title: '',
    type: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (id) {
      fetchComicBook(id);
    }

    inputRef.current?.focus();
  }, [id, fetchComicBook]);

  useEffect(() => {
    if (comicbook && comicbook.id) {
      setTitle(comicbook.title || '');
      setComicIssue(String(comicbook.comicIssue || ''));
      setAuthor(comicbook.author || '');
      setPenciler(comicbook.penciler || '');
      setCoverartist(comicbook.coverartist || '');
      setInker(comicbook.inker || '');
      setVolume(String(comicbook.volume || ''));
      setYear(String(comicbook.year || ''));
      setComicBookCover(comicbook.comicBookCover || '');
      setType(comicbook.type || '');
    }
  }, [comicbook]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const setters: Record<string, (value: string) => void> = {
      title: setTitle,
      author: setAuthor,
      penciler: setPenciler,
      coverartist: setCoverartist,
      inker: setInker,
    };
    setters[name]?.(value);
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const { value } = event.target;
    const regex = /^[0-9]*$/;
    if (value === '' || regex.test(value)) {
      setter(value);
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const coverButton = document.getElementById('comicBookCover') as HTMLButtonElement;
    if (coverButton) coverButton.disabled = false;

    const fileParts = file.name.split('.');
    const fileName = file.name;
    const fileType = fileParts[fileParts.length - 1] || '';
    const fileSize = file.size;

    const validTypes = ['jpg', 'png', 'jpeg'];
    if (!validTypes.includes(fileType)) {
      alert('Image needs to have a .jpeg, .jpg or .png file extension.');
      window.location.reload();
      return;
    }

    if (fileSize > 1e6) {
      alert('Image size needs to be smaller than 1MB');
      window.location.reload();
      return;
    }

    try {
      if (coverButton) coverButton.disabled = true;

      const response = await API.post('/sign_s3', { fileName, fileType });
      const { signedRequest, url } = response.data.returnData;

      const options = {
        headers: {
          'Content-Type': fileType,
          'x-amz-acl': 'public-read',
        },
      };

      await axios.put(signedRequest, file, options);
      setComicBookCover(url);

      const figure = document.querySelector('form > figure') as HTMLElement;
      if (figure) figure.style.display = 'inline-block';

      // NOTE: AWS Rekognition image moderation should be implemented server-side
      // The original client-side implementation has been removed for security
      
    } catch (error) {
      console.error('Upload error:', error);
      if (coverButton) coverButton.disabled = false;
    }
  };

  const validateFields = (): boolean => {
    const isTitleValid = title.trim().length >= 1;
    const isTypeValid = type.length > 0;

    setFormErrors({
      title: isTitleValid ? '' : 'Comic Book issue title is required',
      type: isTypeValid ? '' : 'Please select regular or variant',
    });

    return isTitleValid && isTypeValid;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = validateFields();
    
    if (!isValid) {
      return;
    }

    const comicBookData = {
      title: title.trim(),
      comicIssue,
      author: author.trim(),
      penciler: penciler.trim(),
      coverartist: coverartist.trim(),
      inker: inker.trim(),
      volume,
      year,
      comicBookCover,
      type,
      titleID: coboTitleId || '',
      comicBookTitle: cbTitle || '',
    };

    if (id) {
      updateComicBook({
        id,
        ...comicBookData,
      });
    } else {
      createComicBook(comicBookData);
    }
    
    setSuccessMessage('success');
    
    // Refetch the list and then navigate
    setTimeout(() => {
      if (coboTitleId) {
        fetchComicBooks(coboTitleId); // Refetch before navigating
      }
      navigate(`/dashboard/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbooklistissues`);
    }, 1500);
  };

  const showSuccess = !formErrors.title && !formErrors.type && successMessage === 'success';

  return (
    <article id="cbComicForm" className={styles.cbWrapper}>
      <h1>
        {coboTitleId ? `Edit ${title}` : 'Add Comic Book'}
        <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
      </h1>

      <article className={styles.cbList}>
        {showSuccess && <SuccessDisplay />}

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

            <p id="forbidContent" />

            <figure>
              <img src={comicBookCover} alt={title || 'Comic book cover'} />
            </figure>

            <article>
              <fieldset>
                <label htmlFor="comicBookCover">
                  Comic Book Cover
                  <input
                    id="comicBookCover"
                    className={styles.inputBorder}
                    type="file"
                    name="comicBookCover"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileInputChange}
                  />
                </label>

                <label htmlFor="title">
                  Title
                  <input
                    ref={inputRef}
                    id="title"
                    className={styles.inputBorder}
                    type="text"
                    name="title"
                    value={title}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label htmlFor="comicIssue">
                  Issue
                  <input
                    id="comicIssue"
                    className={styles.inputBorder}
                    type="number"
                    name="comicIssue"
                    value={comicIssue}
                    onChange={(e) => handleNumberChange(e, setComicIssue)}
                  />
                </label>

                <label htmlFor="author">
                  Author/Writer
                  <input
                    id="author"
                    className={styles.inputBorder}
                    type="text"
                    name="author"
                    value={author}
                    onChange={handleInputChange}
                  />
                </label>

                <label htmlFor="penciler">
                  Penciler
                  <input
                    id="penciler"
                    className={styles.inputBorder}
                    type="text"
                    name="penciler"
                    value={penciler}
                    onChange={handleInputChange}
                  />
                </label>

                <label htmlFor="coverartist">
                  Cover Artist
                  <input
                    id="coverartist"
                    className={styles.inputBorder}
                    type="text"
                    name="coverartist"
                    value={coverartist}
                    onChange={handleInputChange}
                  />
                </label>
              </fieldset>

              <fieldset>
                <label htmlFor="inker">
                  Inker
                  <input
                    id="inker"
                    className={styles.inputBorder}
                    type="text"
                    name="inker"
                    value={inker}
                    onChange={handleInputChange}
                  />
                </label>

                <label htmlFor="volume">
                  Volume
                  <input
                    id="volume"
                    className={styles.inputBorder}
                    type="number"
                    name="volume"
                    value={volume}
                    onChange={(e) => handleNumberChange(e, setVolume)}
                  />
                </label>

                <label htmlFor="year">
                  Year
                  <input
                    id="year"
                    className={styles.inputBorder}
                    type="text"
                    maxLength={4}
                    name="year"
                    value={year}
                    onChange={(e) => handleNumberChange(e, setYear)}
                  />
                </label>
              </fieldset>
            </article>

            <article>
              <label className={styles.labelRadio} htmlFor="regularcover">
                <input
                  id="regularcover"
                  type="radio"
                  value="regular"
                  checked={type === 'regular'}
                  onChange={(e) => setType(e.target.value as 'regular' | 'variant')}
                />
                Regular Cover
              </label>

              <label className={styles.labelRadio} htmlFor="variantcover">
                <input
                  id="variantcover"
                  type="radio"
                  value="variant"
                  checked={type === 'variant'}
                  onChange={(e) => setType(e.target.value as 'regular' | 'variant')}
                />
                Variant Cover
              </label>
            </article>

            <article>
              <p>
                <Link 
                  url={`/dashboard/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbooklistissues`} 
                  title="CANCEL" 
                />
              </p>

              <input
                id="submitQ1"
                className={styles.submit}
                type="submit"
                value="SUBMIT"
              />
            </article>
          </form>
        </section>
      </article>
    </article>
  );
};

export default ComicBookComponent;
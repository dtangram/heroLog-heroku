import container from './container';
import ComicBookList from './ComicBookList';

export type { 
  ComicBookTitle, 
  ComicBookData, 
  ComicBookLists
} from './ComicBookList';
export type { ConnectorProps } from './container';

export default container(ComicBookList);
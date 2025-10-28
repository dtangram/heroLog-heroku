import container from './container';
import ComicBookListIssues from './ComicBookListIssues';

export type { 
  ComicBook, 
  ComicBookIssueData, 
  CBListIssues as ComicBookListIssuesType
} from './ComicBookListIssues';
export type { ConnectorProps } from './container';

export default container(ComicBookListIssues);
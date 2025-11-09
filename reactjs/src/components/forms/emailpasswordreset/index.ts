// index.ts
import connector from './container';
import EmailPasswordReset from './EmailPasswordReset';

export default connector(EmailPasswordReset);
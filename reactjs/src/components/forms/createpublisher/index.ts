// index.ts
import connector from './container';
import CreatePublisher from './CreatePublisher';

export default connector(CreatePublisher);
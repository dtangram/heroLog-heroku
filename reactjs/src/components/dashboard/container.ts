import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { fetchPublishers, deletePublisher } from '../../store/dashboard/actions';
import Dashboard from './Dashboard';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Publisher {
  id: string;
  publisherName: string;
}

interface PublisherState {
  byId: Record<string, { data: Publisher }>;
  allIds: string[];
  isLoading: boolean;
}

interface RootState {
  publishers: PublisherState;
}

// ============================================================================
// SELECTORS
// ============================================================================

const selectPublishers = (state: RootState): Publisher[] => {
  const { publishers } = state;
 
  if (!publishers) {
    return [];
  }

  const { byId = {}, allIds = [] } = publishers;
  
  return allIds
    .filter(id => byId[id]?.data)
    .map(id => byId[id].data);
};

const selectIsLoading = (state: RootState): boolean => {
  return state.publishers?.isLoading ?? false;
};

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

const DashboardContainer = () => {
  const dispatch = useDispatch();
  
  const publishersList = useSelector(selectPublishers);
  const loading = useSelector(selectIsLoading);
  
  const handleFetchPublishers = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(fetchPublishers() as any);
  }, [dispatch]);
  
  const handleDeletePublisher = useCallback((id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(deletePublisher(id) as any);
  }, [dispatch]);
  
  const props = {
    fetchPublishers: handleFetchPublishers,
    publishers: publishersList,
    deletePublisher: handleDeletePublisher,
    isLoading: loading
  };
  
  return Dashboard(props);
};

export default DashboardContainer;
export type { Publisher };
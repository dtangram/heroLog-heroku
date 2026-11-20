import { connect, ConnectedProps } from 'react-redux';
import { fetchUser, deleteUser } from '../../store/signup/actions';
import { fetchPublishers } from '../../store/dashboard/actions';
import { fetchSales } from '../../store/sale/actions';
import { fetchWishlists } from '../../store/wishlist/actions';

interface Signup {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  type: string;
  profilePic: string;
}

interface UserProfile {
  data?: Signup;
  isLoading: boolean;
  error: string | null;
}

/** A per-user list in the store (sales and wish lists are filed by user id) */
interface UserList {
  allIds?: string[];
  isLoading?: boolean;
}

interface PublisherSummary {
  titleCount?: number;
  issueCount?: number;
}

interface RootState {
  userProfile: UserProfile;  // ✅ Changed from signups to userProfile
  publishers?: { byId: Record<string, { data?: PublisherSummary }>; allIds: string[]; isLoading: boolean };
  sales?: Record<string, UserList>;
  wishlists?: Record<string, UserList>;
}

/** Totals for the "Your Hero-Log" tiles; null while that part is still loading */
export interface ProfileStats {
  publishers: number | null;
  titles: number | null;
  issues: number | null;
  forSale: number | null;
  wishList: number | null;
}

const listCount = (list: UserList | undefined): number | null =>
  !list || (list.isLoading && !list.allIds?.length) ? null : list.allIds?.length ?? 0;

export const selectProfileStats = (state: RootState, userId: string): ProfileStats => {
  const { publishers } = state;
  const loaded = publishers && !(publishers.isLoading && !publishers.allIds?.length);
  const summaries = (publishers?.allIds ?? []).map(id => publishers?.byId[id]?.data ?? {});

  return {
    publishers: loaded ? summaries.length : null,
    titles: loaded ? summaries.reduce((sum, p) => sum + (Number(p.titleCount) || 0), 0) : null,
    issues: loaded ? summaries.reduce((sum, p) => sum + (Number(p.issueCount) || 0), 0) : null,
    forSale: listCount(state.sales?.[userId]),
    wishList: listCount(state.wishlists?.[userId]),
  };
};

function mapStateToProps(state: RootState) {
  const { userProfile } = state;
  
  // ✅ Convert single user object to array for component compatibility
  const signups = userProfile?.data ? [userProfile.data] : [];
  
  return { 
    signups, 
    isLoading: userProfile?.isLoading || false,
    stats: selectProfileStats(state, localStorage.getItem('id') || ''),
  };
}

const mapDispatchToProps = {
  fetchUser,
  deleteUser,
  fetchPublishers,
  fetchSales,
  fetchWishlists,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;
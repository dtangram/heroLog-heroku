import { connect, ConnectedProps } from 'react-redux';
import { RootState } from '../../store';
import { 
  fetchWishlists,  // Fixed: was fetchWishLists
  deleteWishlist,  // Fixed: was deleteWishList
} from '../../store/wishlist/actions';

const mapStateToProps = (state: RootState) => {
  return {
    wishlists: state?.wishlists || {},
  };
};

const mapDispatchToProps = {
  fetchWishlists,  // Fixed: was fetchWishLists
  deleteWishlist,  // Fixed: was deleteWishList
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;
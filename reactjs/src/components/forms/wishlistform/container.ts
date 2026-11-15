import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { 
  fetchWishlist, 
  createWishlist, 
  updateWishlist, 
  WishlistComic 
} from '../../../store/wishlist/actions';
import WishListForm from './WishListForm';

/**
 * Every loaded wishlist comic, keyed by its id. The form picks the one whose
 * :id is in the URL; on the "Add New" page there's no id, so it starts empty.
 * (Previously this always returned an empty wishlist, so Edit never filled in the form.)
 */
export const mapStateToProps = (state: RootState) => {
  const wishlistsById: Record<string, WishlistComic> = {};

  Object.values(state.wishlists || {}).forEach(userState => {
    Object.entries(userState?.byId || {}).forEach(([comicId, comicState]) => {
      if (comicState?.data) {
        wishlistsById[comicId] = comicState.data;
      }
    });
  });

  return { wishlistsById };
};

const mapDispatchToProps = {
  fetchWishList: fetchWishlist,
  createWishList: createWishlist,
  updateWishList: updateWishlist,
};

export default connect(mapStateToProps, mapDispatchToProps)(WishListForm);
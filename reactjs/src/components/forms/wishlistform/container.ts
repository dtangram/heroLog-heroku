import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { 
  fetchWishlist, 
  createWishlist, 
  updateWishlist, 
  WishlistComic 
} from '../../../store/wishlist/actions';
import WishListForm from './WishListForm';

const mapStateToProps = (state: RootState) => {
  const userId = localStorage.getItem('id') || '';
 
  const defaultWishlist: WishlistComic = {
    id: '',
    comicBookTitle: '',
    comicIssue: '',
    comicBookVolume: '',
    comicBookYear: '',
    comicBookPublisher: '',
    comicBookCover: '',
    type: '',
    userId,
  };
 
  // Return default wishlist since the component will fetch based on id from useParams
  return { wishlist: defaultWishlist };
};

const mapDispatchToProps = {
  fetchWishList: fetchWishlist,
  createWishList: createWishlist,
  updateWishList: updateWishlist,
};

export default connect(mapStateToProps, mapDispatchToProps)(WishListForm);
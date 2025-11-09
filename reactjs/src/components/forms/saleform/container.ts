import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { fetchSale, createSale, updateSale, SaleComic } from '../../../store/sale/actions';
import SaleForm from './SaleForm';

const mapStateToProps = (state: RootState) => {
  const userId = localStorage.getItem('id') || '';
  
  const defaultSale: SaleComic = {
    id: '',
    comicBookTitle: '',
    comicIssue: '',
    comicBookVolume: '',
    comicBookYear: '',
    comicBookPublisher: '',
    comicBookCover: '',
    type: '',
    userId
  };
  
  // Return default sale since the component will fetch based on id from useParams
  return { sale: defaultSale };
};

const mapDispatchToProps = {
  fetchSale,
  createSale,
  updateSale
};

export default connect(mapStateToProps, mapDispatchToProps)(SaleForm);
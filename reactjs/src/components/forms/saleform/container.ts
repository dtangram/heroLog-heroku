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
  
  // Get the current user's sales
  const userSales = state.sales?.[userId];
  
  if (!userSales || !userSales.byId) {
    console.log('🔍 No sales found for user:', userId);
    return { sale: defaultSale };
  }
  
  // Find the most recently loaded single sale (from fetchSale action)
  const sales = Object.values(userSales.byId);
  const mostRecentSale = sales.reduce((latest, current) => {
    if (!current?.data) return latest;
    if (!latest) return current.data;
    if (current.loadedAt > (sales.find(s => s.data.id === latest.id)?.loadedAt || 0)) {
      return current.data;
    }
    return latest;
  }, null as SaleComic | null);
  
  console.log('🔍 Container mapStateToProps:');
  console.log('  - User ID:', userId);
  console.log('  - Most recent sale:', mostRecentSale);
  console.log('  - All sale IDs:', userSales.allIds);
  
  return { 
    sale: mostRecentSale || defaultSale 
  };
};

const mapDispatchToProps = {
  fetchSale,
  createSale,
  updateSale
};

export default connect(mapStateToProps, mapDispatchToProps)(SaleForm);
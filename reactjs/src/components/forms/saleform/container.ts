import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { fetchSale, createSale, updateSale, SaleComic } from '../../../store/sale/actions';
import SaleForm from './SaleForm';

/**
 * Every loaded sale comic, keyed by its id. The form picks the one whose
 * :id is in the URL; on the "Add New" page there's no id, so it starts empty.
 * (Previously this returned the most recently loaded sale, so Add New opened with the last sale's details.)
 */
export const mapStateToProps = (state: RootState) => {
  const salesById: Record<string, SaleComic> = {};

  Object.values(state.sales || {}).forEach(userState => {
    Object.entries(userState?.byId || {}).forEach(([comicId, comicState]) => {
      if (comicState?.data) {
        salesById[comicId] = comicState.data;
      }
    });
  });

  return { salesById };
};

const mapDispatchToProps = {
  fetchSale,
  createSale,
  updateSale
};

export default connect(mapStateToProps, mapDispatchToProps)(SaleForm);
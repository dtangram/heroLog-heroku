import { connect, ConnectedProps } from 'react-redux';
import { fetchSales, deleteSale } from '../../store/sale/actions';

interface Sale {
  id: string;
  comicBookTitle: string;
  comicIssue: number;
  comicBookVolume: number;
  comicBookYear: number;
  comicBookPublisher: string;
  type: string;
  comicBookCover: string;
  /** Dollars as text, e.g. "12.50" (null on listings made before prices existed) */
  price?: string | null;
  /** Standard comic grade, e.g. "Near Mint" */
  comicCondition?: string | null;
}

interface SaleData {
  allIds: string[];
  byId: Record<string, { data: Sale }>;
  isLoading: boolean;
}

interface Sales {
  [userId: string]: SaleData;
}

interface RootState {
  sales: Sales;
}

function mapStateToProps(state: RootState) {
  const { sales = {} } = state;
  return { sales };
}

const mapDispatchToProps = { 
  fetchSales, 
  deleteSale 
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type ConnectorProps = ConnectedProps<typeof connector>;

export default connector;
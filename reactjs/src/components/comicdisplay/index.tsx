import { Container, Row, Col } from 'reactstrap';
import '../../css/main.css';
import item1 from '../../img/item1.jpg';
import item2 from '../../img/item2.jpg';
import item3 from '../../img/item3.jpg';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ComicImage {
  src: string;
  alt: string;
  title?: string;
}

interface ComicDisplayProps {
  images?: ComicImage[];
  columns?: 2 | 3 | 4;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_IMAGES: ComicImage[] = [
  {
    src: item1,
    alt: 'Comic book item 1',
    title: 'Featured Comic 1'
  },
  {
    src: item2,
    alt: 'Comic book item 2',
    title: 'Featured Comic 2'
  },
  {
    src: item3,
    alt: 'Comic book item 3',
    title: 'Featured Comic 3'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getColumnSize = (columns: number): string => {
  const sizeMap: Record<number, string> = {
    2: '6',
    3: '4',
    4: '3'
  };
  return sizeMap[columns] || '4';
};

// ============================================================================
// COMPONENT
// ============================================================================

const ComicDisplay = ({
  images = DEFAULT_IMAGES,
  columns = 3,
  className = ''
}: ComicDisplayProps) => {
  const columnSize = getColumnSize(columns);

  return (
    <Container fluid className={`container ${className}`.trim()}>
      <Row className="row">
        {images.map((image, index) => (
          <Col 
            key={index} 
            sm="12" 
            md={columnSize}
            className="mb-4"
          >
            <figure className="figure">
              <img 
                src={image.src} 
                alt={image.alt}
                title={image.title}
                className="img-fluid"
                loading="lazy"
              />
              {image.title && (
                <figcaption className="figure-caption text-center mt-2">
                  {image.title}
                </figcaption>
              )}
            </figure>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default ComicDisplay;
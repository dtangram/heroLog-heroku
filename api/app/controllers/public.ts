import { Request, Response } from 'express';

/**
 * Extended Request interface with custom API property
 */
interface ExtendedRequest extends Request {
  API: {
    get: (path: string) => Promise<HomeData>;
  };
}

/**
 * Interface for home page data
 */
interface HomeData {
  // Add your actual home data structure here
  // Example properties:
  title?: string;
  content?: string;
  data?: Record<string, string | number | boolean>;
  // Add more fields as needed based on your API response
}

/**
 * Render home page
 */
export const renderHome = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const home = await req.API.get('/');
    res.render('../../../reactjs/src/components/home', { home });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).render('error', { 
      message: 'Failed to load home page' 
    });
  }
};

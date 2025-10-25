import { Request, Response, NextFunction } from 'express';
import { check, validationResult, ValidationChain, FieldValidationError, ValidationError } from 'express-validator';

/**
 * Type guard to check if error is a FieldValidationError
 */
const isFieldValidationError = (error: ValidationError): error is FieldValidationError => {
  return error.type === 'field';
};

/**
 * Validation chains for different fields
 */
const checks = {
  firstname: check('firstname')
    .exists().withMessage('First name is required')
    .isLength({ min: 2 })
    .withMessage('First name is required to be with at least 2 characters.'),
    
  lastname: check('lastname')
    .exists().withMessage('Last name is required')
    .isLength({ min: 2 })
    .withMessage('Last name is required to be with at least 2 characters.'),
    
  username: check('username')
    .exists().withMessage('Username is required')
    .isLength({ min: 2 })
    .withMessage('Username is required to be with at least 2 characters.'),
    
  email: check('email')
    .exists().withMessage('Email is required.')
    .isEmail()
    .withMessage('Email field must be valid.')
    .normalizeEmail(),
    
  password: check('password')
    .exists().withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password is required to be at least 8 characters.'),
    
  typeS: check('type')
    .exists().withMessage('Signup type is required.')
    .isIn(['regular', 'fixer'])
    .withMessage('Signup must be Regular or Fixer.')
    .toLowerCase(),
    
  // Integer ID validation (for legacy tables)
  idInt: check('id')
    .exists().withMessage('ID is required.')
    .isInt({ min: 1 })
    .withMessage('ID must be a valid positive integer.')
    .toInt(),
  
  // UUID ID validation (for new tables using UUIDs)
  idUUID: check('id')
    .exists().withMessage('ID is required.')
    .isUUID(4)
    .withMessage('ID must be a valid UUID.')
    .trim(),
    
  name: check('name')
    .exists().withMessage('Name is required.')
    .isLength({ min: 3 })
    .withMessage('Name is required to be at least 3 characters.')
    .trim(),
    
  subject: check('subject')
    .exists().withMessage('Subject is required.')
    .isLength({ min: 3 })
    .withMessage('Subject is required to be at least 3 characters.')
    .trim(),
    
  message: check('message')
    .exists().withMessage('Message is required.')
    .isLength({ min: 10 })
    .withMessage('Message is required to be at least 10 characters.')
    .trim(),
    
  typeRV: check('type')
    .exists().withMessage('Comic Book type is required.')
    .isIn(['regular', 'variant'])
    .withMessage('Comic Book must be regular or variant.')
    .toLowerCase(),
    
  userId: check('userId')
    .exists().withMessage('User ID is required.')
    .isInt({ min: 1 })
    .withMessage('User ID must be a valid positive integer.')
    .toInt(),
    
  cbTitle: check('cbTitle')
    .exists().withMessage('Comic Book title is required.')
    .isLength({ min: 1 })
    .withMessage('Comic Book title is required to be at least 1 character.')
    .trim(),
    
  collectpubId: check('collectpubId')
    .exists().withMessage('Publisher ID is required.')
    .isInt({ min: 1 })
    .withMessage('Publisher ID must be a valid positive integer.')
    .toInt(),
    
  title: check('title')
    .exists().withMessage('Comic Book issue title is required')
    .isLength({ min: 1 })
    .withMessage('Comic Book issue title is required to be at least 1 character.')
    .trim(),
    
  publisherName: check('publisherName')
    .exists().withMessage('Publisher name is required')
    .isLength({ min: 2 })
    .withMessage('Publisher name is required to be at least 2 characters.')
    .trim(),
    
  comicbooktitlerelId: check('comicbooktitlerelId')
    .exists().withMessage('Comic Book Title ID is required.')
    .isInt({ min: 1 })
    .withMessage('Comic Book Title ID must be a valid positive integer.')
    .toInt(),
    
  comicBookTitle: check('comicBookTitle')
    .exists().withMessage('Comic Book title is required.')
    .isLength({ min: 1 })
    .withMessage('Comic Book title is required to be at least 1 character.')
    .trim(),
    
  comicIssue: check('comicIssue')
    .exists().withMessage('Comic issue is required.')
    .trim(),
    
  comicBookVolume: check('comicBookVolume')
    .exists().withMessage('Comic book volume is required.')
    .trim(),
    
  comicBookYear: check('comicBookYear')
    .exists().withMessage('Comic book year is required.')
    .trim(),
    
  comicBookPublisher: check('comicBookPublisher')
    .exists().withMessage('Comic book publisher is required.')
    .trim(),
    
  comicBookCover: check('comicBookCover')
    .exists().withMessage('Comic book cover is required.')
    .trim(),
    
  saleUsersId: check('saleUsersId')
    .exists().withMessage('Sale user ID is required.')
    .isInt({ min: 1 })
    .withMessage('Sale user ID must be a valid positive integer.')
    .toInt(),
    
  wishUsersId: check('wishUsersId')
    .exists().withMessage('Wish user ID is required.')
    .isInt({ min: 1 })
    .withMessage('Wish user ID must be a valid positive integer.')
    .toInt(),
    
  messageUsersId: check('messageUsersId')
    .exists().withMessage('Message user ID is required.')
    .isInt({ min: 1 })
    .withMessage('Message user ID must be a valid positive integer.')
    .toInt(),
    
  userSent: check('userSent')
    .exists().withMessage('User sent ID is required.')
    .isInt({ min: 1 })
    .withMessage('User sent ID must be a valid positive integer.')
    .toInt(),
    
  // FIXED: Changed from integer to UUID validation
  collectpubUsersId: check('collectpubUsersId')
    .exists().withMessage('Collection publisher user ID is required.')
    .isUUID(4)
    .withMessage('Collection publisher user ID must be a valid UUID.')
    .trim(),
};

/**
 * Middleware to check for validation errors
 */
const checkForErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  const errors = validationResult(req);
  
  // ADD LOGGING
  console.log('🔍 VALIDATION CHECK');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Has errors:', !errors.isEmpty());
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: isFieldValidationError(error) ? error.path : 'general',
      message: error.msg
    }));
    
    console.log('❌ VALIDATION ERRORS:', JSON.stringify(formattedErrors, null, 2));
    
    return res.status(400).json({
      success: false,
      errors: formattedErrors
    });
  }
  
  console.log('✅ VALIDATION PASSED - Proceeding to controller');
  return next();
};

/**
 * Validation method selector
 */
export const validate = (method: string): Array<ValidationChain | typeof checkForErrors> => {
  switch (method) {
    case 'signup': {
      return [
        checks.username,
        checks.firstname,
        checks.lastname,
        checks.email,
        checks.password,
        checks.typeS,
        checkForErrors,
      ];
    }

    case 'signin': {
      return [
        checks.username,
        checks.password,
        checkForErrors
      ];
    }

    case 'createCollectionPublisher': {
      return [
        checks.publisherName,
        checks.collectpubUsersId,
        checkForErrors
      ];
    }

    case 'editCollectionPublisher': {
      return [
        checks.idUUID,  // Changed from checks.id to checks.idUUID
        checks.publisherName,
        checkForErrors
      ];
    }

    case 'deleteCollectionPublisher': {
      return [
        checks.idUUID,  // Changed from checks.id to checks.idUUID
        checkForErrors
      ];
    }

    case 'createComicBookTitle': {
      return [
        checks.cbTitle,
        checkForErrors
      ];
    }

    case 'editComicBookTitle': {
      return [
        checks.idInt,  // Using integer ID
        checks.cbTitle,
        checkForErrors
      ];
    }

    case 'deleteComicBookTitle': {
      return [
        checks.idInt,  // Using integer ID
        checkForErrors
      ];
    }

    case 'createComicBook': {
      return [
        checks.title,
        checks.typeRV,
        checkForErrors
      ];
    }

    case 'editComicBook': {
      return [
        checks.idInt,  // Using integer ID
        checks.title,
        checks.typeRV,
        checkForErrors
      ];
    }

    case 'deleteComicBook': {
      return [
        checks.idInt,  // Using integer ID
        checkForErrors
      ];
    }

    case 'createMessaging': {
      return [
        checks.name,
        checks.email,
        checks.subject,
        checks.message,
        checks.messageUsersId,
        checks.userSent,
        checkForErrors
      ];
    }

    case 'editMessaging': {
      return [
        checks.idInt,  // Using integer ID
        checks.name,
        checks.email,
        checks.subject,
        checks.message,
        checkForErrors
      ];
    }

    case 'deleteMessaging': {
      return [
        checks.idInt,  // Using integer ID
        checkForErrors
      ];
    }

    case 'createSaleList': {
      return [
        checks.comicBookTitle,
        checks.comicIssue,
        checks.comicBookVolume,
        checks.comicBookYear,
        checks.comicBookPublisher,
        checks.comicBookCover,
        checks.typeRV,
        checks.saleUsersId,
        checkForErrors
      ];
    }

    case 'editSaleList': {
      return [
        checks.idInt,  // Using integer ID
        checks.comicBookTitle,
        checks.typeRV,
        checkForErrors
      ];
    }

    case 'deleteSaleList': {
      return [
        checks.idInt,  // Using integer ID
        checkForErrors
      ];
    }

    case 'createWishList': {
      return [
        checks.comicBookTitle,
        checks.comicIssue,
        checks.comicBookVolume,
        checks.comicBookYear,
        checks.comicBookPublisher,
        checks.comicBookCover,
        checks.typeRV,
        checks.wishUsersId,
        checkForErrors
      ];
    }

    case 'editWishList': {
      return [
        checks.idInt,  // Using integer ID
        checks.comicBookTitle,
        checks.typeRV,
        checkForErrors
      ];
    }

    case 'deleteWishList': {
      return [
        checks.idInt,  // Using integer ID
        checkForErrors
      ];
    }

    case 'resetPassword': {
      return [
        checks.email,
        checks.password,
        checkForErrors
      ];
    }

    default: {
      return [];
    }
  }
};
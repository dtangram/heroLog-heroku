import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import PrivateRouteHandler from './privateRoute';
import store from './store';
import './css/main.css';
import './css/reset.css';
import './js/index';

import Header from './components/header';
import Landing from './components/landing';
import Signup from './components/forms/signup';
import Signin from './components/forms/signin';
import Home from './components/home';
import Dashboard from './components/dashboard';
import ModalMessage from './components/forms/messaging';
import ReplyMessage from './components/forms/reply';
import ViewMessages from './components/viewMessages';
import SentMessages from './components/sentMessages';
import ComicBookList from './components/dashboard/comicbooklist';
import ComicBookListIssues from './components/dashboard/comicbooklistissues';
import CreatePublisher from './components/forms/createpublisher';
import ComicBookListTitle from './components/forms/comicbooklisttitle';
import ComicBook from './components/forms/comicbook';
import Fixer from './components/fixer';
import Sale from './components/sale';
import SaleForm from './components/forms/saleform';
import WishList from './components/wishlist';
import WishListForm from './components/forms/wishlistform';
import EmailPasswordReset from './components/forms/emailpasswordreset';
import PasswordReset from './components/forms/passwordreset';
import Profile from './components/profile';
import ProfileForm from './components/forms/profileform';
import Footer from './components/footer';

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <div id="main">
          <Header />
          <Routes>
            {/* Public Routes */}
            <Route path="/landing" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/forms/emailpasswordreset" element={<EmailPasswordReset />} />
            <Route path="/forms/passwordreset/:token" element={<PasswordReset />} />

            {/* Private Routes */}
            <Route path="/" element={<PrivateRouteHandler><Home /></PrivateRouteHandler>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route 
              path="/forms/messaging/:userId/:comicBookTitle/:comicIssue/:userSent/:username/:userEmail" 
              element={<PrivateRouteHandler><ModalMessage /></PrivateRouteHandler>} 
            />
            <Route 
              path="/forms/reply/:messageID/:userId/:comicBookTitle/:prevMessage/:userSent/:username/:userEmail" 
              element={<PrivateRouteHandler><ReplyMessage /></PrivateRouteHandler>} 
            />
            <Route path="/viewMessages/:userId" element={<PrivateRouteHandler><ViewMessages /></PrivateRouteHandler>} />
            <Route path="/sentMessages/:userId" element={<PrivateRouteHandler><SentMessages /></PrivateRouteHandler>} />
            <Route path="/forms/createpublisher/new" element={<CreatePublisher />} />
            <Route path="/forms/createpublisher/edit/:id" element={<CreatePublisher />} />
            <Route path="/dashboard/:pubId/:publisherName/comicbooklist" element={<ComicBookList />} />
            <Route path="/forms/:pubId/:publisherName/comicbooklisttitle/new" element={<ComicBookListTitle />} />
            <Route path="/forms/:pubId/:publisherName/comicbooklisttitle/edit/:id" element={<ComicBookListTitle />} />
            <Route path="/dashboard/:coboTitleId/:cbTitle/comicbooklistissues" element={<ComicBookListIssues />} />
            <Route path="/forms/:coboTitleId/comicbook/new" element={<ComicBook />} />
            <Route path="/forms/:coboTitleId/comicbook/edit/:id" element={<ComicBook />} />
            <Route path="/fixer/:userId" element={<PrivateRouteHandler><Fixer /></PrivateRouteHandler>} />
            <Route path="/sale/:userId" element={<PrivateRouteHandler><Sale /></PrivateRouteHandler>} />
            <Route 
              path="/forms/saleform/new/:userId" 
              element={<PrivateRouteHandler><SaleForm /></PrivateRouteHandler>} 
            />
            <Route 
              path="/forms/saleform/edit/:id" 
              element={<PrivateRouteHandler><SaleForm /></PrivateRouteHandler>} 
            />
            <Route path="/wishlist" element={<WishList />} />
            <Route path="/forms/wishlistform/new" element={<WishListForm />} />
            <Route path="/forms/wishlistform/edit/:id" element={<WishListForm />} />
            <Route path="/profile/:userId" element={<PrivateRouteHandler><Profile /></PrivateRouteHandler>} />
            <Route 
              path="/forms/profileform/edit/:id" 
              element={<PrivateRouteHandler><ProfileForm /></PrivateRouteHandler>} 
            />
          </Routes>
          <Footer />
        </div>
      </Router>
    </Provider>
  );
};

export default App;
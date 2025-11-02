import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { connect, ConnectedProps } from 'react-redux';
import { fetchUserProfile } from './store/user/actions';

interface UserData {
  id: string;
}

interface User {
  data?: UserData;
  isLoading: boolean;
}

interface Signins {
  id?: string;
}

interface RootState {
  userProfile: User;  // ✅ Changed from 'user' to 'userProfile'
  signins: Signins;
}

// Map state to props
const mapStateToProps = (state: RootState) => ({
  user: state.userProfile,  // ✅ Changed from state.user to state.userProfile
  signins: state.signins
});

// Map dispatch to props
const mapDispatchToProps = {
  fetchUser: fetchUserProfile
};

// Create connector
const connector = connect(mapStateToProps, mapDispatchToProps);

// Get the props type from connector
type PropsFromRedux = ConnectedProps<typeof connector>;

// Component props interface
interface PrivateRouteHandlerProps extends PropsFromRedux {
  children: React.ReactNode;
}

const PrivateRouteHandler = ({ 
  children, 
  user, 
  signins, 
  fetchUser 
}: PrivateRouteHandlerProps) => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = signins?.id || localStorage.getItem('id');
   
    if (token && token !== 'undefined' && userId) {
      fetchUser(userId);
    }
   
    setLoading(false);
  }, [fetchUser, signins?.id]);

  useEffect(() => {
    if (signins?.id) {
      setLoading(true);
    }
    setLoading(false);
  }, [signins]);

  if (user?.isLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!user || !user.data) {
    return (
      <Navigate
        to="/landing"
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default connector(PrivateRouteHandler);
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { connect } from 'react-redux';
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
  user: User;
  signins: Signins;
}

interface PrivateRouteHandlerProps {
  children: React.ReactNode;
  user?: User;  // Fixed: made optional
  signins?: Signins;  // Fixed: made optional
  fetchUser: () => void;
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
   
    if (token && token !== 'undefined') {
      fetchUser();
    }
   
    setLoading(false);
  }, [fetchUser]);

  useEffect(() => {
    if (signins?.id) {  // Fixed: added optional chaining
      setLoading(true);
    }
    setLoading(false);
  }, [signins]);

  // Fixed: added defensive checks with optional chaining
  if (user?.isLoading || loading) {
    return <div>Loading</div>;
  }

  // Fixed: check if user exists before checking data
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

const mapStateToProps = (state: RootState) => ({
  user: state.user || undefined,  // Fixed: provide fallback
  signins: state.signins || undefined  // Fixed: provide fallback
});

const mapDispatchToProps = {
  fetchUser: fetchUserProfile
};

export default connect(mapStateToProps, mapDispatchToProps)(PrivateRouteHandler);
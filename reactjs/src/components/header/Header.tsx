import { useState, useEffect, useCallback } from 'react';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  Nav,
  NavItem,
  Container,
} from 'reactstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import styles from './styles.module.scss';

// ============================================================================
// COMPONENT
// ============================================================================

const Header = ({
  user,
  signins,
  logout,
  fetchUserProfile,
}: ConnectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const screenwidth = window?.innerWidth <= 991;
  const userId = localStorage?.getItem('id') ?? getAnonymousUserId();

  // Fetch login user on mount
  useEffect(() => {
    fetchUserProfile?.(userId);
  }, [fetchUserProfile]);

  // Fetch login user when signin changes
useEffect(() => {
  const userId = signins?.id || localStorage.getItem('id');
  
  if (userId) {
    fetchUserProfile(userId);  // ✅ Pass the userId!
  }
}, [signins?.id, fetchUserProfile]);

  // Toggle navbar
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Toggle menu item (close on mobile)
  const toggleMenuItem = useCallback(() => {
    if (screenwidth) {
      setIsOpen(prev => !prev);
    }
  }, [screenwidth]);

  // Handle user logout
  const logUserOut = useCallback(() => {
    localStorage?.removeItem('token');
    localStorage?.removeItem('id');
    localStorage?.removeItem('data');
    localStorage?.removeItem('reloadApp');
    
    logout?.();
    window.location.href = '/landing';
  }, [logout, navigate]);

  // Helper to get active class name
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `${styles.link} ${isActive ? styles.active : ''}`;

  // Render unauthenticated header
  if (!user?.data) {
    return (
      <header className="fixed-top">
        <article className="logoWrap">
          <NavLink to="/landing">
            <section className="logo">
              <figure>
                <img src={logo} title="Hero-Log Home" alt="Hero-Log Logo" />
              </figure>
              <h1>Hero-Log</h1>
            </section>
          </NavLink>
        </article>

        <Navbar dark expand="lg" className={styles.nav}>
          <Container>
            <NavbarToggler onClick={toggle} />
            <Collapse id="navbarResponsive" isOpen={isOpen} navbar>
              <Nav className="mr-auto" navbar>
                <NavItem className={styles.slideUnder}>
                  <NavLink
                    end
                    className={getNavLinkClass}
                    to="/landing"
                    onClick={toggleMenuItem}
                  >
                    HOME
                  </NavLink>
                </NavItem>

                <NavItem className={styles.slideUnder}>
                  <NavLink
                    className={getNavLinkClass}
                    to={`/dashboard/${userId}`}
                    onClick={toggleMenuItem}
                  >
                    DASHBOARD
                  </NavLink>
                </NavItem>

                <NavItem className={styles.slideUnder}>
                  <NavLink
                    className={getNavLinkClass}
                    to={`/forms/createpublisher/new/${userId}`}
                    onClick={toggleMenuItem}
                  >
                    CREATE
                  </NavLink>
                </NavItem>

                <NavItem className={styles.slideUnder}>
                  <NavLink
                    className={getNavLinkClass}
                    to={`/insights/${userId}`}
                    onClick={toggleMenuItem}
                  >
                    INSIGHTS
                  </NavLink>
                </NavItem>

                <NavItem className={styles.slideUnder}>
                  <NavLink
                    className={getNavLinkClass}
                    to="/signup"
                    onClick={toggleMenuItem}
                  >
                    SIGNUP
                  </NavLink>
                </NavItem>

                <NavItem className={styles.slideUnder}>
                  <NavLink
                    className={getNavLinkClass}
                    to="/signin"
                    onClick={toggleMenuItem}
                  >
                    SIGNIN
                  </NavLink>
                </NavItem>
              </Nav>
            </Collapse>
          </Container>
        </Navbar>
      </header>
    );
  }

  // Render authenticated header
  return (
    <header className="fixed-top">
      <article className="logoWrap">
        <NavLink to="/">
          <section className="logo">
            <figure>
              <img src={logo} title="Hero-Log Home" alt="Hero-Log Logo" />
            </figure>
            <h1>Hero-Log</h1>
          </section>
        </NavLink>
      </article>

      <Navbar dark expand="lg" className={styles.nav}>
        <Container>
          <NavbarToggler onClick={toggle} />
          <Collapse id="navbarResponsive" isOpen={isOpen} navbar>
            <Nav className="mr-auto" navbar>
              <NavItem className={styles.slideUnder}>
                <NavLink
                  end
                  className={getNavLinkClass}
                  to="/"
                  onClick={toggleMenuItem}
                >
                  HOME
                </NavLink>
              </NavItem>

              <NavItem className={styles.slideUnder}>
                <NavLink
                  className={getNavLinkClass}
                  to={`/dashboard/${userId}`}
                  onClick={toggleMenuItem}
                >
                  DASHBOARD
                </NavLink>
              </NavItem>

              <NavItem className={styles.slideUnder}>
                <NavLink
                  className={getNavLinkClass}
                  to={`/forms/createpublisherProfile/new/${userId}`}
                  onClick={toggleMenuItem}
                >
                  CREATE
                </NavLink>
              </NavItem>

              <NavItem className={styles.slideUnder}>
                <NavLink
                  className={getNavLinkClass}
                  to={`/insights/${userId}`}
                  onClick={toggleMenuItem}
                >
                  INSIGHTS
                </NavLink>
              </NavItem>

              <NavItem className={styles.slideUnder}>
                <NavLink
                  className={getNavLinkClass}
                  to={`/sale/${userId}`}
                  onClick={toggleMenuItem}
                >
                  SALE
                </NavLink>
              </NavItem>

              <NavItem className={styles.slideUnder}>
                <NavLink
                  className={getNavLinkClass}
                  to={`/wishlist/${userId}`}
                  onClick={toggleMenuItem}
                >
                  WISH
                </NavLink>
              </NavItem>

              <NavItem className={styles.slideUnder}>
                <NavLink
                  className={getNavLinkClass}
                  to={`/profile/${userId}`}
                  onClick={toggleMenuItem}
                >
                  PROFILE
                </NavLink>
              </NavItem>

              <NavItem className={styles.slideUnder}>
                <NavLink
                  className={styles.link}
                  to=""
                  onClick={(e) => {
                    e.preventDefault();
                    logUserOut();
                    toggleMenuItem();
                  }}
                >
                  SIGNOUT
                </NavLink>
              </NavItem>
            </Nav>
          </Collapse>
        </Container>
        {user.data?.profilePic && (
          <figure>
            <img 
              src={user.data.profilePic} 
              alt={`${user.data.firstname}'s profile`} 
            />
          </figure>
        )}
      </Navbar>
    </header>
  );
};

export default Header;
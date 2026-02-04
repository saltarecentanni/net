/**
 * TIESSE Matrix Network - Authentication Module
 * Version: 3.5.044
 * 
 * Simple authentication for edit mode:
 * - Public: View, Print, Export
 * - Authenticated: Add, Edit, Delete, Import, Clear
 * 
 * Security Features (v3.5.044):
 * - CSRF token support for all POST requests
 * - localStorage cleanup on logout
 */

'use strict';

var Auth = (function() {
    var isLoggedIn = false;
    var currentUser = null;
    var csrfToken = null; // CSRF token for secure POST requests
    
    // Check auth status on load
    function init() {
        checkAuth().then(function() {
            updateUI();
        });
    }
    
    // Check if user is authenticated
    function checkAuth() {
        return fetch('api/auth.php?action=check', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                isLoggedIn = data.authenticated === true;
                currentUser = data.user || null;
                // Capture CSRF token if provided
                if (data.csrfToken) {
                    csrfToken = data.csrfToken;
                }
                return isLoggedIn;
            })
            .catch(function(err) {
                Debug.warn('Auth check failed:', err);
                isLoggedIn = false;
                currentUser = null;
                csrfToken = null;
                return false;
            });
    }
    
    // Login with username and password
    function login(username, password) {
        return fetch('api/auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username: username, password: password })
        })
        .then(function(r) {
            if (!r.ok) {
                return r.json().then(function(data) {
                    throw new Error(data.error || 'Login failed');
                });
            }
            return r.json();
        })
        .then(function(data) {
            isLoggedIn = true;
            currentUser = data.user;
            // Capture CSRF token from login response
            if (data.csrfToken) {
                csrfToken = data.csrfToken;
            }
            
            // Try to acquire edit lock
            if (typeof EditLock !== 'undefined') {
                return EditLock.acquire(currentUser).then(function(lockResult) {
                    if (!lockResult.success) {
                        // Lock conflict - show warning and logout
                        isLoggedIn = false;
                        currentUser = null;
                        return EditLock.showLockConflict(lockResult.lockedBy, lockResult.remaining)
                            .then(function(retry) {
                                if (retry) {
                                    // Retry login
                                    return login(username, password);
                                } else {
                                    updateUI();
                                    hideLoginModal();
                                    throw new Error('Edit locked by ' + lockResult.lockedBy);
                                }
                            });
                    }
                    
                    // Lock acquired successfully
                    updateUI();
                    
                    // Refresh lists to show edit buttons
                    if (typeof updateDevicesList === 'function') updateDevicesList();
                    if (typeof updateConnectionsList === 'function') updateConnectionsList();
                    
                    // Log the login
                    if (typeof ActivityLog !== 'undefined') {
                        ActivityLog.add('login', 'auth', 'User logged in: ' + currentUser);
                    }
                    
                    Toast.success('Login successful! Edit mode active.');
                    hideLoginModal();
                    return data;
                });
            }
            
            // No EditLock module - continue without lock
            updateUI();
            
            // Refresh lists to show edit buttons
            if (typeof updateDevicesList === 'function') updateDevicesList();
            if (typeof updateConnectionsList === 'function') updateConnectionsList();
            
            // Log the login
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('login', 'auth', 'User logged in: ' + currentUser);
            }
            
            Toast.success('Login successful! Edit mode active.');
            hideLoginModal();
            return data;
        })
        .catch(function(err) {
            Toast.error('Invalid credentials');
            throw err;
        });
    }
    
    // Clear sensitive data from localStorage
    function clearLocalStorage() {
        try {
            localStorage.removeItem('networkDevices');
            localStorage.removeItem('networkConnections');
            localStorage.removeItem('networkRooms');
            localStorage.removeItem('networkSites');
            localStorage.removeItem('networkLocations');
            localStorage.removeItem('nextDeviceId');
            localStorage.removeItem('nextLocationId');
            Debug.log('localStorage cleared on logout');
        } catch (e) {
            Debug.warn('Failed to clear localStorage:', e);
        }
    }
    
    // Logout
    function logout() {
        var loggedOutUser = currentUser;
        
        // Release edit lock first
        var releaseLockPromise = (typeof EditLock !== 'undefined') 
            ? EditLock.release() 
            : Promise.resolve();
        
        return releaseLockPromise.then(function() {
            return fetch('api/auth.php?action=logout', { 
                method: 'POST',
                credentials: 'same-origin'
            });
        })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                isLoggedIn = false;
                currentUser = null;
                csrfToken = null;
                
                // Clear sensitive data from localStorage on logout
                clearLocalStorage();
                
                updateUI();
                
                // Refresh lists to hide edit buttons
                if (typeof updateDevicesList === 'function') updateDevicesList();
                if (typeof updateConnectionsList === 'function') updateConnectionsList();
                
                // Log the logout
                if (typeof ActivityLog !== 'undefined') {
                    ActivityLog.add('logout', 'auth', 'User logged out: ' + loggedOutUser);
                }
                
                Toast.info('Logged out. Read-only mode.');
                return data;
            })
            .catch(function(err) {
                Debug.error('Logout failed:', err);
                // Force local logout anyway
                isLoggedIn = false;
                currentUser = null;
                csrfToken = null;
                clearLocalStorage();
                updateUI();
            });
    }
    
    // Update UI based on auth state
    function updateUI() {
        var editElements = document.querySelectorAll('.edit-mode-only');
        var viewElements = document.querySelectorAll('.view-mode-only');
        var loginBtn = document.getElementById('loginBtn');
        var logoutBtn = document.getElementById('logoutBtn');
        var userInfo = document.getElementById('userInfo');
        var userInfoActions = document.getElementById('userInfoActions');
        var usernameActions = document.getElementById('usernameActions');
        var logoutBtnActions = document.getElementById('logoutBtnActions');
        
        if (isLoggedIn) {
            // Show edit controls
            editElements.forEach(function(el) {
                el.style.display = '';
            });
            viewElements.forEach(function(el) {
                el.style.display = 'none';
            });
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = '';
            if (userInfo) {
                userInfo.textContent = '👤 ' + currentUser;
                userInfo.style.display = '';
            }
            // Update Actions bar user info
            if (userInfoActions && usernameActions) {
                usernameActions.textContent = currentUser;
                userInfoActions.style.display = '';
            }
            if (logoutBtnActions) {
                logoutBtnActions.style.display = '';
            }
        } else {
            // Hide edit controls
            editElements.forEach(function(el) {
                el.style.display = 'none';
            });
            viewElements.forEach(function(el) {
                el.style.display = '';
            });
            if (loginBtn) loginBtn.style.display = '';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
            // Hide Actions bar user info
            if (userInfoActions) userInfoActions.style.display = 'none';
            if (logoutBtnActions) logoutBtnActions.style.display = 'none';
        }
    }
    
    // Show login modal
    function showLoginModal() {
        var modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginUsername').focus();
        }
    }
    
    // Hide login modal
    function hideLoginModal() {
        var modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // Handle login form submit
    function handleLoginSubmit(e) {
        if (e) e.preventDefault();
        var username = document.getElementById('loginUsername').value.trim();
        var password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            Toast.warning('Enter username and password');
            return;
        }
        
        login(username, password).catch(function() {
            // Error already shown by Toast
        });
    }
    
    // Public API
    return {
        init: init,
        login: login,
        logout: logout,
        checkAuth: checkAuth,
        isLoggedIn: function() { return isLoggedIn; },
        getUser: function() { return currentUser; },
        getCSRFToken: function() { return csrfToken; },
        showLoginModal: showLoginModal,
        hideLoginModal: hideLoginModal,
        handleLoginSubmit: handleLoginSubmit,
        updateUI: updateUI,
        clearLocalStorage: clearLocalStorage
    };
})();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Auth.init);
} else {
    Auth.init();
}

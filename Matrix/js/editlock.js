/**
 * TIESSE Matrix Network - Edit Lock Module
 * Version: 3.6.021
 * 
 * Prevents concurrent editing by multiple users
 * Only one editor can have the lock at a time
 */

'use strict';

var EditLock = (function() {
    var hasLock = false;
    var lockOwner = null;
    var heartbeatInterval = null;
    var editorName = null;
    var HEARTBEAT_INTERVAL = 60000; // 1 minute
    var LOCK_TIMEOUT = 300; // 5 minutes (must match server)
    
    /**
     * Get current lock status from server
     */
    function checkStatus() {
        return fetch('api/editlock.php')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.locked) {
                    lockOwner = data.editor;
                    hasLock = (data.editor === editorName);
                } else {
                    lockOwner = null;
                    hasLock = false;
                }
                return data;
            })
            .catch(function(err) {
                Debug.warn('Edit lock check failed:', err);
                return { locked: false, error: err.message };
            });
    }
    
    /**
     * Try to acquire edit lock
     */
    function acquire(editor) {
        editorName = editor || 'Admin-' + Math.random().toString(36).substring(2, 6);
        
        return fetch('api/editlock.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'acquire', editor: editorName })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                hasLock = true;
                lockOwner = editorName;
                startHeartbeat();
                Debug.log('Edit lock acquired:', editorName);
                return { success: true, editor: editorName };
            } else {
                hasLock = false;
                lockOwner = data.lockedBy;
                return {
                    success: false,
                    lockedBy: data.lockedBy,
                    message: data.message,
                    remaining: data.remaining
                };
            }
        })
        .catch(function(err) {
            Debug.error('Failed to acquire edit lock:', err);
            return { success: false, error: err.message };
        });
    }
    
    /**
     * Release edit lock
     */
    function release() {
        stopHeartbeat();
        
        if (!editorName) {
            hasLock = false;
            return Promise.resolve({ success: true });
        }
        
        return fetch('api/editlock.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'release', editor: editorName })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            hasLock = false;
            lockOwner = null;
            Debug.log('Edit lock released');
            return data;
        })
        .catch(function(err) {
            Debug.error('Failed to release edit lock:', err);
            hasLock = false;
            return { success: false, error: err.message };
        });
    }
    
    /**
     * Send heartbeat to keep lock alive
     */
    function sendHeartbeat() {
        if (!hasLock || !editorName) return;
        
        fetch('api/editlock.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'heartbeat', editor: editorName })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.success) {
                Debug.warn('Lost edit lock:', data);
                hasLock = false;
                stopHeartbeat();
                showLockLostWarning();
            }
        })
        .catch(function(err) {
            Debug.warn('Heartbeat failed:', err);
        });
    }
    
    /**
     * Start heartbeat interval
     */
    function startHeartbeat() {
        stopHeartbeat();
        heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }
    
    /**
     * Stop heartbeat interval
     */
    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }
    
    /**
     * Show warning when lock is lost
     */
    function showLockLostWarning() {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Sessione di modifica scaduta',
                html: '<p>Il lock di modifica è scaduto per inattività.</p>' +
                      '<p>Salva le modifiche e rieffettua il login.</p>',
                confirmButtonText: 'OK'
            });
        } else if (typeof Toast !== 'undefined') {
            Toast.warning('Edit session expired. Please login again.');
        }
    }
    
    /**
     * Show lock conflict dialog
     */
    function showLockConflict(lockedBy, remaining) {
        var minutes = Math.ceil(remaining / 60);
        
        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                icon: 'warning',
                title: '⚠️ Modifica in corso',
                html: '<div class="text-left">' +
                      '<p class="mb-3"><strong>' + lockedBy + '</strong> sta modificando i dati.</p>' +
                      '<p class="text-sm text-gray-600">Il lock scadrà tra circa <strong>' + minutes + ' minuti</strong> se non ci sono attività.</p>' +
                      '<hr class="my-3">' +
                      '<p class="text-sm">Opzioni:</p>' +
                      '<ul class="text-sm text-gray-600 ml-4 list-disc">' +
                      '<li>Attendi che l\'altro utente termini</li>' +
                      '<li>Contatta ' + lockedBy + ' per coordinare</li>' +
                      '</ul>' +
                      '</div>',
                confirmButtonText: 'Riprova',
                showCancelButton: true,
                cancelButtonText: 'Annulla'
            }).then(function(result) {
                return result.isConfirmed;
            });
        } else {
            return Promise.resolve(
                confirm('Modifica in corso da ' + lockedBy + '. Riprovare?')
            );
        }
    }
    
    /**
     * Release lock when page unloads
     */
    function setupBeforeUnload() {
        window.addEventListener('beforeunload', function() {
            if (hasLock && editorName) {
                // Use sendBeacon for reliable unload
                navigator.sendBeacon('api/editlock.php', JSON.stringify({
                    action: 'release',
                    editor: editorName
                }));
            }
        });
    }
    
    // Setup unload handler
    setupBeforeUnload();
    
    // Public API
    return {
        checkStatus: checkStatus,
        acquire: acquire,
        release: release,
        hasLock: function() { return hasLock; },
        getLockOwner: function() { return lockOwner; },
        getEditorName: function() { return editorName; },
        showLockConflict: showLockConflict
    };
})();

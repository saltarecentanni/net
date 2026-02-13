/**
 * Nuclear Data Recovery
 * Limpa localStorage COMPLETO 
 */

function nuclearRecovery() {
    console.log('☢️  NUCLEAR RECOVERY - Clearing ALL storage...');
    
    // Clear ALL localStorage
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Clear ALL sessionStorage  
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Force hard reload ignoring cache
    window.location.reload(true);
}

// On page startup, check if data loaded
function checkDataOnStartup() {
    setTimeout(() => {
        if (typeof appState === 'undefined') {
            console.error('❌ ERROR: appState not defined!');
            return;
        }
        
        var devCount = (appState.devices || []).length;
        var connCount = (appState.connections || []).length;
        
        console.log('📊 Startup Data Check:', { devices: devCount, connections: connCount });
        
        if (devCount === 0 && connCount === 0) {
            console.warn('⚠️  No data in appState!');
            console.error('Check console for serverLoad() errors');
            console.log('%c💥 Call nuclearRecovery() to fix, or check server API', 'background: red; color: white; padding: 8px; font-weight: bold; font-size: 14px');
            
            // DON'T auto-reload - let user decide
        } else {
            console.log('✅ Data loaded successfully');
        }
    }, 1000);
}

// Run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkDataOnStartup);
} else {
    checkDataOnStartup();
}

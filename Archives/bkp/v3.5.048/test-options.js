/**
 * Test script to diagnose the "fade" options issue for WAN/Internet and WallJack in Type dropdown
 * Run this in the browser console to check the state of the options
 */

(function() {
    console.log("=== TESTING TYPE DROPDOWN OPTIONS ===\n");
    
    // Get the connType select element
    var connTypeSelect = document.getElementById('connType');
    if (!connTypeSelect) {
        console.error("❌ connType select not found!");
        return;
    }
    
    console.log("✅ Found connType select element\n");
    
    // Test each option
    var options = connTypeSelect.querySelectorAll('option');
    console.log("Total options:", options.length);
    console.log("---\n");
    
    Array.from(options).forEach(function(opt, idx) {
        var value = opt.value;
        var text = opt.textContent;
        var disabled = opt.disabled;
        var style = opt.getAttribute('style') || 'none';
        var computedStyle = window.getComputedStyle(opt);
        var opacity = computedStyle.opacity;
        var color = computedStyle.color;
        
        var status = "✅ Normal";
        if (disabled) status = "❌ DISABLED";
        if (opacity < 1) status = "⚠️  LOW OPACITY (" + opacity + ")";
        
        console.log(idx + ". Value: '" + value + "'");
        console.log("   Text: " + text);
        console.log("   Status: " + status);
        console.log("   Inline style: " + (style === 'none' ? 'NO' : style));
        console.log("   CSS opacity: " + opacity);
        console.log("   CSS color: " + color);
        console.log("---");
    });
    
    // Specific test for WAN and WallJack
    console.log("\n=== SPECIFIC TEST: WAN/Internet and WallJack ===\n");
    
    var wanOpt = Array.from(options).find(function(o) { return o.value === 'wan'; });
    var wallportOpt = Array.from(options).find(function(o) { return o.value === 'wallport'; });
    
    if (wanOpt) {
        console.log("WAN option:");
        console.log("  - Value:", wanOpt.value);
        console.log("  - Text:", wanOpt.textContent);
        console.log("  - Disabled:", wanOpt.disabled);
        console.log("  - Style attr:", wanOpt.getAttribute('style'));
        console.log("  - Computed opacity:", window.getComputedStyle(wanOpt).opacity);
    } else {
        console.error("❌ WAN option not found!");
    }
    
    console.log();
    
    if (wallportOpt) {
        console.log("WallJack (wallport) option:");
        console.log("  - Value:", wallportOpt.value);
        console.log("  - Text:", wallportOpt.textContent);
        console.log("  - Disabled:", wallportOpt.disabled);
        console.log("  - Style attr:", wallportOpt.getAttribute('style'));
        console.log("  - Computed opacity:", window.getComputedStyle(wallportOpt).opacity);
    } else {
        console.error("❌ WallJack option not found!");
    }
    
    // Check appState
    console.log("\n=== APPSTATE CHECK ===\n");
    if (typeof appState !== 'undefined') {
        console.log("✅ appState exists");
        console.log("   - devices:", appState.devices.length);
        console.log("   - connections:", appState.connections.length);
        console.log("   - rooms:", appState.rooms.length);
    } else {
        console.error("❌ appState not defined");
    }
})();

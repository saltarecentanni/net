// Quick Diagnostic Script - Execute no console do navegador
console.clear();
console.log("=".repeat(70));
console.log("DIAGNÓSTICO RÁPIDO - PROBLEMAS DE ABAS E TOPOLOGIA");
console.log("=".repeat(70));

// 1. Verificar função switchTab
console.log("\n🔍 1. FUNÇÃO switchTab EXISTE?");
console.log("typeof switchTab:", typeof switchTab);

// 2. Verificar elementos DOM
console.log("\n🔍 2. ELEMENTOS DOM EXISTEM?");
var tabBtns = document.querySelectorAll('.tab-btn');
var tabContents = document.querySelectorAll('.tab-content');
console.log("Tab buttons encontrados:", tabBtns.length);
console.log("Tab contents encontrados:", tabContents.length);

// 3. Verificar CSS display das abas
console.log("\n🔍 3. CSS DISPLAY STATUS");
tabContents.forEach(function(el) {
    var computed = window.getComputedStyle(el);
    var display = computed.display;
    var visibility = computed.visibility;
    console.log(el.id + ":", {
        "display": display,
        "visibility": visibility,
        "has-active-class": el.classList.contains('active')
    });
});

// 4. Testar clique manual
console.log("\n🔍 4. TESTANDO switchTab('devices')");
try {
    switchTab('devices');
    console.log("✅ switchTab executado sem erros");
} catch(err) {
    console.error("❌ ERRO ao executar switchTab:", err);
}

// 5. Verificar status após clique
console.log("\n🔍 5. STATUS APÓS switchTab('devices')");
tabContents.forEach(function(el) {
    if(el.id === 'content-devices' || el.id === 'content-dashboard') {
        var computed = window.getComputedStyle(el);
        console.log(el.id + ":", {
            "display": computed.display,
            "has-active-class": el.classList.contains('active'),
            "is-visible": el.offsetHeight > 0
        });
    }
});

// 6. Verificar módulos de JavaScript
console.log("\n🔍 6. MÓDULOS JAVASCRIPT");
console.log("Dashboard:", typeof Dashboard);
console.log("Features:", typeof Features);
console.log("FloorPlan:", typeof FloorPlan);
console.log("MI (Icons):", typeof MI);
console.log("UIUpdates:", typeof updateDevicesList);

// 7. Verificar se há erros no console prévios
console.log("\n🔍 7. VERIFICAÇÃO DE ERROS");
console.log("Se houver erro acima, será mostrado aqui com detalhes");

// 8. Status final
console.log("\n" + "=".repeat(70));
console.log("FIM DO DIAGNÓSTICO");
console.log("=".repeat(70));

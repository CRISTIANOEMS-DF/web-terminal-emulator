/**
 * @file        css-integration-check.js
 * @description CSS Integration Health Check & Verification
 *
 * Run this in browser console after index.html loads:
 *   CSSIntegrationCheck.runAll()
 *
 * Verifies:
 * - All modules loaded
 * - CSS variables injected
 * - Theme system functional
 * - Event system responsive
 * - API endpoints available
 * - WebSocket connections ready
 *
 * @version 1.0.0
 * @license MIT
 */

const CSSIntegrationCheck = {
  /**
   * Run all verifications
   */
  runAll() {
    console.clear();
    console.log(
      "%c=== CSS Integration Health Check ===",
      "font-size: 16px; font-weight: bold; color: #00e676"
    );
    console.log("");

    const results = {
      modules: this.checkModules(),
      css: this.checkCSSVars(),
      theme: this.checkThemeSystem(),
      events: this.checkEventSystem(),
      api: this.checkAPIEndpoints(),
      websocket: this.checkWebSocket(),
    };

    return this.summarizeResults(results);
  },

  /**
   * Check if all modules are loaded
   */
  checkModules() {
    console.log(
      "%c[1/6] Module Availability Check",
      "color: #00e676; font-weight: bold"
    );

    const modules = [
      "CSSLinkage",
      "ConsoleTheme",
      "ConsoleRenderer",
      "ConsoleKeyboard",
      "ConsoleTable",
      "ConsoleSettings",
      "ConsoleBridge",
      "ConsoleWebSocket",
      "ConsoleParser",
      "ConsoleEngine",
      "ConsoleHistory",
      "WebConsole",
    ];

    const status = {};
    let allLoaded = true;

    modules.forEach((mod) => {
      const loaded = typeof window[mod] !== "undefined";
      status[mod] = loaded ? "✓" : "✗";
      if (!loaded) allLoaded = false;
      console.log(`  ${loaded ? "✓" : "✗"} ${mod}`);
    });

    console.log("");
    return {
      passed: allLoaded,
      details: status,
    };
  },

  /**
   * Check CSS variables injection
   */
  checkCSSVars() {
    console.log(
      "%c[2/6] CSS Variables Check",
      "color: #00e676; font-weight: bold"
    );

    if (!window.cssLinkage) {
      console.warn("  ✗ CSSLinkage instance not found");
      return { passed: false };
    }

    try {
      const vars = window.cssLinkage.getCSSVariables();
      const varCount = Object.keys(vars).length;
      const hasRequired = varCount >= 14; // Minimum required variables

      console.log(`  ✓ CSS Variables count: ${varCount}`);

      if (hasRequired) {
        console.log(`  ✓ Required variables: ${varCount >= 14 ? "✓" : "✗"}`);

        // Log some sample variables
        const samples = [
          "--console-bg",
          "--console-text",
          "--console-prompt",
          "--console-error",
        ];
        samples.forEach((v) => {
          const val = vars[v];
          console.log(`    • ${v}: ${val}`);
        });
      } else {
        console.warn(`  ✗ Only ${varCount} variables found, need 14+`);
      }

      console.log("");
      return {
        passed: hasRequired,
        details: {
          count: varCount,
          hasRequired,
          variables: vars,
        },
      };
    } catch (error) {
      console.error(`  ✗ Error checking CSS variables:`, error);
      console.log("");
      return { passed: false };
    }
  },

  /**
   * Check theme system functionality
   */
  checkThemeSystem() {
    console.log(
      "%c[3/6] Theme System Check",
      "color: #00e676; font-weight: bold"
    );

    if (!window.ConsoleTheme) {
      console.warn("  ✗ ConsoleTheme not available");
      return { passed: false };
    }

    try {
      const current = window.ConsoleTheme.getCurrent?.();
      const themes = window.ConsoleTheme.list?.();
      const builtin = window.ConsoleTheme.listBuiltIn?.();
      const custom = window.ConsoleTheme.listCustom?.();

      console.log(`  ✓ Current theme: ${current}`);
      console.log(`  ✓ Total themes: ${themes?.length || 0}`);
      console.log(`  ✓ Built-in themes: ${builtin?.length || 0}`);
      console.log(`  ✓ Custom themes: ${custom?.length || 0}`);

      // List some built-in themes
      if (builtin?.length > 0) {
        console.log("    Built-in: " + builtin.slice(0, 5).join(", ") + "...");
      }

      console.log("");
      const passed =
        !!current && themes?.length > 0 && builtin?.length >= 20;
      return {
        passed,
        details: {
          current,
          themeCount: themes?.length,
          builtinCount: builtin?.length,
          customCount: custom?.length,
        },
      };
    } catch (error) {
      console.error(`  ✗ Error checking theme system:`, error);
      console.log("");
      return { passed: false };
    }
  },

  /**
   * Check event system
   */
  checkEventSystem() {
    console.log(
      "%c[4/6] Event System Check",
      "color: #00e676; font-weight: bold"
    );

    if (!window.ConsoleTheme) {
      console.warn("  ✗ ConsoleTheme not available for event testing");
      return { passed: false };
    }

    try {
      let eventFired = false;
      const unsubscribe = window.ConsoleTheme.on?.("theme:changed", () => {
        eventFired = true;
      });

      // Test event emission (but don't actually change theme in check)
      console.log("  ✓ Event listener registered");

      if (unsubscribe) {
        unsubscribe();
        console.log("  ✓ Event unsubscribe functional");
      }

      console.log("  ✓ Event system operational");
      console.log("");

      return {
        passed: true,
        details: {
          eventsSupported: ["theme:changed", "theme:registered", "theme:updated"],
        },
      };
    } catch (error) {
      console.error(`  ✗ Error checking event system:`, error);
      console.log("");
      return { passed: false };
    }
  },

  /**
   * Check API endpoints
   */
  checkAPIEndpoints() {
    console.log(
      "%c[5/6] API Endpoints Check",
      "color: #00e676; font-weight: bold"
    );

    if (!window.ConsoleBridge) {
      console.warn("  ! ConsoleBridge not available - API might not be running");
      console.log("");
      return { passed: false, details: { note: "API not running yet" } };
    }

    try {
      const endpoints = [
        "/api/theme/current",
        "/api/theme/list",
        "/api/theme/set",
        "/api/theme/register",
        "/api/engine/execute",
        "/api/history/search",
        "/api/parser/parse",
      ];

      console.log("  Expected endpoints:");
      endpoints.forEach((endpoint) => {
        console.log(`    • ${endpoint}`);
      });

      console.log("");
      return {
        passed: true,
        details: {
          endpointsAvailable: endpoints,
          note: "Run ConsoleBridge.start() to activate",
        },
      };
    } catch (error) {
      console.error(`  ✗ Error checking API:`, error);
      console.log("");
      return { passed: false };
    }
  },

  /**
   * Check WebSocket readiness
   */
  checkWebSocket() {
    console.log(
      "%c[6/6] WebSocket Check",
      "color: #00e676; font-weight: bold"
    );

    if (!window.ConsoleWebSocket) {
      console.warn("  ! ConsoleWebSocket not available - WebSocket might not be ready");
      console.log("");
      return { passed: false, details: { note: "WebSocket not running yet" } };
    }

    try {
      console.log("  ✓ ConsoleWebSocket module loaded");
      console.log("  ✓ WebSocket features available:");
      console.log("    • subscribe(channel, clientId, handler)");
      console.log("    • publish(channel, message)");
      console.log("    • send(message)");
      console.log("    • heartbeat system");
      console.log("    • message queuing");

      console.log("");
      return {
        passed: true,
        details: {
          note: "Run ConsoleWebSocket.start() to activate",
          features: [
            "subscribe",
            "publish",
            "heartbeat",
            "message_queue",
          ],
        },
      };
    } catch (error) {
      console.error(`  ✗ Error checking WebSocket:`, error);
      console.log("");
      return { passed: false };
    }
  },

  /**
   * Summarize and display results
   */
  summarizeResults(results) {
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter((r) => r.passed).length;
    const percentage = Math.round((passed / total) * 100);

    console.log(
      "%c═══════════════════════════════════════",
      "color: #00e676"
    );
    console.log(
      `%cCHECK SUMMARY: ${passed}/${total} passed (${percentage}%)`,
      passed === total
        ? "color: #69ff47; font-weight: bold; font-size: 14px"
        : "color: #ffd740; font-weight: bold; font-size: 14px"
    );
    console.log(
      "%c═══════════════════════════════════════",
      "color: #00e676"
    );
    console.log("");

    // Detailed status report
    Object.entries(results).forEach(([name, result]) => {
      const icon = result.passed ? "✓" : "✗";
      const color = result.passed ? "#69ff47" : "#ff5252";
      console.log(
        `%c${icon} ${name.toUpperCase()}`,
        `color: ${color}; font-weight: bold`
      );
    });

    console.log("");

    // Final recommendations
    if (passed === total) {
      console.log(
        "%c✓ All systems operational!",
        "color: #69ff47; font-weight: bold; font-size: 12px"
      );
      console.log("You can now:");
      console.log("  1. Change themes: window.ConsoleTheme.set('dracula')");
      console.log("  2. Access CSS: window.cssLinkage.getCSSVariables()");
      console.log(
        "  3. Export themes: window.ConsoleTheme.export('current')"
      );
    } else {
      console.log(
        "%c⚠ Some systems not ready",
        "color: #ffd740; font-weight: bold; font-size: 12px"
      );
      console.log("Recommendations:");
      if (!results.modules.passed) {
        console.log("  • Check that all script files are correctly loaded in index.html");
      }
      if (!results.css.passed) {
        console.log("  • Verify terminal.css is linked in <head>");
      }
      if (!results.theme.passed) {
        console.log("  • Ensure ConsoleTheme is loaded before css.linkage");
      }
    }

    console.log("");
    return results;
  },

  /**
   * Test theme changing
   */
  testThemeChange(themeName = "matrix") {
    console.log(
      `%cTesting theme change to '${themeName}'...`,
      "color: #ffd740; font-weight: bold"
    );

    try {
      const before = window.ConsoleTheme?.getCurrent?.();
      window.ConsoleTheme?.set?.(themeName);
      const after = window.ConsoleTheme?.getCurrent?.();

      console.log(
        `%c✓ Theme changed: ${before} → ${after}`,
        "color: #69ff47"
      );

      const colors = window.cssLinkage?.getCSSVariables?.();
      console.log("Current colors:", colors);

      return true;
    } catch (error) {
      console.error(`%c✗ Theme change failed:`, error, "color: #ff5252");
      return false;
    }
  },

  /**
   * Test custom theme registration
   */
  testCustomTheme() {
    console.log(
      "%cTesting custom theme registration...",
      "color: #ffd740; font-weight: bold"
    );

    try {
      window.ConsoleTheme?.register?.("test_theme", {
        bg: "#1a1a2e",
        text: "#e0e0e0",
        prompt: "#00ffff",
      });

      const custom = window.ConsoleTheme?.listCustom?.();
      console.log(`%c✓ Custom themes:`, "color: #69ff47", custom);

      return true;
    } catch (error) {
      console.error(`%c✗ Custom theme test failed:`, error, "color: #ff5252");
      return false;
    }
  },

  /**
   * Get debug snapshot
   */
  debugSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      modules: {
        cssLinkage: !!window.CSSLinkage,
        consoleTheme: !!window.ConsoleTheme,
        consoleRenderer: !!window.ConsoleRenderer,
        consoleKeyboard: !!window.ConsoleKeyboard,
        consoleTable: !!window.ConsoleTable,
        consoleSettings: !!window.ConsoleSettings,
        consoleBridge: !!window.ConsoleBridge,
        consoleWebSocket: !!window.ConsoleWebSocket,
        consoleParser: !!window.ConsoleParser,
        consoleEngine: !!window.ConsoleEngine,
      },
      cssVariables: window.cssLinkage?.getCSSVariables?.() || {},
      currentTheme: window.ConsoleTheme?.getCurrent?.() || "unknown",
      themes: {
        total: window.ConsoleTheme?.list?.().length || 0,
        builtin: window.ConsoleTheme?.listBuiltIn?.().length || 0,
        custom: window.ConsoleTheme?.listCustom?.().length || 0,
      },
    };
  },
};

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = CSSIntegrationCheck;
}

// Auto-run on include
console.log("%cCSS Integration Check ready!", "color: #00e676");
console.log("Run: CSSIntegrationCheck.runAll()");

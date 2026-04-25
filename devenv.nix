{ pkgs, lib, config, ... }:

{
  # ── Node.js + npm ────────────────────────────────────────────────────────────
  languages.javascript = {
    enable = true;
    npm = {
      enable = true;
      install.enable = true; # runs `npm install` automatically on `devenv up`
    };
  };

  # ── Playwright browser ───────────────────────────────────────────────────────
  # pkgs.chromium is Linux-only. On macOS we use the system Google Chrome if
  # present, otherwise fall back to Playwright's own managed download.
  env = lib.optionalAttrs pkgs.stdenv.isDarwin {
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  };

  # ── Convenience scripts ──────────────────────────────────────────────────────
  scripts = {
    serve.exec = ''
      echo "Serving on http://localhost:8080"
      python3 -m http.server 8080
    '';
    test.exec = "npx playwright test";
    test-headed.exec = "npx playwright test --headed";
    test-ui.exec = "npx playwright test --ui";
    test-report.exec = "npx playwright show-report";
    demo.exec = ''
      echo "Recording demo runthrough → demos/runthrough/demo.webm"
      npx playwright test --config=playwright.demo.config.js
    '';
  };

  # ── Shell greeting ───────────────────────────────────────────────────────────
  enterShell = ''
    echo ""
    echo "🎧  W Series Sports Walkman — dev environment"
    echo "   serve         start the static site on :8080"
    echo "   test          run Playwright tests"
    echo "   test-headed   run with visible browser"
    echo "   test-ui       Playwright interactive UI"
    echo "   demo          record full runthrough → demos/runthrough/demo.webm"
    echo ""
  '';
}

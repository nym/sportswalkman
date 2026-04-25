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

  # ── Playwright browser binaries via Nix (no `npx playwright install` needed) ─
  packages = [
    pkgs.chromium
  ];

  env = {
    # Point Playwright at Nix-managed Chromium — skips the npm download step
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.chromium}";
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
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
  };

  # ── Shell greeting ───────────────────────────────────────────────────────────
  enterShell = ''
    echo ""
    echo "🎧  W Series Sports Walkman — dev environment"
    echo "   serve         start the static site on :8080"
    echo "   test          run Playwright tests"
    echo "   test-headed   run with visible browser"
    echo "   test-ui       Playwright interactive UI"
    echo ""
  '';
}

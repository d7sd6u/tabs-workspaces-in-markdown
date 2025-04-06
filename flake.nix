{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?rev=8f76cf16b17c51ae0cc8e55488069593f6dab645";
  };

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
      };
    in
    {
      devShells."${system}".default =
        pkgs.mkShell {
          packages = with pkgs; [
            nodejs_23
            nodePackages.pnpm
          ];

          shellHook = ''
            echo "node `${pkgs.nodejs}/bin/node --version`"
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true          
          '';
        };
      packages."${system}" = rec {
        default = pkgs.writeTextFile
          {
            name = "script.mts";
            text = ''
              #!/usr/bin/env -S ${pkgs.nodejs_22}/bin/node --import ${node_modules}/@swc-node/register/esm/esm-register.mjs

              import "./nativeapp/main.ts";
            '';
            executable = true;
            destination = "/script.mts";
          };
        node_modules = (pkgs.callPackage ./package.nix { });
      };
    };
}

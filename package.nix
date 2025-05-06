{ stdenv, pnpm, nodejs, cacert }:

stdenv.mkDerivation {
  pname = "tabs-md-workspaces-pnpm-deps";
  version = "0.1.0";

  src = ./.;

  nativeBuildInputs = [ nodejs pnpm cacert ];

  buildPhase = ''
    pnpm install --frozen-lockfile
  '';

  installPhase = ''
    mkdir -p $out
    cp -r ./node_modules/* ./node_modules/.* $out/
  '';

  dontFixup = true;

  outputHashAlgo = "sha256";
  outputHashMode = "recursive";
  outputHash = "sha256-vfH+3x5tHG5TNnlSi41Xe+Tn7gFN0Gn8sl3ntMKltBs=";
}

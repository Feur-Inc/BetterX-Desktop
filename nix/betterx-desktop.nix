{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation rec {
  pname = "betterx-desktop";
  version = "1.0.1-alpha";
  src = ./.;

  nativeBuildInputs = [ pkgs.nodejs ];

  buildPhase = ''
    npm install
  '';

  installPhase = ''
    mkdir -p $out
    cp -r * $out/
  '';

  meta = with pkgs.lib; {
    description = "BetterX Desktop application enhancing your browsing experience";
    homepage = "https://github.com/Feur-Inc/BetterX-Desktop";
    license = licenses.gpl3Plus;
    maintainers = [ maintainers.mopigames ];
    platforms = platforms.linux;
  };
}

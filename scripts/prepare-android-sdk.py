"""Use the hosted runner's SDK; install missing packages with its SDK manager."""
import os
from pathlib import Path
import subprocess

root_value = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
if not root_value:
    raise SystemExit("Configura ANDROID_HOME con la ruta del SDK de Android.")
root = Path(root_value)
packages = {
    "platforms;android-35": root / "platforms/android-35/android.jar",
    "build-tools;35.0.0": root / "build-tools/35.0.0/apksigner",
    "build-tools;34.0.0": root / "build-tools/34.0.0/aapt2",
}
missing = [name for name, path in packages.items() if not path.is_file()]
if not missing:
    print("SDK 35 y Build Tools 34/35 disponibles; no se necesitan descargas.")
else:
    candidates = [root / "cmdline-tools/latest/bin/sdkmanager"]
    candidates.extend(sorted(root.glob("cmdline-tools/*/bin/sdkmanager"), reverse=True))
    manager = next((path for path in candidates if path.is_file()), None)
    if manager is None:
        raise SystemExit("Faltan Android Command Line Tools. Instálalos desde Android Studio.")
    print("Instalando componentes faltantes: " + ", ".join(missing))
    command = [str(manager), f"--sdk_root={root}"]
    subprocess.run(command + ["--licenses"], input="y\n" * 100, text=True, check=True)
    subprocess.run(command + missing, check=True)
    if not all(path.is_file() for path in packages.values()):
        raise SystemExit("La instalación del SDK no generó todos los componentes requeridos.")

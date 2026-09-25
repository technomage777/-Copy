# Chatterbox Turbo — Local Mac Companion

This companion lets Story Voice Studio run Chatterbox Turbo on an Apple Silicon Mac using PyTorch MPS instead of Replicate.

## One-time setup

1. Copy this `local_chatterbox` folder to the Apple Silicon Mac.
2. Install Python 3.11 if it is not already installed.
3. Double-click **Install Chatterbox Local.command**.
4. macOS may ask permission to open it. If needed, right-click the file and choose **Open**.
5. The first model load downloads the Chatterbox model files.

## Each time you want local generation

1. Double-click **Start Chatterbox Local.command**.
2. Leave the Terminal window open.
3. Open Story Voice Studio in the browser on the same Mac.
4. Choose **Chatterbox Turbo — Local Mac**.
5. Click **Test local engine**. Your browser may ask for permission to access a local service; allow it.
6. Generate normally.

The local server listens only on `127.0.0.1:8765`, so it is not exposed to other devices on your network.

The official Chatterbox Turbo implementation supports Apple Silicon through PyTorch MPS. Local Turbo uses temperature, top_p, top_k, repetition_penalty, seed, and loudness normalization.

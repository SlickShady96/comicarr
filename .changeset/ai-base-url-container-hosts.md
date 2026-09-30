---
"comicarr": patch
---

The AI Base URL in Settings → AI now accepts plain `http://` for Docker container names such as `http://ollama:11434/v1` and for addresses in the 172.16–172.31 private range, so an AI provider running on the same Docker network connects without HTTPS. Public addresses and dotted hostnames still require `https://`.
